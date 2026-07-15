
-- Add balance snapshot column to withdrawals
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS balance_at_request numeric;

-- Trigger: snapshot user's balance at insert time
CREATE OR REPLACE FUNCTION public.withdrawals_snapshot_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.balance_at_request IS NULL THEN
    SELECT COALESCE(balance, 0) INTO NEW.balance_at_request
      FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawals_snapshot_balance ON public.withdrawals;
CREATE TRIGGER withdrawals_snapshot_balance
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.withdrawals_snapshot_balance();

-- Harden admin_review_withdrawal: guard against double-credit / double-debit
-- and ensure approve/reject only from pending state.
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
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'withdrawal not found';
  END IF;

  -- Idempotency guard: only pending rows can transition. Prevents double-credit
  -- of both user balance (on repeat reject) and distributor tax (on repeat approve).
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
