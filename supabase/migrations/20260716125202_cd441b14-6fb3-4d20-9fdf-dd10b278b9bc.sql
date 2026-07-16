-- 1) Loosen guard: past-date tasks are not counted for daily quota
CREATE OR REPLACE FUNCTION public.guard_link_task_daily_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pkg uuid;
  v_date date;
  v_today date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_quota int;
  v_remaining int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  v_pkg := COALESCE(OLD.required_package_id, NEW.required_package_id);
  v_date := COALESCE(OLD.scheduled_date, NEW.scheduled_date);

  -- Past-date tasks are historical; quota guard does not apply
  IF v_date IS NULL OR v_date < v_today THEN
    RETURN NEW;
  END IF;

  -- Only guard package-specific rows
  IF v_pkg IS NULL THEN
    RETURN NEW;
  END IF;

  v_quota := public.package_task_quota(v_pkg);

  SELECT COUNT(*) INTO v_remaining
    FROM public.link_tasks
    WHERE required_package_id = v_pkg
      AND scheduled_date = v_date
      AND active = true
      AND is_draft = false
      AND id <> COALESCE(OLD.id, NEW.id);

  -- If the new row would still be active + non-draft, include it
  IF NEW.active = true AND COALESCE(NEW.is_draft, false) = false THEN
    v_remaining := v_remaining + 1;
  END IF;

  IF v_remaining < v_quota THEN
    RAISE EXCEPTION 'এই package/day-তে কমপক্ষে %টি active task থাকতে হবে। আগে replacement task add/activate করুন, তারপর inactive/edit করুন।', v_quota;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Now deactivate past-date active tasks (guard no longer blocks)
UPDATE public.link_tasks
   SET active = false,
       updated_at = now()
 WHERE active = true
   AND is_draft = false
   AND scheduled_date IS NOT NULL
   AND scheduled_date < ((now() AT TIME ZONE 'Asia/Dhaka')::date);

-- 3) Improve enforce_daily_task_limit — friendly message for lifetime-dup
CREATE OR REPLACE FUNCTION public.enforce_daily_task_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
  v_day_end   timestamptz := v_day_start + interval '1 day';
  v_limit     int;
  v_done      int;
  v_prior     int;
BEGIN
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_prior
    FROM public.task_submissions
    WHERE user_id = NEW.user_id
      AND task_id = NEW.task_id
      AND status <> 'rejected';
  IF v_prior > 0 THEN
    RAISE EXCEPTION 'এই টাস্কটি আপনি আগেই সম্পন্ন করেছেন';
  END IF;

  SELECT COALESCE(MAX(public.package_task_quota(up.package_id)), 0) INTO v_limit
    FROM public.user_packages up
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
$function$;