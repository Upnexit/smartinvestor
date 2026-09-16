-- Update public.admin_delete_user_data to comprehensively delete user data from all tables
-- ensuring foreign keys and relations are handled without constraint violations.

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(_actor uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _actor = _user_id THEN RAISE EXCEPTION 'cannot delete own account'; END IF;

  -- 1) Clear references in profiles pointing to this user
  UPDATE public.profiles SET referred_by = NULL WHERE referred_by = _user_id;
  UPDATE public.profiles SET distributor_id = NULL WHERE distributor_id = _user_id;

  -- 2) Core user activity and earnings
  DELETE FROM public.task_submissions WHERE user_id = _user_id;
  DELETE FROM public.withdrawals WHERE user_id = _user_id;
  DELETE FROM public.user_packages WHERE user_id = _user_id;
  DELETE FROM public.referral_earnings WHERE referrer_id = _user_id OR referred_user_id = _user_id;

  -- 3) Community and communications
  DELETE FROM public.community_messages WHERE user_id = _user_id;
  DELETE FROM public.community_bans WHERE user_id = _user_id;
  DELETE FROM public.support_messages WHERE user_id = _user_id;

  -- 4) Preferences, push and security
  DELETE FROM public.user_payment_methods WHERE user_id = _user_id;
  DELETE FROM public.notice_dismissals WHERE user_id = _user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
  DELETE FROM public.email_otps WHERE user_id = _user_id;
  DELETE FROM public.activity_logs WHERE user_id = _user_id;

  -- 5) Distributor tables (if user was a distributor or had distributor relations)
  DELETE FROM public.distributor_earnings WHERE distributor_id = _user_id OR related_user_id = _user_id;
  DELETE FROM public.distributor_withdrawals WHERE distributor_id = _user_id;
  DELETE FROM public.distributor_package_orders WHERE distributor_id = _user_id;
  DELETE FROM public.distributor_tasks WHERE distributor_id = _user_id;
  DELETE FROM public.distributor_leads WHERE distributor_id = _user_id;
  DELETE FROM public.distributor_applications WHERE user_id = _user_id;
  DELETE FROM public.distributors WHERE user_id = _user_id;

  -- 6) Shop orders
  DELETE FROM public.shop_orders WHERE user_id = _user_id;

  -- 7) Roles and profile
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_data(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_data(uuid,uuid) TO authenticated, service_role;
