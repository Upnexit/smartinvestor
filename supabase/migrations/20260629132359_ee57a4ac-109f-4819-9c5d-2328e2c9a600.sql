
-- Payment method enum
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('bkash','nagad','rocket');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequence for user_code
CREATE SEQUENCE IF NOT EXISTS public.user_code_seq START 1000;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'bkash',
  ADD COLUMN IF NOT EXISTS payment_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS user_code text,
  ADD COLUMN IF NOT EXISTS signup_bonus_paid boolean NOT NULL DEFAULT false;

-- Backfill user_code for existing rows
UPDATE public.profiles
   SET user_code = 'SN-' || lpad(nextval('public.user_code_seq')::text, 6, '0')
 WHERE user_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN user_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_code_key ON public.profiles(user_code);

-- Update new-user trigger to include payment fields, user_code, and ৳300 locked bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code text;
  v_referrer uuid;
  v_pm public.payment_method;
BEGIN
  v_ref_code := COALESCE(NEW.raw_user_meta_data->>'ref', NEW.raw_user_meta_data->>'referral_code');
  IF v_ref_code IS NOT NULL AND length(v_ref_code) > 0 THEN
    SELECT id INTO v_referrer FROM public.profiles
      WHERE referral_code = upper(v_ref_code) LIMIT 1;
  END IF;

  BEGIN
    v_pm := COALESCE((NEW.raw_user_meta_data->>'payment_method')::public.payment_method, 'bkash');
  EXCEPTION WHEN others THEN
    v_pm := 'bkash';
  END;

  INSERT INTO public.profiles (
    id, full_name, phone, email,
    payment_method, payment_number,
    user_code, referral_code, referred_by,
    balance, locked_balance
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'phone',''),
    NEW.email,
    v_pm,
    COALESCE(NEW.raw_user_meta_data->>'payment_number',''),
    'SN-' || lpad(nextval('public.user_code_seq')::text, 6, '0'),
    upper(substr(md5(random()::text), 1, 8)),
    v_referrer,
    300,
    300
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
