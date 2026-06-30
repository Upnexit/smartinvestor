
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.email_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_otps_user_idx ON public.email_otps(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.email_otps TO authenticated;
GRANT ALL ON public.email_otps TO service_role;

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own otps select" ON public.email_otps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own otps insert" ON public.email_otps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own otps update" ON public.email_otps FOR UPDATE TO authenticated USING (auth.uid() = user_id);
