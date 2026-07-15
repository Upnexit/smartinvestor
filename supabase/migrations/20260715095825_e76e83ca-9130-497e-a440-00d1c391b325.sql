
CREATE OR REPLACE FUNCTION public.enforce_daily_task_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
  v_day_end   timestamptz := v_day_start + interval '1 day';
  v_limit     int;
  v_done      int;
  v_dup       int;
BEGIN
  -- Only guard fresh submissions that will count (approved or pending).
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  -- Prevent duplicate submission of the same task by the same user in the same BD day.
  SELECT COUNT(*) INTO v_dup
    FROM public.task_submissions
    WHERE user_id = NEW.user_id
      AND task_id = NEW.task_id
      AND status <> 'rejected'
      AND created_at >= v_day_start
      AND created_at <  v_day_end;
  IF v_dup > 0 THEN
    RAISE EXCEPTION 'এই টাস্কটি আজ ইতিমধ্যেই সম্পন্ন হয়েছে';
  END IF;

  -- Pick the highest daily_tasks across the user's active packages.
  SELECT COALESCE(MAX(pk.daily_tasks), 0) INTO v_limit
    FROM public.user_packages up
    JOIN public.packages pk ON pk.id = up.package_id
    WHERE up.user_id = NEW.user_id AND up.status = 'active';

  IF v_limit <= 0 THEN
    RAISE EXCEPTION 'টাস্ক করতে হলে একটি active প্যাকেজ লাগবে';
  END IF;

  SELECT COUNT(*) INTO v_done
    FROM public.task_submissions
    WHERE user_id = NEW.user_id
      AND status <> 'rejected'
      AND created_at >= v_day_start
      AND created_at <  v_day_end;

  IF v_done >= v_limit THEN
    RAISE EXCEPTION 'আজকের দৈনিক টাস্ক লিমিট (%) শেষ হয়েছে', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_task_limit ON public.task_submissions;
CREATE TRIGGER trg_enforce_daily_task_limit
BEFORE INSERT ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_task_limit();
