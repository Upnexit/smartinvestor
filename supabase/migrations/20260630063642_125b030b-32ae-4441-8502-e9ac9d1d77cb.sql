
-- User status enum + column
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active','suspended','banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspend_reason text;

-- Admin set status RPC
CREATE OR REPLACE FUNCTION public.admin_set_user_status(_actor uuid, _user_id uuid, _status public.user_status, _reason text DEFAULT NULL)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET status = _status, suspend_reason = CASE WHEN _status='active' THEN NULL ELSE _reason END
    WHERE id = _user_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;
  RETURN v_row;
END; $$;

-- Support messages between suspended/any user and admin
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender text NOT NULL CHECK (sender IN ('user','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_messages_user_created_idx ON public.support_messages(user_id, created_at);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own or admin select" ON public.support_messages;
CREATE POLICY "own or admin select" ON public.support_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "user insert own" ON public.support_messages;
CREATE POLICY "user insert own" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND sender = 'user');

DROP POLICY IF EXISTS "admin insert any" ON public.support_messages;
CREATE POLICY "admin insert any" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND sender = 'admin');

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
