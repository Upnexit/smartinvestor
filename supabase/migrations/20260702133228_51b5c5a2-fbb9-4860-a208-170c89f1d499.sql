
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event ON public.activity_logs (event_type, created_at DESC);

GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own activity"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own activity"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all activity"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-log referral signup: when a new profile is created with referred_by set,
-- record it against the referrer.
CREATE OR REPLACE FUNCTION public.log_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO public.activity_logs (user_id, event_type, meta)
    VALUES (
      NEW.referred_by,
      'referral_signup',
      jsonb_build_object(
        'referred_user_id', NEW.id,
        'referred_name', NEW.full_name,
        'user_code', NEW.user_code
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_referral_signup ON public.profiles;
CREATE TRIGGER trg_log_referral_signup
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_referral_signup();

-- Admin-scoped RPC that returns a full distributor bundle:
-- distributor row, stats, referred users, and recent activity for the
-- distributor + all their referred users.
CREATE OR REPLACE FUNCTION public.admin_distributor_bundle(_actor uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distributor jsonb;
  v_profile jsonb;
  v_stats jsonb;
  v_users jsonb;
  v_activity jsonb;
  v_user_activity jsonb;
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
    WHERE user_id = _user_id
    ORDER BY created_at DESC
    LIMIT 200
  ) a;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_user_activity
  FROM (
    SELECT al.id, al.user_id, al.event_type, al.meta, al.created_at,
           p.full_name AS actor_name, p.user_code AS actor_code
    FROM public.activity_logs al
    JOIN public.profiles p ON p.id = al.user_id
    WHERE p.distributor_id = _user_id
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
$$;
