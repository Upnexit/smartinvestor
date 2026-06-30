-- 1) Add 'distributor' to app_role enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='distributor' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'distributor';
  END IF;
END $$;

-- 2) Add distributor_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS distributor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_distributor_id_idx ON public.profiles(distributor_id);

-- 3) Create distributors table
CREATE TABLE IF NOT EXISTS public.distributors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  payment_method public.payment_method DEFAULT 'bkash',
  payment_number text,
  district text,
  thana text,
  address text,
  commission_rate numeric NOT NULL DEFAULT 5,
  total_users int NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributors TO authenticated;
GRANT ALL ON public.distributors TO service_role;

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "distributors_select_own_or_admin" ON public.distributors;
CREATE POLICY "distributors_select_own_or_admin" ON public.distributors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "distributors_update_own_or_admin" ON public.distributors;
CREATE POLICY "distributors_update_own_or_admin" ON public.distributors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "distributors_admin_all" ON public.distributors;
CREATE POLICY "distributors_admin_all" ON public.distributors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS distributors_updated_at ON public.distributors;
CREATE TRIGGER distributors_updated_at BEFORE UPDATE ON public.distributors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) RPC: admin upsert distributor (called after auth user created)
CREATE OR REPLACE FUNCTION public.admin_upsert_distributor(
  _actor uuid,
  _user_id uuid,
  _patch jsonb
) RETURNS public.distributors
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_row public.distributors;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  INSERT INTO public.distributors (
    user_id, full_name, email, phone, payment_method, payment_number,
    district, thana, address, commission_rate, status, notes, created_by
  ) VALUES (
    _user_id,
    COALESCE(_patch->>'full_name',''),
    COALESCE(_patch->>'email',''),
    _patch->>'phone',
    COALESCE((_patch->>'payment_method')::public.payment_method,'bkash'),
    _patch->>'payment_number',
    _patch->>'district',
    _patch->>'thana',
    _patch->>'address',
    COALESCE((_patch->>'commission_rate')::numeric, 5),
    COALESCE(_patch->>'status','active'),
    _patch->>'notes',
    _actor
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.distributors.full_name),
    email = COALESCE(EXCLUDED.email, public.distributors.email),
    phone = COALESCE(EXCLUDED.phone, public.distributors.phone),
    payment_method = COALESCE(EXCLUDED.payment_method, public.distributors.payment_method),
    payment_number = COALESCE(EXCLUDED.payment_number, public.distributors.payment_number),
    district = COALESCE(EXCLUDED.district, public.distributors.district),
    thana = COALESCE(EXCLUDED.thana, public.distributors.thana),
    address = COALESCE(EXCLUDED.address, public.distributors.address),
    commission_rate = COALESCE(EXCLUDED.commission_rate, public.distributors.commission_rate),
    status = COALESCE(EXCLUDED.status, public.distributors.status),
    notes = COALESCE(EXCLUDED.notes, public.distributors.notes)
  RETURNING * INTO v_row;

  -- assign distributor role
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'distributor')
    ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_row;
END;
$$;

-- 5) RPC: admin delete distributor
CREATE OR REPLACE FUNCTION public.admin_delete_distributor(_actor uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET distributor_id = NULL WHERE distributor_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'distributor';
  DELETE FROM public.distributors WHERE user_id = _user_id;
END; $$;

-- 6) RPC: distributor stats
CREATE OR REPLACE FUNCTION public.distributor_stats(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_total_users int := 0;
  v_active_packages int := 0;
  v_total_deposit numeric := 0;
  v_my_balance numeric := 0;
  v_my_earned numeric := 0;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles WHERE distributor_id = _user_id;
  SELECT count(*) INTO v_active_packages FROM public.user_packages up
    JOIN public.profiles p ON p.id = up.user_id
    WHERE p.distributor_id = _user_id AND up.status='active';
  SELECT COALESCE(SUM(pk.price),0) INTO v_total_deposit FROM public.user_packages up
    JOIN public.packages pk ON pk.id = up.package_id
    JOIN public.profiles p ON p.id = up.user_id
    WHERE p.distributor_id = _user_id AND up.status='active';
  SELECT balance, total_earned INTO v_my_balance, v_my_earned FROM public.distributors WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'active_packages', v_active_packages,
    'total_deposit', v_total_deposit,
    'balance', COALESCE(v_my_balance,0),
    'total_earned', COALESCE(v_my_earned,0)
  );
END; $$;