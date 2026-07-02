
CREATE OR REPLACE FUNCTION public.admin_delete_distributor(_actor uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT email INTO v_email FROM public.distributors WHERE user_id = _user_id;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = _user_id;
  END IF;

  -- Detach referred users
  UPDATE public.profiles SET distributor_id = NULL WHERE distributor_id = _user_id;

  -- Purge distributor-owned data
  DELETE FROM public.distributor_withdrawals WHERE distributor_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.distributors WHERE user_id = _user_id;

  -- Purge related applications by email (approved/pending/rejected)
  IF v_email IS NOT NULL AND length(v_email) > 0 THEN
    DELETE FROM public.distributor_applications WHERE lower(email) = lower(v_email);
  END IF;

  -- Purge related public-schema personal data & profile
  DELETE FROM public.task_submissions WHERE user_id = _user_id;
  DELETE FROM public.withdrawals WHERE user_id = _user_id;
  DELETE FROM public.user_packages WHERE user_id = _user_id;
  DELETE FROM public.referral_earnings WHERE referrer_id = _user_id OR referred_user_id = _user_id;
  DELETE FROM public.community_messages WHERE user_id = _user_id;
  DELETE FROM public.user_payment_methods WHERE user_id = _user_id;
  DELETE FROM public.support_messages WHERE user_id = _user_id;
  DELETE FROM public.email_otps WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_distributor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_distributor(uuid, uuid) TO authenticated, service_role;
