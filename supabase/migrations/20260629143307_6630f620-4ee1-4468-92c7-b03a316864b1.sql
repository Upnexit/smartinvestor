CREATE OR REPLACE FUNCTION public.profile_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.locked_balance IS DISTINCT FROM OLD.locked_balance
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
    RAISE EXCEPTION 'forbidden field modification';
  END IF;

  RETURN NEW;
END;
$function$;