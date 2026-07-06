CREATE OR REPLACE FUNCTION public.admin_update_user_profile(_actor uuid, _user_id uuid, _patch jsonb)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(_patch->>'full_name', full_name),
    phone = COALESCE(_patch->>'phone', phone),
    email = COALESCE(_patch->>'email', email),
    avatar_url = COALESCE(_patch->>'avatar_url', avatar_url),
    status = COALESCE((_patch->>'status')::public.user_status, status),
    balance = CASE
      WHEN _patch ? 'balance' AND NULLIF(trim(_patch->>'balance'), '') IS NOT NULL
        THEN GREATEST((_patch->>'balance')::numeric, 0)
      ELSE balance
    END,
    locked_balance = CASE
      WHEN _patch ? 'locked_balance' AND NULLIF(trim(_patch->>'locked_balance'), '') IS NOT NULL
        THEN GREATEST((_patch->>'locked_balance')::numeric, 0)
      ELSE locked_balance
    END
  WHERE id = _user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_actor uuid, _id uuid, _action text, _note text DEFAULT NULL::text)
RETURNS public.withdrawals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.withdrawals;
  v_bal numeric;
  v_debit numeric;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'withdrawal not found';
  END IF;

  IF _action = 'approve' THEN
    SELECT COALESCE(balance, 0) INTO v_bal
      FROM public.profiles
      WHERE id = v_row.user_id
      FOR UPDATE;

    v_debit := COALESCE(v_row.gross_amount, v_row.amount, 0);

    IF v_bal < v_debit THEN
      RAISE EXCEPTION 'insufficient balance (available: %, requested: %)', v_bal, v_debit;
    END IF;

    UPDATE public.profiles
      SET balance = GREATEST(COALESCE(balance, 0) - v_debit, 0)
      WHERE id = v_row.user_id;

    UPDATE public.withdrawals
      SET status = 'approved', note = _note, reviewed_by = _actor, reviewed_at = now()
      WHERE id = _id
      RETURNING * INTO v_row;
  ELSIF _action = 'reject' THEN
    UPDATE public.withdrawals
      SET status = 'rejected', note = _note, rejection_reason = _note, reviewed_by = _actor, reviewed_at = now()
      WHERE id = _id
      RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code text;
  v_referrer uuid;
  v_pm public.payment_method;
  v_initial_balance numeric := 0;
  v_locked_balance numeric := 300;
BEGIN
  v_ref_code := COALESCE(NEW.raw_user_meta_data->>'ref', NEW.raw_user_meta_data->>'referral_code');
  IF v_ref_code IS NOT NULL AND length(v_ref_code) > 0 THEN
    SELECT id INTO v_referrer FROM public.profiles
      WHERE referral_code = upper(v_ref_code) LIMIT 1;
  END IF;

  BEGIN
    v_pm := COALESCE((NEW.raw_user_meta_data->>'payment_method')::public.payment_method, 'bkash');
  EXCEPTION WHEN others THEN
    v_pm := 'bkash';
  END;

  BEGIN
    IF NEW.raw_user_meta_data ? 'initial_balance' THEN
      v_initial_balance := GREATEST(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'initial_balance'), '')::numeric, 0), 0);
    END IF;
  EXCEPTION WHEN others THEN
    v_initial_balance := 0;
  END;

  BEGIN
    IF NEW.raw_user_meta_data ? 'locked_balance' THEN
      v_locked_balance := GREATEST(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'locked_balance'), '')::numeric, 300), 0);
    ELSIF NEW.raw_user_meta_data ? 'initial_locked_balance' THEN
      v_locked_balance := GREATEST(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'initial_locked_balance'), '')::numeric, 300), 0);
    END IF;
  EXCEPTION WHEN others THEN
    v_locked_balance := 300;
  END;

  INSERT INTO public.profiles (
    id, full_name, phone, email,
    payment_method, payment_number,
    user_code, referral_code, referred_by,
    balance, locked_balance
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    NEW.email,
    v_pm,
    COALESCE(NEW.raw_user_meta_data->>'payment_number',''),
    'SN-' || lpad(nextval('public.user_code_seq')::text, 6, '0'),
    upper(substr(md5(random()::text), 1, 8)),
    v_referrer,
    v_initial_balance,
    v_locked_balance
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;