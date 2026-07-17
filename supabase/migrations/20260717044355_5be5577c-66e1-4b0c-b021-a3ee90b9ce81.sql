CREATE OR REPLACE FUNCTION public.package_task_quota(_package_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT NULLIF(p.daily_tasks, 0)
      FROM public.packages p
      WHERE p.id = _package_id
      LIMIT 1
    ),
    10
  )::integer;
$function$;

COMMENT ON FUNCTION public.package_task_quota(uuid)
IS 'Returns the package daily task quota from packages.daily_tasks, with a safe default of 10 when unset.';