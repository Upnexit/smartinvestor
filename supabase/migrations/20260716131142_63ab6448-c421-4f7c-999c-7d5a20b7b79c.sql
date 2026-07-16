
-- 1) Daily-limit trigger does: WHERE user_id = ? AND status <> 'rejected' AND created_at >= today
--    Add a partial composite index tailored to that path.
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_created_active
  ON public.task_submissions (user_id, created_at DESC)
  WHERE status <> 'rejected';

-- 2) Active-package lookup inside enforce_daily_task_limit
--    (user_id, status='active') hot path, small partial index.
CREATE INDEX IF NOT EXISTS idx_user_packages_active_user
  ON public.user_packages (user_id)
  WHERE status = 'active';

-- 3) Recent task-submissions per user (dashboards, "already submitted today")
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_created
  ON public.task_submissions (user_id, created_at DESC);

-- 4) Faster "is this task active today" lookup used by tasks list
CREATE INDEX IF NOT EXISTS idx_link_tasks_active_pkg_date
  ON public.link_tasks (required_package_id, scheduled_date)
  WHERE active = true AND is_draft = false;

-- 5) Refresh planner stats so new indexes are used immediately
ANALYZE public.task_submissions;
ANALYZE public.user_packages;
ANALYZE public.link_tasks;
