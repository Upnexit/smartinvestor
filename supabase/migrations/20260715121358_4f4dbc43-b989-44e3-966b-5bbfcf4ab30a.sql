
-- 1. Trigger function: credit distributor commission on package activation
CREATE OR REPLACE FUNCTION public.pay_distributor_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distributor uuid;
  v_rate numeric;
  v_price numeric;
  v_commission numeric;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT distributor_id INTO v_distributor FROM public.profiles WHERE id = NEW.user_id;
    IF v_distributor IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(commission_rate, 7) INTO v_rate FROM public.distributors WHERE user_id = v_distributor;
    IF v_rate IS NULL THEN RETURN NEW; END IF;

    SELECT price INTO v_price FROM public.packages WHERE id = NEW.package_id;
    v_commission := ROUND(COALESCE(v_price, 0) * COALESCE(v_rate, 0) / 100.0, 2);
    IF v_commission <= 0 THEN RETURN NEW; END IF;

    -- Idempotency guard: don't double-credit if we already have an entry for this user_package
    IF EXISTS (
      SELECT 1 FROM public.distributor_earnings
      WHERE distributor_id = v_distributor
        AND source = 'package_commission'
        AND (meta->>'user_package_id') = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.distributor_earnings (distributor_id, source, amount, related_user_id, meta)
    VALUES (v_distributor, 'package_commission', v_commission, NEW.user_id,
      jsonb_build_object('user_package_id', NEW.id, 'package_id', NEW.package_id, 'package_price', v_price, 'commission_rate', v_rate));

    UPDATE public.distributors
      SET balance = COALESCE(balance,0) + v_commission,
          total_earned = COALESCE(total_earned,0) + v_commission,
          updated_at = now()
      WHERE user_id = v_distributor;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pay_distributor_on_activation ON public.user_packages;
CREATE TRIGGER trg_pay_distributor_on_activation
AFTER INSERT OR UPDATE OF status ON public.user_packages
FOR EACH ROW
EXECUTE FUNCTION public.pay_distributor_on_activation();

-- 2. Backfill: credit commission for all existing active packages,
--    EXCEPT Md Sohan's commission from Tanvir Mahmud's VIP Coin Package purchase.
DO $$
DECLARE
  r record;
  v_commission numeric;
  v_excluded_user_pkg_id uuid;
BEGIN
  -- Identify the specific user_package to exclude:
  -- Sohan (distributor) -> Tanvir Mahmud (user) -> VIP Coin Package
  SELECT up.id INTO v_excluded_user_pkg_id
  FROM public.user_packages up
  JOIN public.profiles p ON p.id = up.user_id
  JOIN public.packages pk ON pk.id = up.package_id
  WHERE p.distributor_id = '8e7e91a6-297b-4bd3-969b-97165a8143ad'
    AND p.email = 'tanvirsapahar1320@gmail.com'
    AND pk.name = 'VIP Coin Package'
    AND up.status = 'active'
  LIMIT 1;

  FOR r IN
    SELECT up.id AS user_package_id, up.user_id, up.package_id, up.activated_at,
           p.distributor_id, d.commission_rate, pk.price
    FROM public.user_packages up
    JOIN public.profiles p ON p.id = up.user_id
    JOIN public.distributors d ON d.user_id = p.distributor_id
    JOIN public.packages pk ON pk.id = up.package_id
    WHERE up.status = 'active'
      AND p.distributor_id IS NOT NULL
      AND (v_excluded_user_pkg_id IS NULL OR up.id <> v_excluded_user_pkg_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.distributor_earnings de
        WHERE de.distributor_id = p.distributor_id
          AND de.source = 'package_commission'
          AND (de.meta->>'user_package_id') = up.id::text
      )
  LOOP
    v_commission := ROUND(COALESCE(r.price,0) * COALESCE(r.commission_rate,0) / 100.0, 2);
    IF v_commission > 0 THEN
      INSERT INTO public.distributor_earnings (distributor_id, source, amount, related_user_id, meta, created_at)
      VALUES (r.distributor_id, 'package_commission', v_commission, r.user_id,
              jsonb_build_object('user_package_id', r.user_package_id, 'package_id', r.package_id, 'package_price', r.price, 'commission_rate', r.commission_rate, 'backfilled', true),
              COALESCE(r.activated_at, now()));

      UPDATE public.distributors
        SET balance = COALESCE(balance,0) + v_commission,
            total_earned = COALESCE(total_earned,0) + v_commission,
            updated_at = now()
        WHERE user_id = r.distributor_id;
    END IF;
  END LOOP;
END $$;
