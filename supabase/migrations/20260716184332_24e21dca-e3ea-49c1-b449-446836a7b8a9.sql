DROP TRIGGER IF EXISTS trg_guard_link_task_daily_quota ON public.link_tasks;

CREATE OR REPLACE FUNCTION public.guard_link_task_daily_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;