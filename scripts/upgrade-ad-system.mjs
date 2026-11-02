import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf-8");
let token = "";
let ref = "gpyarcrizvjyukaazndj";

for (const line of env.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("SUPABASE_ACCESS_TOKEN=")) {
    token = trimmed.slice("SUPABASE_ACCESS_TOKEN=".length).replace(/["']/g, "").trim();
  }
}

const sql = `
-- 1. Ensure user_ad_views table exists
CREATE TABLE IF NOT EXISTS public.user_ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_ad_views_user_date ON public.user_ad_views(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_ad_views_created_at ON public.user_ad_views(created_at DESC);

-- 2. Update RLS policies on user_ad_views
ALTER TABLE public.user_ad_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all ad views" ON public.user_ad_views;
DROP POLICY IF EXISTS "Users can view own ad views" ON public.user_ad_views;

CREATE POLICY "Users can view own ad views" ON public.user_ad_views
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ad views" ON public.user_ad_views
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR auth.uid() = '54c008ad-bc82-4ebb-a083-d37f92414808'::uuid
  );

-- 3. Update ad_settings defaults in site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('ad_settings', jsonb_build_object(
  'direct_link', 'https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b',
  'reward_per_ad', 0.20,
  'daily_limit', 50,
  'timer_seconds', 20,
  'enabled', true,
  'first_withdraw_min', 100,
  'second_withdraw_min', 500,
  'min_referrals', 10,
  'verification_fee', 150
))
ON CONFLICT (key) DO UPDATE
SET value = jsonb_build_object(
  'direct_link', COALESCE(public.site_settings.value->>'direct_link', 'https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b'),
  'reward_per_ad', COALESCE((public.site_settings.value->>'reward_per_ad')::NUMERIC, 0.20),
  'daily_limit', COALESCE((public.site_settings.value->>'daily_limit')::INT, 50),
  'timer_seconds', COALESCE((public.site_settings.value->>'timer_seconds')::INT, 20),
  'enabled', COALESCE((public.site_settings.value->>'enabled')::BOOLEAN, true),
  'first_withdraw_min', COALESCE((public.site_settings.value->>'first_withdraw_min')::NUMERIC, 100),
  'second_withdraw_min', COALESCE((public.site_settings.value->>'second_withdraw_min')::NUMERIC, 500),
  'min_referrals', COALESCE((public.site_settings.value->>'min_referrals')::INT, 10),
  'verification_fee', COALESCE((public.site_settings.value->>'verification_fee')::NUMERIC, 150)
);

-- 4. Update check_withdraw_eligibility to handle first vs second withdraw limits
CREATE OR REPLACE FUNCTION public.check_withdraw_eligibility()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_settings JSONB;
  v_min_refs INT := 10;
  v_fee NUMERIC(10,2) := 150.00;
  v_first_min NUMERIC(10,2) := 100.00;
  v_second_min NUMERIC(10,2) := 500.00;
  v_ref_count INT := 0;
  v_is_verified BOOLEAN := false;
  v_verification_status TEXT := 'unpaid';
  v_pkg_id UUID := '00000000-0000-0000-0000-000000000001';
  v_order_status TEXT;
  v_completed_wds INT := 0;
  v_current_min NUMERIC(10,2);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  -- Load site settings
  SELECT value INTO v_settings FROM site_settings WHERE key = 'ad_settings';
  IF v_settings IS NOT NULL THEN
    v_min_refs := COALESCE((v_settings->>'min_referrals')::INT, 10);
    v_fee := COALESCE((v_settings->>'verification_fee')::NUMERIC, 150.00);
    v_first_min := COALESCE((v_settings->>'first_withdraw_min')::NUMERIC, 100.00);
    v_second_min := COALESCE((v_settings->>'second_withdraw_min')::NUMERIC, 500.00);
  END IF;

  -- Count real referrals
  SELECT COUNT(*) INTO v_ref_count
  FROM profiles
  WHERE referred_by = v_uid;

  -- Check profile verification
  SELECT COALESCE(is_verified, false) INTO v_is_verified
  FROM profiles
  WHERE id = v_uid;

  -- Check user_packages order for verification package
  SELECT status INTO v_order_status
  FROM user_packages
  WHERE user_id = v_uid AND package_id = v_pkg_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_is_verified OR v_order_status = 'active' THEN
    v_verification_status := 'verified';
    v_is_verified := true;
  ELSIF v_order_status = 'pending' THEN
    v_verification_status := 'pending';
  ELSE
    v_verification_status := 'unpaid';
  END IF;

  -- Check how many non-rejected withdrawals this user has completed or requested
  SELECT COUNT(*) INTO v_completed_wds
  FROM withdrawals
  WHERE user_id = v_uid AND status != 'rejected';

  IF v_completed_wds = 0 THEN
    v_current_min := v_first_min;
  ELSE
    v_current_min := v_second_min;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'referrals_count', v_ref_count,
    'required_referrals', v_min_refs,
    'referrals_completed', (v_ref_count >= v_min_refs),
    'is_verified', v_is_verified,
    'verification_status', v_verification_status,
    'verification_fee', v_fee,
    'verification_pkg_id', v_pkg_id,
    'completed_withdrawals', v_completed_wds,
    'first_withdraw_min', v_first_min,
    'second_withdraw_min', v_second_min,
    'current_min_withdraw', v_current_min,
    'is_second_or_more', (v_completed_wds >= 1),
    'can_withdraw', (v_ref_count >= v_min_refs AND v_is_verified)
  );
END;
$$;

-- 5. Atomic RPC for Admin to get complete Ad stats and logs
CREATE OR REPLACE FUNCTION public.admin_get_ad_stats(_actor uuid DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_settings JSONB;
  v_today_start TIMESTAMP WITH TIME ZONE;
  v_total_views BIGINT := 0;
  v_total_expense NUMERIC(10,2) := 0;
  v_total_users BIGINT := 0;
  v_today_views BIGINT := 0;
  v_today_expense NUMERIC(10,2) := 0;
  v_today_users BIGINT := 0;
  v_recent JSONB;
BEGIN
  IF _actor IS NOT NULL THEN
    v_is_admin := (public.has_role(_actor, 'admin'::app_role) OR _actor = '54c008ad-bc82-4ebb-a083-d37f92414808'::uuid);
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Load settings
  SELECT value INTO v_settings FROM site_settings WHERE key = 'ad_settings';

  -- Bangladesh timezone today start
  v_today_start := (timezone('Asia/Dhaka', now()))::date::timestamp AT TIME ZONE 'Asia/Dhaka';

  -- Total stats
  SELECT 
    COUNT(*), 
    COALESCE(SUM(reward_amount), 0),
    COUNT(DISTINCT user_id)
  INTO v_total_views, v_total_expense, v_total_users
  FROM user_ad_views;

  -- Today stats
  SELECT 
    COUNT(*), 
    COALESCE(SUM(reward_amount), 0),
    COUNT(DISTINCT user_id)
  INTO v_today_views, v_today_expense, v_today_users
  FROM user_ad_views
  WHERE created_at >= v_today_start;

  -- Recent 50 ad views with user profile details
  SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO v_recent
  FROM (
    SELECT 
      uav.id,
      uav.user_id,
      uav.reward_amount,
      uav.created_at,
      p.full_name,
      p.phone,
      p.user_code,
      p.balance AS current_balance
    FROM user_ad_views uav
    LEFT JOIN profiles p ON p.id = uav.user_id
    ORDER BY uav.created_at DESC
    LIMIT 50
  ) item;

  RETURN jsonb_build_object(
    'success', true,
    'total_views', v_total_views,
    'total_expense', v_total_expense,
    'total_users', v_total_users,
    'today_views', v_today_views,
    'today_expense', v_today_expense,
    'today_users', v_today_users,
    'settings', v_settings,
    'recent_views', v_recent
  );
END;
$$;

-- 6. Atomic RPC for Admin to save Ad settings
CREATE OR REPLACE FUNCTION public.admin_save_ad_settings(_actor uuid, _settings jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_fee NUMERIC(10,2);
  v_pkg_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF _actor IS NOT NULL THEN
    v_is_admin := (public.has_role(_actor, 'admin'::app_role) OR _actor = '54c008ad-bc82-4ebb-a083-d37f92414808'::uuid);
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Upsert site_settings
  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES ('ad_settings', _settings, now())
  ON CONFLICT (key) DO UPDATE
  SET value = _settings, updated_at = now();

  -- Update verification fee package price if provided
  v_fee := COALESCE((_settings->>'verification_fee')::NUMERIC, NULL);
  IF v_fee IS NOT NULL AND v_fee >= 0 THEN
    UPDATE public.packages
    SET price = v_fee, updated_at = now()
    WHERE id = v_pkg_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
END;
$$;
`;

async function apply() {
  console.log("Applying ad control upgrade SQL...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  console.log("Result:", res.status, data);
}

apply();

