
-- 1. Active-user count for a package (null = across all active packages)
CREATE OR REPLACE FUNCTION public.package_active_user_count(_pkg uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT up.user_id)::int
  FROM public.user_packages up
  WHERE up.status = 'active'
    AND (_pkg IS NULL OR up.package_id = _pkg);
$$;

GRANT EXECUTE ON FUNCTION public.package_active_user_count(uuid) TO authenticated, service_role;

-- 2. Per-package active user counts as a set (for UI listings)
CREATE OR REPLACE FUNCTION public.packages_active_user_counts()
RETURNS TABLE(package_id uuid, active_users integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.package_id, COUNT(DISTINCT up.user_id)::int
  FROM public.user_packages up
  WHERE up.status = 'active'
  GROUP BY up.package_id;
$$;

GRANT EXECUTE ON FUNCTION public.packages_active_user_counts() TO authenticated, service_role;

-- 3. Auto-delete a link_task once every eligible active user has an approved submission
CREATE OR REPLACE FUNCTION public.maybe_cleanup_link_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task       public.link_tasks;
  v_eligible   int;
  v_approved   int;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_task FROM public.link_tasks WHERE id = NEW.task_id;
  IF NOT FOUND OR v_task.is_draft OR NOT v_task.active THEN
    RETURN NEW;
  END IF;

  -- Determine the eligible audience.
  --   • required_package_id NOT NULL → users with that active package.
  --   • required_package_id NULL     → any user with any active package.
  SELECT COUNT(DISTINCT up.user_id) INTO v_eligible
  FROM public.user_packages up
  WHERE up.status = 'active'
    AND (v_task.required_package_id IS NULL OR up.package_id = v_task.required_package_id);

  IF v_eligible = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT ts.user_id) INTO v_approved
  FROM public.task_submissions ts
  WHERE ts.task_id = v_task.id AND ts.status = 'approved';

  IF v_approved >= v_eligible THEN
    -- CASCADE removes task_submissions rows too.
    DELETE FROM public.link_tasks WHERE id = v_task.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_submissions_cleanup ON public.task_submissions;
CREATE TRIGGER trg_task_submissions_cleanup
AFTER INSERT OR UPDATE OF status ON public.task_submissions
FOR EACH ROW EXECUTE FUNCTION public.maybe_cleanup_link_task();

-- 4. Daily bulk cleanup: purge published tasks older than 2 days
CREATE OR REPLACE FUNCTION public.cleanup_old_link_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date date := (now() AT TIME ZONE 'Asia/Dhaka')::date - INTERVAL '2 days';
  v_cutoff_ts   timestamptz := now() - INTERVAL '2 days';
  v_deleted     int := 0;
BEGIN
  WITH del AS (
    DELETE FROM public.link_tasks
    WHERE is_draft = false
      AND (
        (scheduled_date IS NOT NULL AND scheduled_date < v_cutoff_date)
        OR (scheduled_date IS NULL AND created_at < v_cutoff_ts)
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_link_tasks() TO service_role;

-- 5. Schedule cleanup daily 3:15 AM Dhaka (21:15 UTC)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-link-tasks');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-old-link-tasks',
  '15 21 * * *',
  $$ SELECT public.cleanup_old_link_tasks(); $$
);
