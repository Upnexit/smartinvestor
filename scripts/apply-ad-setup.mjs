import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const envLocalPath = path.join(rootDir, ".env.local");
let token = process.env.SUPABASE_ACCESS_TOKEN;
let ref = "gpyarcrizvjyukaazndj";

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("SUPABASE_ACCESS_TOKEN=")) {
      token = trimmed.split("=")[1].replace(/["']/g, "").trim();
    }
    if (trimmed.startsWith("SUPABASE_PROJECT_ID=")) {
      ref = trimmed.split("=")[1].replace(/["']/g, "").trim();
    }
  }
}

const sql = `
-- 1. Insert default ad settings into site_settings if not present
INSERT INTO site_settings (key, value)
VALUES ('ad_settings', jsonb_build_object(
  'direct_link', 'https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b',
  'reward_per_ad', 0.20,
  'daily_limit', 50,
  'timer_seconds', 20,
  'enabled', true
))
ON CONFLICT (key) DO UPDATE
SET value = jsonb_build_object(
  'direct_link', 'https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b',
  'reward_per_ad', 0.20,
  'daily_limit', 50,
  'timer_seconds', 20,
  'enabled', true
);

-- 2. Create user_ad_views table
CREATE TABLE IF NOT EXISTS public.user_ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for daily counting per user
CREATE INDEX IF NOT EXISTS idx_user_ad_views_user_date ON public.user_ad_views(user_id, created_at);

-- Enable RLS
ALTER TABLE public.user_ad_views ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Users can view own ad views" ON public.user_ad_views;
DROP POLICY IF EXISTS "Admins can view all ad views" ON public.user_ad_views;

-- Policy: users can view their own ad views
CREATE POLICY "Users can view own ad views" ON public.user_ad_views
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: admins can view all
CREATE POLICY "Admins can view all ad views" ON public.user_ad_views
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. RPC function to safely claim ad reward
CREATE OR REPLACE FUNCTION public.claim_ad_reward()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_settings JSONB;
  v_reward NUMERIC(10,2);
  v_daily_limit INT;
  v_enabled BOOLEAN;
  v_today_count INT;
  v_today_start TIMESTAMP WITH TIME ZONE;
  v_new_balance NUMERIC(10,2);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'লগইন করুন।');
  END IF;

  -- Load ad settings
  SELECT value INTO v_settings FROM site_settings WHERE key = 'ad_settings';
  IF v_settings IS NULL THEN
    v_reward := 0.20;
    v_daily_limit := 50;
    v_enabled := true;
  ELSE
    v_reward := COALESCE((v_settings->>'reward_per_ad')::NUMERIC, 0.20);
    v_daily_limit := COALESCE((v_settings->>'daily_limit')::INT, 50);
    v_enabled := COALESCE((v_settings->>'enabled')::BOOLEAN, true);
  END IF;

  IF NOT v_enabled THEN
    RETURN jsonb_build_object('success', false, 'message', 'বর্তমানে অ্যাড দেখা সাময়িক বন্ধ আছে।');
  END IF;

  -- Bangladesh timezone (UTC+6)
  v_today_start := (timezone('Asia/Dhaka', now()))::date::timestamp AT TIME ZONE 'Asia/Dhaka';

  -- Check count today
  SELECT COUNT(*) INTO v_today_count
  FROM user_ad_views
  WHERE user_id = v_uid
    AND created_at >= v_today_start;

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'আজকের জন্য আপনার অ্যাড দেখার দৈনিক সীমা শেষ হয়েছে!');
  END IF;

  -- Record ad view
  INSERT INTO user_ad_views (user_id, reward_amount)
  VALUES (v_uid, v_reward);

  -- Update user balance & total_earned & tasks_completed
  UPDATE profiles
  SET balance = COALESCE(balance, 0) + v_reward,
      total_earned = COALESCE(total_earned, 0) + v_reward,
      tasks_completed = COALESCE(tasks_completed, 0) + 1,
      updated_at = now()
  WHERE id = v_uid
  RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'অ্যাড দেখা সফল হয়েছে! আপনার একাউন্টে ৳' || v_reward || ' যোগ হয়েছে।',
    'reward', v_reward,
    'today_count', v_today_count + 1,
    'daily_limit', v_daily_limit,
    'balance', v_new_balance
  );
END;
$$;
`;

async function run() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  console.log("Migration status:", res.status, data);
}

run();

const sql2 = `
CREATE OR REPLACE FUNCTION public.get_my_ad_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_settings JSONB;
  v_reward NUMERIC(10,2);
  v_daily_limit INT;
  v_timer INT;
  v_direct_link TEXT;
  v_enabled BOOLEAN;
  v_today_count INT;
  v_today_earned NUMERIC(10,2);
  v_total_ads INT;
  v_today_start TIMESTAMP WITH TIME ZONE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT value INTO v_settings FROM site_settings WHERE key = 'ad_settings';
  v_reward := COALESCE((v_settings->>'reward_per_ad')::NUMERIC, 0.20);
  v_daily_limit := COALESCE((v_settings->>'daily_limit')::INT, 50);
  v_timer := COALESCE((v_settings->>'timer_seconds')::INT, 20);
  v_direct_link := COALESCE(v_settings->>'direct_link', 'https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b');
  v_enabled := COALESCE((v_settings->>'enabled')::BOOLEAN, true);

  v_today_start := (timezone('Asia/Dhaka', now()))::date::timestamp AT TIME ZONE 'Asia/Dhaka';

  SELECT COUNT(*), COALESCE(SUM(reward_amount), 0)
  INTO v_today_count, v_today_earned
  FROM user_ad_views
  WHERE user_id = v_uid AND created_at >= v_today_start;

  SELECT COUNT(*) INTO v_total_ads
  FROM user_ad_views
  WHERE user_id = v_uid;

  RETURN jsonb_build_object(
    'authenticated', true,
    'today_count', v_today_count,
    'today_earned', v_today_earned,
    'total_ads', v_total_ads,
    'daily_limit', v_daily_limit,
    'timer_seconds', v_timer,
    'reward_per_ad', v_reward,
    'direct_link', v_direct_link,
    'enabled', v_enabled
  );
END;
$$;
`;

async function run2() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql2 }),
  });
  const data = await res.json();
  console.log("Status RPC creation:", res.status, data);
}

run2();
