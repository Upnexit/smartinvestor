CREATE TABLE public.distributor_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  monthly_salary numeric NOT NULL DEFAULT 0,
  duration_label text NOT NULL DEFAULT 'কাজ যতদিন চলবে',
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.distributor_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_packages TO service_role;

ALTER TABLE public.distributor_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active distributor packages"
ON public.distributor_packages FOR SELECT TO authenticated
USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage distributor packages"
ON public.distributor_packages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_distributor_packages_updated_at
BEFORE UPDATE ON public.distributor_packages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.distributor_package_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL,
  package_id uuid NOT NULL REFERENCES public.distributor_packages(id),
  status text NOT NULL DEFAULT 'pending',
  payment_method public.payment_method NOT NULL,
  sender_number text NOT NULL,
  trx_id text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  snapshot_package_name text NOT NULL,
  snapshot_price numeric NOT NULL,
  snapshot_monthly_salary numeric NOT NULL,
  snapshot_duration_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.distributor_package_orders TO authenticated;
GRANT ALL ON public.distributor_package_orders TO service_role;

ALTER TABLE public.distributor_package_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can view own package orders"
ON public.distributor_package_orders FOR SELECT TO authenticated
USING (distributor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Distributors can create own package orders"
ON public.distributor_package_orders FOR INSERT TO authenticated
WITH CHECK (
  distributor_id = auth.uid()
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.distributors d
    WHERE d.user_id = auth.uid() AND d.status = 'active'
  )
  AND EXISTS (
    SELECT 1 FROM public.distributor_packages p
    WHERE p.id = package_id AND p.active = true
  )
);

CREATE POLICY "Distributors can update own pending package orders"
ON public.distributor_package_orders FOR UPDATE TO authenticated
USING (distributor_id = auth.uid() AND status IN ('pending', 'rejected'))
WITH CHECK (distributor_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can review distributor package orders"
ON public.distributor_package_orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX distributor_package_orders_distributor_idx
ON public.distributor_package_orders(distributor_id, created_at DESC);

CREATE INDEX distributor_package_orders_status_idx
ON public.distributor_package_orders(status, submitted_at DESC);

CREATE UNIQUE INDEX distributor_package_one_live_order_idx
ON public.distributor_package_orders(distributor_id, package_id)
WHERE status IN ('pending', 'active');

CREATE TRIGGER set_distributor_package_orders_updated_at
BEFORE UPDATE ON public.distributor_package_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.fill_distributor_package_order_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.distributor_packages%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.distributor_packages WHERE id = NEW.package_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Distributor package is not available'; END IF;
  NEW.snapshot_package_name := p.name;
  NEW.snapshot_price := p.price;
  NEW.snapshot_monthly_salary := p.monthly_salary;
  NEW.snapshot_duration_label := p.duration_label;
  RETURN NEW;
END;
$$;

CREATE TRIGGER fill_distributor_package_order_snapshot_trigger
BEFORE INSERT ON public.distributor_package_orders
FOR EACH ROW EXECUTE FUNCTION public.fill_distributor_package_order_snapshot();

CREATE OR REPLACE FUNCTION public.admin_review_distributor_package_order(
  _actor uuid,
  _order_id uuid,
  _action text,
  _reason text DEFAULT NULL
)
RETURNS public.distributor_package_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.distributor_package_orders;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'invalid action'; END IF;

  UPDATE public.distributor_package_orders
  SET status = CASE WHEN _action = 'approve' THEN 'active' ELSE 'rejected' END,
      rejection_reason = CASE WHEN _action = 'reject' THEN NULLIF(trim(_reason), '') ELSE NULL END,
      reviewed_by = _actor,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _order_id AND status = 'pending'
  RETURNING * INTO result;

  IF result.id IS NULL THEN RAISE EXCEPTION 'pending order not found'; END IF;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_distributor_package_order(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_distributor_package_order(uuid, uuid, text, text) TO service_role;

INSERT INTO public.distributor_packages (
  name, price, monthly_salary, duration_label, description, active, sort_order
) VALUES (
  'Elite Partner', 15000, 12000, 'কাজ যতদিন চলবে',
  'ডিস্ট্রিবিউটরদের জন্য Elite Partner প্যাকেজ। অনুমোদনের পর মাসিক বেতন ৳১২,০০০ এবং কাজ চলমান থাকা পর্যন্ত মেয়াদ প্রযোজ্য।',
  true, 1
);