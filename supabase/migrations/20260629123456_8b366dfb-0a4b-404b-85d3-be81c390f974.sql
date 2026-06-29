
-- 1. Extend user_packages
ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS sender_number text,
  ADD COLUMN IF NOT EXISTS payment_txn text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS purchased_at timestamptz NOT NULL DEFAULT now();

-- 2. Defaults trigger: set expires_at from package duration; enforce pending status on insert
CREATE OR REPLACE FUNCTION public.enforce_user_package_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dur int;
  v_price numeric;
BEGIN
  SELECT duration_days, price INTO v_dur, v_price FROM public.packages WHERE id = NEW.package_id;
  IF v_dur IS NULL THEN v_dur := 30; END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + (v_dur || ' days')::interval;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(v_price, 0) <= 0 THEN
      NEW.status := 'active';
      NEW.purchased_at := COALESCE(NEW.purchased_at, now());
      NEW.activated_at := COALESCE(NEW.activated_at, now());
    ELSE
      NEW.status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_user_package_defaults ON public.user_packages;
CREATE TRIGGER trg_enforce_user_package_defaults
BEFORE INSERT ON public.user_packages
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_package_defaults();

-- 3. Referral commission on activation
CREATE OR REPLACE FUNCTION public.pay_referral_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer uuid;
  v_price numeric;
  v_commission numeric;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = NEW.user_id;
    IF v_referrer IS NOT NULL THEN
      SELECT price INTO v_price FROM public.packages WHERE id = NEW.package_id;
      v_commission := ROUND(COALESCE(v_price, 0) * 0.05, 2);
      IF v_commission > 0 THEN
        INSERT INTO public.referral_earnings (referrer_id, referred_user_id, amount, source)
        VALUES (v_referrer, NEW.user_id, v_commission, 'package_activation');

        UPDATE public.profiles
          SET balance = balance + v_commission,
              total_earned = total_earned + v_commission
          WHERE id = v_referrer;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pay_referral_on_activation ON public.user_packages;
CREATE TRIGGER trg_pay_referral_on_activation
AFTER INSERT OR UPDATE OF status ON public.user_packages
FOR EACH ROW EXECUTE FUNCTION public.pay_referral_on_activation();

-- 4. Admin review RPC
CREATE OR REPLACE FUNCTION public.admin_review_user_package(
  _actor_user_id uuid,
  _order_id uuid,
  _action text,
  _reason text DEFAULT NULL
)
RETURNS public.user_packages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.user_packages;
  v_dur int;
BEGIN
  IF NOT public.has_role(_actor_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT * INTO v_row FROM public.user_packages WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;

  IF _action = 'approve' THEN
    IF v_row.trx_id IS NULL OR length(v_row.trx_id) < 6 THEN
      RAISE EXCEPTION 'trx_id required to approve';
    END IF;
    SELECT duration_days INTO v_dur FROM public.packages WHERE id = v_row.package_id;
    UPDATE public.user_packages
      SET status = 'active',
          purchased_at = now(),
          activated_at = now(),
          reviewed_at = now(),
          expires_at = now() + (COALESCE(v_dur, 30) || ' days')::interval,
          rejection_reason = NULL
      WHERE id = _order_id
      RETURNING * INTO v_row;
  ELSIF _action = 'reject' THEN
    IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
      RAISE EXCEPTION 'rejection reason required (min 3 chars)';
    END IF;
    UPDATE public.user_packages
      SET status = 'rejected',
          rejection_reason = trim(_reason),
          reviewed_at = now()
      WHERE id = _order_id
      RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_user_package(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_review_user_package(uuid, uuid, text, text) TO authenticated, service_role;

-- 5. RLS: allow users to update their own pending/rejected orders (limited cols enforced in app layer)
DROP POLICY IF EXISTS "users update own pending order" ON public.user_packages;
CREATE POLICY "users update own pending order" ON public.user_packages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','rejected'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','rejected'));

-- 6. Public read of payment_accounts site setting
DROP POLICY IF EXISTS "public read payment_accounts" ON public.site_settings;
CREATE POLICY "public read payment_accounts" ON public.site_settings
  FOR SELECT TO anon, authenticated
  USING (key = 'payment_accounts');

GRANT SELECT ON public.site_settings TO anon;

-- 7. Seed payment_accounts setting
INSERT INTO public.site_settings (key, value) VALUES (
  'payment_accounts',
  '{
    "bkash": "01700000000",
    "nagad": "01800000000",
    "rocket": "01900000000",
    "instructions": "Send Money করুন, Cash Out নয়",
    "system_logo_url": "",
    "logos": {"bkash": "", "nagad": "", "rocket": ""},
    "guides": {"bkash": "", "nagad": "", "rocket": ""}
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
