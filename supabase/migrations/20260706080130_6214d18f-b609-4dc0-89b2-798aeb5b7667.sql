-- Auto-purge activity_logs so only "today" (Asia/Dhaka) is retained.
-- Reduces storage and keeps admin views fast.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Purge helper: delete anything older than the start of the current Dhaka day.
CREATE OR REPLACE FUNCTION public.purge_old_activity_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.activity_logs
   WHERE created_at < (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
$$;

-- Remove any prior schedule of the same job, then reschedule.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT jobid FROM cron.job WHERE jobname = 'purge_activity_logs_daily' LOOP
    PERFORM cron.unschedule(r.jobid);
  END LOOP;
END $$;

-- Run every hour so late-night edits and clock skew still clean up promptly.
-- (Full-day rollover happens at 00:00 Asia/Dhaka = 18:00 UTC.)
SELECT cron.schedule(
  'purge_activity_logs_daily',
  '5 * * * *',
  $$SELECT public.purge_old_activity_logs();$$
);

-- Immediate one-time cleanup so storage drops right away.
SELECT public.purge_old_activity_logs();

-- Update the admin distributor bundle to only include today's activity.
CREATE OR REPLACE FUNCTION public.admin_distributor_bundle(_actor uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_distributor jsonb;
  v_profile jsonb;
  v_stats jsonb;
  v_users jsonb;
  v_activity jsonb;
  v_user_activity jsonb;
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT to_jsonb(d) INTO v_distributor FROM public.distributors d WHERE d.user_id = _user_id;
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = _user_id;

  SELECT public.distributor_stats(_user_id) INTO v_stats;

  SELECT COALESCE(jsonb_agg(row_to_json(u) ORDER BY u.created_at DESC), '[]'::jsonb) INTO v_users
  FROM (
    SELECT p.id, p.full_name, p.email, p.phone, p.user_code, p.balance, p.total_earned,
           p.status, p.created_at,
           EXISTS(SELECT 1 FROM public.user_packages up WHERE up.user_id = p.id AND up.status='active') AS has_active_package
    FROM public.profiles p
    WHERE p.distributor_id = _user_id
    ORDER BY p.created_at DESC
    LIMIT 500
  ) u;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_activity
  FROM (
    SELECT id, event_type, meta, ip, user_agent, created_at
    FROM public.activity_logs
    WHERE user_id = _user_id AND created_at >= v_day_start
    ORDER BY created_at DESC
    LIMIT 200
  ) a;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_user_activity
  FROM (
    SELECT al.id, al.user_id, al.event_type, al.meta, al.created_at,
           p.full_name AS actor_name, p.user_code AS actor_code
    FROM public.activity_logs al
    JOIN public.profiles p ON p.id = al.user_id
    WHERE p.distributor_id = _user_id AND al.created_at >= v_day_start
    ORDER BY al.created_at DESC
    LIMIT 200
  ) a;

  RETURN jsonb_build_object(
    'distributor', v_distributor,
    'profile', v_profile,
    'stats', v_stats,
    'users', v_users,
    'activity', v_activity,
    'user_activity', v_user_activity
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purge_old_activity_logs() TO service_role;