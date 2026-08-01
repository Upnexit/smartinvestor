SELECT cron.unschedule('auto-daily-tasks-bd-2am');

SELECT cron.schedule(
  'auto-daily-tasks-bd-2am',
  '0 20 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://project--53c6a07a-40d3-4d21-9105-97bc1ff86fa8-dev.lovable.app/api/public/hooks/auto-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweWFyY3JpenZqeXVrYWF6bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mjk5MzgsImV4cCI6MjA5ODMwNTkzOH0.iI3hMWQxrwYVuAz-Lxkq257Be-Rn1GXCjF0hVPLzupw'
    ),
    body := '{}'::jsonb
  ) AS request_id;
$job$
);

REVOKE ALL ON FUNCTION public.fill_distributor_package_order_snapshot() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fill_distributor_package_order_snapshot() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_review_distributor_package_order(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_distributor_package_order(uuid, uuid, text, text) TO authenticated, service_role;