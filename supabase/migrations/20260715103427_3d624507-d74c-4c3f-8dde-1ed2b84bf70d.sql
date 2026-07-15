CREATE OR REPLACE FUNCTION public.admin_user_withdraw_history(_actor uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_profile jsonb; v_history jsonb; v_stats jsonb;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT to_jsonb(x) INTO v_profile FROM (
    SELECT id, full_name, phone, email, user_code, balance, locked_balance, total_earned, created_at, status
    FROM public.profiles WHERE id = _user_id
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(w) ORDER BY w.created_at DESC), '[]'::jsonb) INTO v_history FROM (
    SELECT id, amount, gross_amount, fee, balance_at_request, method, account_number, status, note, rejection_reason, created_at, reviewed_at
    FROM public.withdrawals WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 50
  ) w;

  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'approved_count', COUNT(*) FILTER (WHERE status IN ('approved','paid')),
    'approved_total', COALESCE(SUM(COALESCE(gross_amount, amount)) FILTER (WHERE status IN ('approved','paid')), 0),
    'rejected_count', COUNT(*) FILTER (WHERE status = 'rejected'),
    'pending_count',  COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO v_stats FROM public.withdrawals WHERE user_id = _user_id;

  RETURN jsonb_build_object('profile', v_profile, 'history', v_history, 'stats', v_stats);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_withdraw_history(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_withdraw_history(uuid, uuid) TO authenticated, service_role;