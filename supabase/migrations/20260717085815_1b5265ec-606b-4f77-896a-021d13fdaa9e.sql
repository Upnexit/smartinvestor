
-- 1) Add flag column
ALTER TABLE public.distributors ADD COLUMN IF NOT EXISTS can_manage_withdrawals boolean NOT NULL DEFAULT false;

-- 2) Helper: is this uid a distributor with withdrawal-manage flag?
CREATE OR REPLACE FUNCTION public.distributor_can_manage_withdrawals(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.distributors
    WHERE user_id = _uid
      AND COALESCE(can_manage_withdrawals, false) = true
      AND COALESCE(status, 'active') = 'active'
  );
$$;
GRANT EXECUTE ON FUNCTION public.distributor_can_manage_withdrawals(uuid) TO authenticated, service_role;

-- 3) Allow enabled distributors to review withdrawals via admin_review_withdrawal
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_actor uuid, _id uuid, _action text, _note text DEFAULT NULL::text)
 RETURNS withdrawals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.withdrawals;
  v_bal numeric;
  v_debit numeric;
  v_dist uuid;
  v_tax numeric;
BEGIN
  IF NOT (public.has_role(_actor,'admin')
          OR public.distributor_can_manage_withdrawals(_actor)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal not found'; END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'withdrawal already reviewed (status: %)', v_row.status;
  END IF;

  IF _action = 'approve' THEN
    SELECT COALESCE(balance, 0) INTO v_bal FROM public.profiles WHERE id = v_row.user_id FOR UPDATE;
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

    SELECT distributor_id INTO v_dist FROM public.profiles WHERE id = v_row.user_id;
    v_tax := COALESCE(v_row.fee, 0);
    IF v_dist IS NOT NULL AND v_tax > 0 THEN
      INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
      VALUES (v_dist, 'withdrawal_tax', v_tax, v_row.user_id, v_row.id);
      UPDATE public.distributors
        SET balance = COALESCE(balance,0) + v_tax,
            total_earned = COALESCE(total_earned,0) + v_tax,
            updated_at = now()
        WHERE user_id = v_dist;
    END IF;

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

-- 4) Withdraw history: allow admins OR enabled distributors
CREATE OR REPLACE FUNCTION public.admin_user_withdraw_history(_actor uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_profile jsonb; v_history jsonb; v_stats jsonb;
BEGIN
  IF NOT (public.has_role(_actor,'admin')
          OR public.distributor_can_manage_withdrawals(_actor)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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

-- 5) RLS: allow enabled distributors to SELECT withdrawals + related profile fields
DROP POLICY IF EXISTS "dist_manage_view_withdrawals" ON public.withdrawals;
CREATE POLICY "dist_manage_view_withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (public.distributor_can_manage_withdrawals(auth.uid()));

DROP POLICY IF EXISTS "dist_manage_view_profiles" ON public.profiles;
CREATE POLICY "dist_manage_view_profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.distributor_can_manage_withdrawals(auth.uid()));
