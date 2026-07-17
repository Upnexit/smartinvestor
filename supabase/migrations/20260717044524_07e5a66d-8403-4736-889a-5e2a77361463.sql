CREATE OR REPLACE FUNCTION public.package_task_quota(_package_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
    COALESCE((
      SELECT NULLIF(p.daily_tasks, 0)
      FROM public.packages p
      WHERE p.id = _package_id
      LIMIT 1
    ), 10),
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.link_tasks lt
      WHERE lt.required_package_id = _package_id
        AND lt.scheduled_date = ((now() AT TIME ZONE 'Asia/Dhaka')::date)
        AND lt.active = true
        AND COALESCE(lt.is_draft, false) = false
    ), 0)
  )::integer;
$function$;

COMMENT ON FUNCTION public.package_task_quota(uuid)
IS 'Returns the effective daily task quota: max(packages.daily_tasks/default 10, today active non-draft tasks for the package).';