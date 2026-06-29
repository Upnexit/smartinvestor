
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.package_status AS ENUM ('pending', 'active', 'rejected', 'expired');
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE public.payment_method AS ENUM ('bkash', 'nagad', 'rocket');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  locked_balance NUMERIC(12,2) NOT NULL DEFAULT 300,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ PACKAGES ============
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  daily_tasks INTEGER NOT NULL DEFAULT 0,
  daily_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO authenticated, anon;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active packages" ON public.packages FOR SELECT TO authenticated, anon USING (active = TRUE);
CREATE POLICY "admins manage packages" ON public.packages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER PACKAGES ============
CREATE TABLE public.user_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  status public.package_status NOT NULL DEFAULT 'pending',
  trx_id TEXT,
  payment_method public.payment_method,
  screenshot_url TEXT,
  rejection_reason TEXT,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_packages TO authenticated;
GRANT ALL ON public.user_packages TO service_role;
ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own packages" ON public.user_packages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own package orders" ON public.user_packages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins manage user_packages" ON public.user_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER user_packages_updated_at BEFORE UPDATE ON public.user_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LINK TASKS ============
CREATE TABLE public.link_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  link_url TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'like_comment',
  reward NUMERIC(12,2) NOT NULL DEFAULT 0,
  required_package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.link_tasks TO authenticated;
GRANT ALL ON public.link_tasks TO service_role;
ALTER TABLE public.link_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read active tasks" ON public.link_tasks FOR SELECT TO authenticated USING (active = TRUE);
CREATE POLICY "admins manage tasks" ON public.link_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER link_tasks_updated_at BEFORE UPDATE ON public.link_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TASK SUBMISSIONS ============
CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.link_tasks(id) ON DELETE CASCADE,
  status public.submission_status NOT NULL DEFAULT 'pending',
  proof_url TEXT,
  reward_credited NUMERIC(12,2) NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
GRANT SELECT, INSERT ON public.task_submissions TO authenticated;
GRANT ALL ON public.task_submissions TO service_role;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own submissions" ON public.task_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own submissions" ON public.task_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage submissions" ON public.task_submissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER task_submissions_updated_at BEFORE UPDATE ON public.task_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER PAYMENT METHODS ============
CREATE TABLE public.user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payment_methods TO authenticated;
GRANT ALL ON public.user_payment_methods TO service_role;
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own payment methods" ON public.user_payment_methods FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_payment_methods_updated_at BEFORE UPDATE ON public.user_payment_methods FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ WITHDRAWALS ============
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  method public.payment_method NOT NULL,
  account_number TEXT NOT NULL,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  trx_id TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users create own withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins manage withdrawals" ON public.withdrawals FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ REFERRAL EARNINGS ============
CREATE TABLE public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_earnings TO authenticated;
GRANT ALL ON public.referral_earnings TO service_role;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own referrals" ON public.referral_earnings FOR SELECT TO authenticated USING (auth.uid() = referrer_id);

-- ============ SITE SETTINGS ============
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO authenticated, anon;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads site settings" ON public.site_settings FOR SELECT TO authenticated, anon USING (TRUE);
CREATE POLICY "admins manage site settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMMUNITY MESSAGES ============
CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  voice_url TEXT,
  voice_duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.community_messages TO authenticated;
GRANT DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth reads community" ON public.community_messages FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth posts community" ON public.community_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own messages" ON public.community_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage community" ON public.community_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer UUID;
BEGIN
  v_ref_code := UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', '') FROM 1 FOR 8));

  IF NEW.raw_user_meta_data ? 'referral_code' THEN
    SELECT id INTO v_referrer FROM public.profiles
      WHERE referral_code = UPPER(NEW.raw_user_meta_data->>'referral_code') LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, email, referral_code, referred_by, locked_balance)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    v_ref_code,
    v_referrer,
    300
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED PACKAGES ============
INSERT INTO public.packages (name, price, daily_tasks, daily_income, duration_days, description, sort_order) VALUES
  ('Starter', 500, 10, 50, 30, 'নতুন ইউজারদের জন্য', 1),
  ('Silver', 1500, 20, 120, 30, 'মাঝারি আয়ের প্ল্যান', 2),
  ('Gold', 3000, 35, 250, 30, 'জনপ্রিয় প্ল্যান', 3),
  ('Diamond', 6000, 60, 500, 30, 'প্রিমিয়াম প্ল্যান', 4),
  ('VIP', 12000, 100, 1000, 30, 'সর্বোচ্চ আয়ের প্ল্যান', 5);

INSERT INTO public.site_settings (key, value) VALUES
  ('dashboard_banner', '{"enabled": true, "title": "স্বাগতম Smart Investor-এ!", "message": "প্রতিদিন লাইক-কমেন্ট করে আয় করুন।", "variant": "amber"}'::jsonb),
  ('payment_numbers', '{"bkash": "01700000000", "nagad": "01700000000", "rocket": "01700000000"}'::jsonb);
