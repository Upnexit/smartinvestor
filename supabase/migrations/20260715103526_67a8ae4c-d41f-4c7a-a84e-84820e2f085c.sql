CREATE OR REPLACE FUNCTION public.withdrawals_snapshot_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(balance, 0) INTO NEW.balance_at_request
    FROM public.profiles
    WHERE id = NEW.user_id;

  NEW.balance_at_request := COALESCE(NEW.balance_at_request, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawals_snapshot_balance ON public.withdrawals;
CREATE TRIGGER withdrawals_snapshot_balance
  BEFORE INSERT ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.withdrawals_snapshot_balance();