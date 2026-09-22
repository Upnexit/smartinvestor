-- 20260922131000_lucky_spin_system.sql
-- 24-Hour Lucky Spin Wheel Income System with 50% Deposit Claiming Flow

-- 1. Create spin_wheel_slices table
CREATE TABLE IF NOT EXISTS public.spin_wheel_slices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#F59E0B',
  text_color text NOT NULL DEFAULT '#FFFFFF',
  weight integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for active slices
CREATE INDEX IF NOT EXISTS idx_spin_wheel_slices_active_sort 
  ON public.spin_wheel_slices(is_active, sort_order);

-- 2. Create spin_history table
CREATE TABLE IF NOT EXISTS public.spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  won_amount numeric NOT NULL,
  deposit_required numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending_deposit', -- 'pending_deposit', 'deposit_submitted', 'approved', 'rejected'
  payment_method text, -- 'bkash', 'nagad', 'rocket'
  sender_number text,
  trx_id text,
  screenshot_url text,
  admin_notes text,
  slice_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spin_history_user_created 
  ON public.spin_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spin_history_status 
  ON public.spin_history(status, created_at DESC);

-- 3. Add columns to profiles for tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_spin_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_spins integer NOT NULL DEFAULT 0;

-- 4. Seed initial slices matching user's design & requirements
INSERT INTO public.spin_wheel_slices (label, amount, color, text_color, weight, is_active, sort_order)
VALUES 
  ('৳১', 1, '#E11D48', '#FFFFFF', 30, true, 1),
  ('৳২', 2, '#9333EA', '#FFFFFF', 25, true, 2),
  ('৳৫', 5, '#2563EB', '#FFFFFF', 20, true, 3),
  ('৳০.৫০', 0.50, '#0D9488', '#FFFFFF', 35, true, 4),
  ('৳১০', 10, '#EA580C', '#FFFFFF', 15, true, 5),
  ('৳৭', 7, '#16A34A', '#FFFFFF', 18, true, 6),
  ('৳১.৫০', 1.50, '#06B6D4', '#FFFFFF', 25, true, 7),
  ('৳২০', 20, '#DC2626', '#FFFFFF', 12, true, 8),
  ('৳৫০০', 500, '#8B5CF6', '#FFFFFF', 8, true, 9),
  ('৳১০০০', 1000, '#F59E0B', '#FFFFFF', 5, true, 10),
  ('৳৫০০০', 5000, '#EC4899', '#FFFFFF', 3, true, 11)
ON CONFLICT DO NOTHING;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.spin_wheel_slices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

-- Slices policies
DROP POLICY IF EXISTS "Anyone authenticated can view active slices" ON public.spin_wheel_slices;
CREATE POLICY "Anyone authenticated can view active slices"
  ON public.spin_wheel_slices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage slices" ON public.spin_wheel_slices;
CREATE POLICY "Admins can manage slices"
  ON public.spin_wheel_slices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Spin history policies
DROP POLICY IF EXISTS "Users can view own spin history" ON public.spin_history;
CREATE POLICY "Users can view own spin history"
  ON public.spin_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own spin history" ON public.spin_history;
CREATE POLICY "Users can insert own spin history"
  ON public.spin_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own spin deposit" ON public.spin_history;
CREATE POLICY "Users can update own spin deposit"
  ON public.spin_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all spin history" ON public.spin_history;
CREATE POLICY "Admins can manage all spin history"
  ON public.spin_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Core Database Functions (SECURITY DEFINER)

-- (A) Execute User Spin
CREATE OR REPLACE FUNCTION public.execute_user_spin(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_spin timestamptz;
  v_cooldown_hours integer := 24;
  v_slice record;
  v_total_weight integer := 0;
  v_random_weight integer;
  v_cumulative_weight integer := 0;
  v_spin_id uuid;
  v_deposit_amount numeric;
  v_time_since interval;
BEGIN
  -- Verify calling user matches
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized caller');
  END IF;

  -- Check cooldown from profiles
  SELECT last_spin_at INTO v_last_spin FROM public.profiles WHERE id = p_user_id;
  
  IF v_last_spin IS NOT NULL THEN
    v_time_since := now() - v_last_spin;
    IF v_time_since < (v_cooldown_hours * interval '1 hour') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', '২৪ ঘণ্টার মধ্যে একবারই স্পিন করা যাবে',
        'remaining_seconds', EXTRACT(EPOCH FROM ((v_cooldown_hours * interval '1 hour') - v_time_since))::integer
      );
    END IF;
  END IF;

  -- Calculate total weight of active slices
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM public.spin_wheel_slices
  WHERE is_active = true;

  IF v_total_weight <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'স্পিন হুইল বর্তমানে বন্ধ রয়েছে');
  END IF;

  -- Pick a random weight
  v_random_weight := floor(random() * v_total_weight);

  -- Select the winning slice
  FOR v_slice IN
    SELECT id, label, amount, color, text_color, weight, sort_order
    FROM public.spin_wheel_slices
    WHERE is_active = true
    ORDER BY sort_order ASC, id ASC
  LOOP
    v_cumulative_weight := v_cumulative_weight + v_slice.weight;
    IF v_random_weight < v_cumulative_weight THEN
      EXIT;
    END IF;
  END LOOP;

  -- Half deposit amount (50% of won amount)
  v_deposit_amount := ROUND(v_slice.amount * 0.5, 2);

  -- Insert into spin_history
  INSERT INTO public.spin_history (
    user_id,
    won_amount,
    deposit_required,
    status,
    slice_label,
    created_at
  ) VALUES (
    p_user_id,
    v_slice.amount,
    v_deposit_amount,
    'pending_deposit',
    v_slice.label,
    now()
  )
  RETURNING id INTO v_spin_id;

  -- Update profiles last_spin_at and total_spins
  UPDATE public.profiles
  SET 
    last_spin_at = now(),
    total_spins = COALESCE(total_spins, 0) + 1,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'spin_id', v_spin_id,
    'slice', jsonb_build_object(
      'id', v_slice.id,
      'label', v_slice.label,
      'amount', v_slice.amount,
      'color', v_slice.color,
      'text_color', v_slice.text_color,
      'sort_order', v_slice.sort_order
    ),
    'won_amount', v_slice.amount,
    'deposit_required', v_deposit_amount,
    'created_at', now()
  );
END;
$$;

-- (B) Submit Spin Deposit
CREATE OR REPLACE FUNCTION public.submit_spin_deposit(
  p_spin_id uuid,
  p_method text,
  p_sender text,
  p_trx text,
  p_screenshot text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spin record;
BEGIN
  SELECT * INTO v_spin FROM public.spin_history WHERE id = p_spin_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'স্পিন রেকর্ড পাওয়া যায়নি');
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_spin.user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'অননুমোদিত অ্যাকশন');
  END IF;

  IF v_spin.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'এই স্পিনটি ইতিমধ্যেই অনুমোদিত');
  END IF;

  UPDATE public.spin_history
  SET
    status = 'deposit_submitted',
    payment_method = p_method,
    sender_number = p_sender,
    trx_id = p_trx,
    screenshot_url = COALESCE(p_screenshot, screenshot_url),
    submitted_at = now()
  WHERE id = p_spin_id;

  RETURN jsonb_build_object('success', true, 'message', 'ডিপোজিট সফলভাবে জমা দেওয়া হয়েছে');
END;
$$;

-- (C) Admin Approve Spin Deposit
CREATE OR REPLACE FUNCTION public.admin_approve_spin(p_spin_id uuid, p_admin_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_spin record;
  v_is_admin boolean := false;
BEGIN
  -- Verify admin status
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'শুধুমাত্র অ্যাডমিন অনুমোদন করতে পারেন');
  END IF;

  SELECT * INTO v_spin FROM public.spin_history WHERE id = p_spin_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'স্পিন হিস্ট্রি পাওয়া যায়নি');
  END IF;

  IF v_spin.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ইতিমধ্যেই অনুমোদিত');
  END IF;

  -- 1. Update spin history status
  UPDATE public.spin_history
  SET
    status = 'approved',
    approved_at = now(),
    reviewed_by = p_admin_id
  WHERE id = p_spin_id;

  -- 2. Atomically credit the user's balance and total_earned
  UPDATE public.profiles
  SET
    balance = COALESCE(balance, 0) + v_spin.won_amount,
    total_earned = COALESCE(total_earned, 0) + v_spin.won_amount,
    updated_at = now()
  WHERE id = v_spin.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'স্পিন ডিপোজিট সফলভাবে অনুমোদিত এবং ইউজার একাউন্টে ৳' || v_spin.won_amount || ' যুক্ত হয়েছে',
    'won_amount', v_spin.won_amount,
    'user_id', v_spin.user_id
  );
END;
$$;

-- (D) Admin Reject Spin Deposit
CREATE OR REPLACE FUNCTION public.admin_reject_spin(p_spin_id uuid, p_admin_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_admin_id AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'অননুমোদিত অ্যাকশন');
  END IF;

  UPDATE public.spin_history
  SET
    status = 'rejected',
    admin_notes = p_reason,
    reviewed_by = p_admin_id
  WHERE id = p_spin_id;

  RETURN jsonb_build_object('success', true, 'message', 'স্পিন বাতিল করা হয়েছে');
END;
$$;
