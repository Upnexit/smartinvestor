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
-- 1. Insert or update default verification package in packages table
INSERT INTO public.packages (id, name, price, daily_income, daily_tasks, duration_days, active, sort_order)
VALUES ('00000000-0000-0000-0000-000000000001', 'অ্যাকাউন্ট ভেরিফিকেশন ফি', 150.00, 0, 0, 3650, false, 999)
ON CONFLICT (id) DO UPDATE
SET name = 'অ্যাকাউন্ট ভেরিফিকেশন ফি';

-- 2. Add is_verified column to profiles table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Update site_settings for ad_settings to include min_referrals & verification_fee
UPDATE public.site_settings
SET value = jsonb_set(
  jsonb_set(
    COALESCE(value, '{}'::jsonb),
    '{min_referrals}',
    '10'::jsonb
  ),
  '{verification_fee}',
  '150'::jsonb
)
WHERE key = 'ad_settings';

-- 4. Create RPC to check withdraw eligibility
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
  v_ref_count INT := 0;
  v_is_verified BOOLEAN := false;
  v_verification_status TEXT := 'unpaid'; -- 'unpaid' | 'pending' | 'verified'
  v_pkg_id UUID := '00000000-0000-0000-0000-000000000001';
  v_order_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  -- Load site settings
  SELECT value INTO v_settings FROM site_settings WHERE key = 'ad_settings';
  IF v_settings IS NOT NULL THEN
    v_min_refs := COALESCE((v_settings->>'min_referrals')::INT, 10);
    v_fee := COALESCE((v_settings->>'verification_fee')::NUMERIC, 150.00);
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

  RETURN jsonb_build_object(
    'authenticated', true,
    'referrals_count', v_ref_count,
    'required_referrals', v_min_refs,
    'referrals_completed', (v_ref_count >= v_min_refs),
    'is_verified', v_is_verified,
    'verification_status', v_verification_status,
    'verification_fee', v_fee,
    'verification_pkg_id', v_pkg_id,
    'can_withdraw', (v_ref_count >= v_min_refs AND v_is_verified)
  );
END;
$$;

-- 5. Trigger or trigger logic: when admin approves user_packages for verification package, mark profile as is_verified
CREATE OR REPLACE FUNCTION public.handle_verification_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.package_id = '00000000-0000-0000-0000-000000000001' AND NEW.status = 'active' THEN
    UPDATE profiles
    SET is_verified = true, updated_at = now()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verification_approval ON public.user_packages;
CREATE TRIGGER trg_verification_approval
AFTER INSERT OR UPDATE OF status ON public.user_packages
FOR EACH ROW
EXECUTE FUNCTION public.handle_verification_approval();
`;

async function run() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  console.log("Migration result:", res.status, data);
}

run();

