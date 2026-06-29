
-- ============ NEW TABLES ============
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.communities TO authenticated, anon;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "admin manage communities" ON public.communities FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.community_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_bans TO authenticated;
GRANT ALL ON public.community_bans TO service_role;
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self read bans" ON public.community_bans FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage bans" ON public.community_bans FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  source text,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.error_logs TO service_role;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read errors" ON public.error_logs FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- ============ COLUMN ADDITIONS ============
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.link_tasks
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS daily_limit integer NOT NULL DEFAULT 0;

-- ============ PROFILE GUARD ============
CREATE OR REPLACE FUNCTION public.profile_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role') = 'service_role' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.locked_balance IS DISTINCT FROM OLD.locked_balance
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
    RAISE EXCEPTION 'forbidden field modification';
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS profile_guard_trg ON public.profiles;
CREATE TRIGGER profile_guard_trg BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profile_guard();

-- ============ TASK REWARD TRIGGER ============
CREATE OR REPLACE FUNCTION public.credit_task_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reward numeric;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT reward INTO v_reward FROM public.link_tasks WHERE id = NEW.task_id;
    IF COALESCE(v_reward,0) > 0 THEN
      UPDATE public.profiles
        SET balance = balance + v_reward,
            total_earned = total_earned + v_reward
        WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS credit_task_reward_trg ON public.task_submissions;
CREATE TRIGGER credit_task_reward_trg AFTER INSERT OR UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.credit_task_reward();

-- ============ ADMIN RPCs ============

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(_actor uuid, _user_id uuid, _patch jsonb)
RETURNS public.profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET
    full_name = COALESCE(_patch->>'full_name', full_name),
    phone = COALESCE(_patch->>'phone', phone),
    email = COALESCE(_patch->>'email', email),
    avatar_url = COALESCE(_patch->>'avatar_url', avatar_url),
    status = COALESCE((_patch->>'status')::public.user_status, status),
    balance = COALESCE((_patch->>'balance')::numeric, balance),
    locked_balance = COALESCE((_patch->>'locked_balance')::numeric, locked_balance)
  WHERE id = _user_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;
  RETURN v_row;
END;$$;
REVOKE ALL ON FUNCTION public.admin_update_user_profile(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_profile(uuid,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(_actor uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.task_submissions WHERE user_id = _user_id;
  DELETE FROM public.withdrawals WHERE user_id = _user_id;
  DELETE FROM public.user_packages WHERE user_id = _user_id;
  DELETE FROM public.referral_earnings WHERE referrer_id = _user_id OR referred_user_id = _user_id;
  DELETE FROM public.community_messages WHERE user_id = _user_id;
  DELETE FROM public.user_payment_methods WHERE user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;$$;
REVOKE ALL ON FUNCTION public.admin_delete_user_data(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_data(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_save_package(_actor uuid, _id uuid, _patch jsonb)
RETURNS public.packages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.packages;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.packages (name, price, daily_income, duration_days, image_url, active, description)
    VALUES (
      _patch->>'name',
      COALESCE((_patch->>'price')::numeric,0),
      COALESCE((_patch->>'daily_income')::numeric,0),
      COALESCE((_patch->>'duration_days')::int,30),
      _patch->>'image_url',
      COALESCE((_patch->>'active')::boolean,true),
      _patch->>'description'
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.packages SET
      name = COALESCE(_patch->>'name', name),
      price = COALESCE((_patch->>'price')::numeric, price),
      daily_income = COALESCE((_patch->>'daily_income')::numeric, daily_income),
      duration_days = COALESCE((_patch->>'duration_days')::int, duration_days),
      image_url = COALESCE(_patch->>'image_url', image_url),
      active = COALESCE((_patch->>'active')::boolean, active),
      description = COALESCE(_patch->>'description', description)
    WHERE id = _id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;$$;
REVOKE ALL ON FUNCTION public.admin_save_package(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_package(uuid,uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_toggle_package(_actor uuid, _id uuid, _active boolean)
RETURNS public.packages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.packages;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.packages SET active = _active WHERE id = _id RETURNING * INTO v_row;
  RETURN v_row;
END;$$;
REVOKE ALL ON FUNCTION public.admin_toggle_package(uuid,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_package(uuid,uuid,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_delete_package(_actor uuid, _id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.packages WHERE id = _id;
END;$$;
REVOKE ALL ON FUNCTION public.admin_delete_package(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_package(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_actor uuid, _id uuid, _action text, _note text DEFAULT NULL)
RETURNS public.withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.withdrawals; v_bal numeric;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal not found'; END IF;

  IF _action = 'approve' THEN
    SELECT balance INTO v_bal FROM public.profiles WHERE id = v_row.user_id FOR UPDATE;
    IF COALESCE(v_bal,0) < v_row.amount THEN RAISE EXCEPTION 'insufficient balance'; END IF;
    UPDATE public.profiles SET balance = balance - v_row.amount WHERE id = v_row.user_id;
    UPDATE public.withdrawals SET status='approved', note=_note, reviewed_by=_actor, reviewed_at=now()
      WHERE id=_id RETURNING * INTO v_row;
  ELSIF _action = 'reject' THEN
    UPDATE public.withdrawals SET status='rejected', note=_note, rejection_reason=_note, reviewed_by=_actor, reviewed_at=now()
      WHERE id=_id RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;
  RETURN v_row;
END;$$;
REVOKE ALL ON FUNCTION public.admin_review_withdrawal(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid,uuid,text,text) TO service_role;
