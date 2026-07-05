
-- Notices table
CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'info' CHECK (priority IN ('info','warning','critical')),
  target_package_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  target_all_users boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  expires_at timestamptz NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read published notices"
  ON public.notices FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert notices"
  ON public.notices FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update notices"
  ON public.notices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete notices"
  ON public.notices FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_notices_updated_at BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notices_published ON public.notices(published, expires_at DESC);

-- Dismissals table
CREATE TABLE public.notice_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.notice_dismissals TO authenticated;
GRANT ALL ON public.notice_dismissals TO service_role;

ALTER TABLE public.notice_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dismissals"
  ON public.notice_dismissals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own dismissals"
  ON public.notice_dismissals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own dismissals"
  ON public.notice_dismissals FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_notice_dismissals_user ON public.notice_dismissals(user_id, notice_id);
