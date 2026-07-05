
ALTER TABLE public.link_tasks 
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_link_tasks_pkg_date ON public.link_tasks (required_package_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_link_tasks_active_date ON public.link_tasks (active, scheduled_date) WHERE is_draft = false;

-- Drop old public policy and recreate to exclude drafts and honor scheduled_date
DROP POLICY IF EXISTS "auth users read active tasks" ON public.link_tasks;
CREATE POLICY "auth users read active tasks" ON public.link_tasks
  FOR SELECT
  USING (
    active = true 
    AND is_draft = false 
    AND (scheduled_date IS NULL OR scheduled_date <= (now() AT TIME ZONE 'Asia/Dhaka')::date)
  );
