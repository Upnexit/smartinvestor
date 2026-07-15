
ALTER TABLE public.distributors
  ADD COLUMN IF NOT EXISTS locked_balance numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.distributor_stats(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_total_users int := 0;
  v_active_packages int := 0;
  v_total_deposit numeric := 0;
  v_my_balance numeric := 0;
  v_my_locked numeric := 0;
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
  SELECT balance, locked_balance, total_earned
    INTO v_my_balance, v_my_locked, v_my_earned
    FROM public.distributors WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'active_packages', v_active_packages,
    'total_deposit', v_total_deposit,
    'balance', COALESCE(v_my_balance,0),
    'locked_balance', COALESCE(v_my_locked,0),
    'total_earned', COALESCE(v_my_earned,0)
  );
END; $$;

-- Allow admin_upsert_distributor to set/update locked_balance from the admin panel.
CREATE OR REPLACE FUNCTION public.admin_upsert_distributor(_actor uuid, _user_id uuid, _patch jsonb)
 RETURNS distributors
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.distributors;
  v_pm public.payment_method;
  v_status text;
  v_has_balance boolean;
  v_has_locked boolean;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  BEGIN
    v_pm := COALESCE((_patch->>'payment_method')::public.payment_method,'bkash');
  EXCEPTION WHEN others THEN
    v_pm := 'bkash';
  END;

  v_status := COALESCE(NULLIF(_patch->>'status', ''), 'active');
  v_has_balance := (_patch ? 'balance') AND (_patch->>'balance') IS NOT NULL AND (_patch->>'balance') <> '';
  v_has_locked  := (_patch ? 'locked_balance') AND (_patch->>'locked_balance') IS NOT NULL AND (_patch->>'locked_balance') <> '';

  INSERT INTO public.profiles (
    id, full_name, phone, email, payment_method, payment_number,
    user_code, referral_code, balance, locked_balance, total_earned
  ) VALUES (
    _user_id,
    COALESCE(_patch->>'full_name',''),
    NULLIF(_patch->>'phone',''),
    COALESCE(_patch->>'email',''),
    v_pm,
    COALESCE(NULLIF(_patch->>'payment_number',''),''),
    'SN-' || lpad(nextval('public.user_code_seq')::text, 6, '0'),
    upper(substr(md5(random()::text), 1, 8)),
    0, 0, 0
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    email = COALESCE(NULLIF(EXCLUDED.email,''), public.profiles.email),
    payment_method = COALESCE(EXCLUDED.payment_method, public.profiles.payment_method),
    payment_number = COALESCE(NULLIF(EXCLUDED.payment_number,''), public.profiles.payment_number),
    updated_at = now();

  INSERT INTO public.distributors (
    user_id, full_name, email, phone, payment_method, payment_number,
    district, thana, address, commission_rate, status, notes, created_by,
    balance, locked_balance
  ) VALUES (
    _user_id,
    COALESCE(_patch->>'full_name',''),
    COALESCE(_patch->>'email',''),
    NULLIF(_patch->>'phone',''),
    v_pm,
    NULLIF(_patch->>'payment_number',''),
    NULLIF(_patch->>'district',''),
    NULLIF(_patch->>'thana',''),
    NULLIF(_patch->>'address',''),
    COALESCE((_patch->>'commission_rate')::numeric, 5),
    v_status,
    NULLIF(_patch->>'notes',''),
    _actor,
    CASE WHEN v_has_balance THEN (_patch->>'balance')::numeric ELSE 0 END,
    CASE WHEN v_has_locked  THEN (_patch->>'locked_balance')::numeric ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.distributors.full_name),
    email = COALESCE(NULLIF(EXCLUDED.email,''), public.distributors.email),
    phone = COALESCE(EXCLUDED.phone, public.distributors.phone),
    payment_method = COALESCE(EXCLUDED.payment_method, public.distributors.payment_method),
    payment_number = COALESCE(EXCLUDED.payment_number, public.distributors.payment_number),
    district = COALESCE(EXCLUDED.district, public.distributors.district),
    thana = COALESCE(EXCLUDED.thana, public.distributors.thana),
    address = COALESCE(EXCLUDED.address, public.distributors.address),
    commission_rate = COALESCE(EXCLUDED.commission_rate, public.distributors.commission_rate),
    status = COALESCE(EXCLUDED.status, public.distributors.status),
    notes = COALESCE(EXCLUDED.notes, public.distributors.notes),
    balance = CASE WHEN v_has_balance THEN (_patch->>'balance')::numeric ELSE public.distributors.balance END,
    locked_balance = CASE WHEN v_has_locked THEN (_patch->>'locked_balance')::numeric ELSE public.distributors.locked_balance END,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'distributor')
    ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_row;
END;
$function$;
