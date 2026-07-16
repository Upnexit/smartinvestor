-- Fixed daily task quota: Crazy Package = 5, all other packages = 10
CREATE OR REPLACE FUNCTION public.package_task_quota(_package_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.packages p
      WHERE p.id = _package_id AND lower(p.name) LIKE '%crazy%'
    ) THEN 5
    ELSE 10
  END;
$$;

-- Keep package daily_tasks aligned with the new business rule for UI/reporting.
UPDATE public.packages
SET daily_tasks = CASE WHEN lower(name) LIKE '%crazy%' THEN 5 ELSE 10 END,
    updated_at = now();

-- Prevent admins/distributors from leaving a published package day below the fixed quota.
CREATE OR REPLACE FUNCTION public.guard_link_task_daily_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pkg uuid;
  v_date date;
  v_quota int;
  v_remaining int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  v_pkg := COALESCE(OLD.required_package_id, NEW.required_package_id);
  v_date := COALESCE(OLD.scheduled_date, NEW.scheduled_date);

  -- Only guard package-specific scheduled batches. Global/ad-hoc tasks stay flexible.
  IF v_pkg IS NULL OR v_date IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  v_quota := public.package_task_quota(v_pkg);

  -- Check only when a published active task is being deleted, drafted, moved, or turned off.
  IF TG_OP = 'DELETE' THEN
    IF OLD.active = true AND OLD.is_draft = false THEN
      SELECT COUNT(*) INTO v_remaining
      FROM public.link_tasks lt
      WHERE lt.required_package_id = v_pkg
        AND lt.scheduled_date = v_date
        AND lt.active = true
        AND lt.is_draft = false
        AND lt.id <> OLD.id;

      IF v_remaining < v_quota THEN
        RAISE EXCEPTION 'এই package/day-তে কমপক্ষে %টি active task থাকতে হবে। আগে replacement task add/activate করুন, তারপর delete করুন।', v_quota;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.active = true AND OLD.is_draft = false AND (
      NEW.active IS DISTINCT FROM true
      OR NEW.is_draft IS DISTINCT FROM false
      OR NEW.required_package_id IS DISTINCT FROM OLD.required_package_id
      OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
    ) THEN
    SELECT COUNT(*) INTO v_remaining
    FROM public.link_tasks lt
    WHERE lt.required_package_id = v_pkg
      AND lt.scheduled_date = v_date
      AND lt.active = true
      AND lt.is_draft = false
      AND lt.id <> OLD.id;

    IF v_remaining < v_quota THEN
      RAISE EXCEPTION 'এই package/day-তে কমপক্ষে %টি active task থাকতে হবে। আগে replacement task add/activate করুন, তারপর inactive/edit করুন।', v_quota;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_link_task_daily_quota ON public.link_tasks;
CREATE TRIGGER trg_guard_link_task_daily_quota
BEFORE UPDATE OR DELETE ON public.link_tasks
FOR EACH ROW
EXECUTE FUNCTION public.guard_link_task_daily_quota();

-- Do not physically delete completed tasks automatically anymore. Keeping rows preserves user history and prevents orphaned submissions.
CREATE OR REPLACE FUNCTION public.maybe_cleanup_link_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NEW;
END;
$$;

-- Enforce fixed daily quota at submit time, not the old package.daily_tasks numbers.
CREATE OR REPLACE FUNCTION public.enforce_daily_task_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
  v_day_end   timestamptz := v_day_start + interval '1 day';
  v_limit     int;
  v_done      int;
  v_dup       int;
BEGIN
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

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
$$;