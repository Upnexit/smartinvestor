
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
  v_net numeric;
  v_actor_is_distributor boolean;
  v_actor_is_admin boolean;
BEGIN
  v_actor_is_admin := public.has_role(_actor,'admin');
  v_actor_is_distributor := public.distributor_can_manage_withdrawals(_actor);

  IF NOT (v_actor_is_admin OR v_actor_is_distributor) THEN
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

    v_tax := COALESCE(v_row.fee, 0);
    v_net := COALESCE(v_row.amount, 0);

    IF v_actor_is_distributor AND NOT v_actor_is_admin THEN
      -- Distributor approved: credit them the full gross (fee + net payout)
      IF v_tax > 0 THEN
        INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
        VALUES (_actor, 'withdrawal_tax', v_tax, v_row.user_id, v_row.id);
      END IF;
      IF v_net > 0 THEN
        INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
        VALUES (_actor, 'withdrawal_payout', v_net, v_row.user_id, v_row.id);
      END IF;
      IF (v_tax + v_net) > 0 THEN
        UPDATE public.distributors
          SET balance = COALESCE(balance,0) + v_tax + v_net,
              total_earned = COALESCE(total_earned,0) + v_tax + v_net,
              updated_at = now()
          WHERE user_id = _actor;
      END IF;
    ELSE
      -- Admin approved: only fee credited to user's assigned distributor (legacy behavior)
      SELECT distributor_id INTO v_dist FROM public.profiles WHERE id = v_row.user_id;
      IF v_dist IS NOT NULL AND v_tax > 0 THEN
        INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
        VALUES (v_dist, 'withdrawal_tax', v_tax, v_row.user_id, v_row.id);
        UPDATE public.distributors
          SET balance = COALESCE(balance,0) + v_tax,
              total_earned = COALESCE(total_earned,0) + v_tax,
              updated_at = now()
          WHERE user_id = v_dist;
      END IF;
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
