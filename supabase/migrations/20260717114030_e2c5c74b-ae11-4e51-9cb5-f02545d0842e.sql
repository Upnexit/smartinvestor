
-- Admin review for distributor withdrawal requests (approve/reject with atomic balance debit)
CREATE OR REPLACE FUNCTION public.admin_review_distributor_withdrawal(
  _actor uuid,
  _id uuid,
  _action text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.distributor_withdrawals;
  v_bal numeric;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.distributor_withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  IF _action = 'approve' THEN
    SELECT balance INTO v_bal FROM public.distributors WHERE user_id = v_row.distributor_id FOR UPDATE;
    IF COALESCE(v_bal,0) < v_row.amount THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;
    UPDATE public.distributors
      SET balance = balance - v_row.amount
      WHERE user_id = v_row.distributor_id;
    UPDATE public.distributor_withdrawals
      SET status = 'approved',
          reviewed_by = _actor,
          reviewed_at = now(),
          rejection_reason = NULL
      WHERE id = _id;
  ELSIF _action = 'reject' THEN
    UPDATE public.distributor_withdrawals
      SET status = 'rejected',
          reviewed_by = _actor,
          reviewed_at = now(),
          rejection_reason = COALESCE(NULLIF(trim(_reason), ''), 'Rejected by admin')
      WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_review_distributor_withdrawal(uuid, uuid, text, text) TO authenticated;
