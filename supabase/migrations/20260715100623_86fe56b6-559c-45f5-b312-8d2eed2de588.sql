
ALTER TABLE public.error_logs
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS fingerprint text,
  ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;

CREATE UNIQUE INDEX IF NOT EXISTS error_logs_fingerprint_unresolved_uniq
  ON public.error_logs (fingerprint)
  WHERE resolved = false AND fingerprint IS NOT NULL;

CREATE INDEX IF NOT EXISTS error_logs_resolved_created_idx
  ON public.error_logs (resolved, created_at DESC);

-- Grants (public.error_logs is only read by admin, but INSERT must be broad)
GRANT INSERT ON public.error_logs TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

-- Policies: allow anyone (even anon) to insert; admin-only read/update/delete.
DROP POLICY IF EXISTS "anyone can insert errors" ON public.error_logs;
CREATE POLICY "anyone can insert errors"
  ON public.error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin update errors" ON public.error_logs;
CREATE POLICY "admin update errors"
  ON public.error_logs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin delete errors" ON public.error_logs;
CREATE POLICY "admin delete errors"
  ON public.error_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Idempotent recorder: upsert by fingerprint, bump count/last_seen_at.
CREATE OR REPLACE FUNCTION public.record_error_log(
  _level text, _message text, _source text,
  _context jsonb, _user_id uuid, _url text, _user_agent text, _fingerprint text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF _fingerprint IS NULL OR length(_fingerprint) = 0 THEN
    _fingerprint := md5(coalesce(_level,'') || '|' || coalesce(_source,'') || '|' || coalesce(_message,''));
  END IF;

  INSERT INTO public.error_logs (level, message, source, context, user_id, url, user_agent, fingerprint, last_seen_at)
  VALUES (coalesce(nullif(_level,''),'error'), left(coalesce(_message,''),4000), _source,
          coalesce(_context,'{}'::jsonb), _user_id, _url, left(coalesce(_user_agent,''),400), _fingerprint, now())
  ON CONFLICT (fingerprint) WHERE resolved = false
  DO UPDATE SET
    count = public.error_logs.count + 1,
    last_seen_at = now(),
    message = EXCLUDED.message,
    context = EXCLUDED.context,
    url = COALESCE(EXCLUDED.url, public.error_logs.url),
    user_id = COALESCE(EXCLUDED.user_id, public.error_logs.user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_error_log(text,text,text,jsonb,uuid,text,text,text)
  TO anon, authenticated, service_role;
