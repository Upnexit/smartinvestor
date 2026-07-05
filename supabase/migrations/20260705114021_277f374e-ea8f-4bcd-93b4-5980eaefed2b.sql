CREATE OR REPLACE FUNCTION public.admin_review_user_package(_actor_user_id uuid, _order_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS user_packages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.user_packages;
  v_dur int;
  v_price numeric;
  v_was_active boolean;
BEGIN
  IF NOT public.has_role(_actor_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT * INTO v_row FROM public.user_packages WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;

  v_was_active := (v_row.status = 'active');

  IF _action = 'approve' THEN
    IF v_row.trx_id IS NULL OR length(v_row.trx_id) < 6 THEN
      RAISE EXCEPTION 'trx_id required to approve';
    END IF;
    SELECT duration_days, price INTO v_dur, v_price FROM public.packages WHERE id = v_row.package_id;
    UPDATE public.user_packages
      SET status = 'active',
          purchased_at = now(),
          activated_at = now(),
          reviewed_at = now(),
          expires_at = now() + (COALESCE(v_dur, 30) || ' days')::interval,
          rejection_reason = NULL
      WHERE id = _order_id
      RETURNING * INTO v_row;

    IF NOT v_was_active AND COALESCE(v_price, 0) > 0 THEN
      UPDATE public.profiles
        SET locked_balance = COALESCE(locked_balance, 0) + v_price
        WHERE id = v_row.user_id;
    END IF;
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