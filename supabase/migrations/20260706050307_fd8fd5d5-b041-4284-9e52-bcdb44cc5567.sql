
-- 1. Fix admin_review_user_package: locked_balance আর বাড়াবে না
CREATE OR REPLACE FUNCTION public.admin_review_user_package(_actor_user_id uuid, _order_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS user_packages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- 2. Existing users এর locked_balance normalize: max 300 (signup bonus)
UPDATE public.profiles SET locked_balance = LEAST(COALESCE(locked_balance,0), 300);

-- 3. withdrawals table: fee এবং gross_amount কলাম যোগ
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS gross_amount numeric(12,2);

-- 4. Withdrawal request insert এর সময় locked balance protect + admin approve সময় deduction guard
-- Update admin_review_withdrawal: locked_balance এর নিচে balance যাবে না
CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_actor uuid, _id uuid, _action text, _note text DEFAULT NULL::text)
 RETURNS withdrawals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_row public.withdrawals; v_bal numeric; v_locked numeric; v_available numeric;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal not found'; END IF;

  IF _action = 'approve' THEN
    SELECT balance, COALESCE(locked_balance,0) INTO v_bal, v_locked
      FROM public.profiles WHERE id = v_row.user_id FOR UPDATE;
    v_available := COALESCE(v_bal,0) - v_locked;
    IF v_available < v_row.amount THEN
      RAISE EXCEPTION 'insufficient available balance (available: %, requested: %)', v_available, v_row.amount;
    END IF;
    UPDATE public.profiles SET balance = balance - v_row.amount WHERE id = v_row.user_id;
    UPDATE public.withdrawals SET status='approved', note=_note, reviewed_by=_actor, reviewed_at=now()
      WHERE id=_id RETURNING * INTO v_row;
  ELSIF _action = 'reject' THEN
    UPDATE public.withdrawals SET status='rejected', note=_note, rejection_reason=_note, reviewed_by=_actor, reviewed_at=now()
      WHERE id=_id RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;
  RETURN v_row;
END;$function$;
