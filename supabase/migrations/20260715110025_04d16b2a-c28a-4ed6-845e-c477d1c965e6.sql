
-- 1) Archive table for auto-deleted notices
CREATE TABLE IF NOT EXISTS public.notice_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL,
  target_all_users boolean NOT NULL,
  target_package_ids uuid[] NOT NULL DEFAULT '{}',
  target_user_ids uuid[] NOT NULL DEFAULT '{}',
  audience_count integer NOT NULL DEFAULT 0,
  dismissed_count integer NOT NULL DEFAULT 0,
  notice_created_at timestamptz,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'all_recipients_dismissed'
);

GRANT SELECT ON public.notice_deletion_log TO authenticated;
GRANT ALL ON public.notice_deletion_log TO service_role;
ALTER TABLE public.notice_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notice deletion log"
  ON public.notice_deletion_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_notice_deletion_log_deleted_at
  ON public.notice_deletion_log (deleted_at DESC);

-- 2) Compute the audience size for a notice — matches user-side visibility logic
CREATE OR REPLACE FUNCTION public.notice_audience_count(
  _target_all_users boolean,
  _target_user_ids uuid[],
  _target_package_ids uuid[]
) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _target_all_users THEN
      (SELECT COUNT(*)::int FROM public.profiles WHERE COALESCE(status,'active') = 'active')
    ELSE
      (
        SELECT COUNT(*)::int FROM (
          SELECT p.id FROM public.profiles p
          WHERE COALESCE(p.status,'active') = 'active'
            AND (
              (COALESCE(array_length(_target_user_ids,1),0) > 0 AND p.id = ANY(_target_user_ids))
              OR EXISTS (
                SELECT 1 FROM public.user_packages up
                WHERE up.user_id = p.id AND up.status = 'active'
                  AND up.package_id = ANY(COALESCE(_target_package_ids,'{}'::uuid[]))
              )
            )
          GROUP BY p.id
        ) x
      )
  END;
$$;

-- 3) Trigger: after a dismissal, if everyone has dismissed, archive+delete the notice
CREATE OR REPLACE FUNCTION public.notice_autodelete_if_all_dismissed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_notice   public.notices;
  v_audience int;
  v_dismissed int;
BEGIN
  SELECT * INTO v_notice FROM public.notices WHERE id = NEW.notice_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NOT v_notice.published THEN RETURN NEW; END IF;

  v_audience := public.notice_audience_count(
    v_notice.target_all_users,
    v_notice.target_user_ids,
    v_notice.target_package_ids
  );
  IF COALESCE(v_audience, 0) <= 0 THEN RETURN NEW; END IF;

  SELECT COUNT(DISTINCT user_id)::int INTO v_dismissed
    FROM public.notice_dismissals WHERE notice_id = v_notice.id;

  IF v_dismissed >= v_audience THEN
    INSERT INTO public.notice_deletion_log (
      notice_id, title, body, priority,
      target_all_users, target_package_ids, target_user_ids,
      audience_count, dismissed_count, notice_created_at, reason
    ) VALUES (
      v_notice.id, v_notice.title, v_notice.body, v_notice.priority,
      v_notice.target_all_users, v_notice.target_package_ids, v_notice.target_user_ids,
      v_audience, v_dismissed, v_notice.created_at, 'all_recipients_dismissed'
    );
    DELETE FROM public.notice_dismissals WHERE notice_id = v_notice.id;
    DELETE FROM public.notices WHERE id = v_notice.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notice_autodelete_if_all_dismissed ON public.notice_dismissals;
CREATE TRIGGER trg_notice_autodelete_if_all_dismissed
AFTER INSERT ON public.notice_dismissals
FOR EACH ROW EXECUTE FUNCTION public.notice_autodelete_if_all_dismissed();

REVOKE ALL ON FUNCTION public.notice_autodelete_if_all_dismissed() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notice_audience_count(boolean, uuid[], uuid[]) FROM PUBLIC, anon;
