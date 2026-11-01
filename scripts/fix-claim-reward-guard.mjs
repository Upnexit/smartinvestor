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
-- 1. Update profile_guard to explicitly whitelist claim_ad_reward or allow execution context
CREATE OR REPLACE FUNCTION public.profile_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow service_role
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow admins
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Allow updates coming from nested triggers or internal reward functions
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Allow when flag is set in transaction context
  IF current_setting('app.allow_profile_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.locked_balance IS DISTINCT FROM OLD.locked_balance
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.total_earned IS DISTINCT FROM OLD.total_earned THEN
    RAISE EXCEPTION 'forbidden field modification';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Update claim_ad_reward to set the bypass flag and execute cleanly
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

  -- Set transaction-level flag so profile_guard allows balance update
  PERFORM set_config('app.allow_profile_update', 'true', true);

  -- Load ad settings directly from site_settings (dynamic real-time rate from admin)
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
    'message', 'অভিনন্দন! আপনার অ্যাকাউন্টে ৳' || v_reward || ' সফলভাবে জমা হয়েছে।',
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
