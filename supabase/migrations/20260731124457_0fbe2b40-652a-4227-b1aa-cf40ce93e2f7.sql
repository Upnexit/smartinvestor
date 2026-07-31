-- 1) Snapshot columns so future package edits never affect existing buyers
ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS snapshot_price numeric,
  ADD COLUMN IF NOT EXISTS snapshot_duration_days integer,
  ADD COLUMN IF NOT EXISTS snapshot_daily_tasks integer,
  ADD COLUMN IF NOT EXISTS snapshot_daily_income numeric,
  ADD COLUMN IF NOT EXISTS snapshot_package_name text;

UPDATE public.user_packages up
SET snapshot_price = COALESCE(up.snapshot_price, p.price),
    snapshot_duration_days = COALESCE(up.snapshot_duration_days, p.duration_days),
    snapshot_daily_tasks = COALESCE(up.snapshot_daily_tasks, p.daily_tasks),
    snapshot_daily_income = COALESCE(up.snapshot_daily_income, p.daily_income),
    snapshot_package_name = COALESCE(up.snapshot_package_name, p.name)
FROM public.packages p
WHERE p.id = up.package_id
  AND (up.snapshot_price IS NULL OR up.snapshot_daily_tasks IS NULL);

-- fill snapshots on insert
CREATE OR REPLACE FUNCTION public.fill_user_package_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE p public.packages;
BEGIN
  SELECT * INTO p FROM public.packages WHERE id = NEW.package_id;
  IF FOUND THEN
    NEW.snapshot_price := COALESCE(NEW.snapshot_price, p.price);
    NEW.snapshot_duration_days := COALESCE(NEW.snapshot_duration_days, p.duration_days);
    NEW.snapshot_daily_tasks := COALESCE(NEW.snapshot_daily_tasks, p.daily_tasks);
    NEW.snapshot_daily_income := COALESCE(NEW.snapshot_daily_income, p.daily_income);
    NEW.snapshot_package_name := COALESCE(NEW.snapshot_package_name, p.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_user_package_snapshot ON public.user_packages;
CREATE TRIGGER trg_fill_user_package_snapshot
BEFORE INSERT ON public.user_packages
FOR EACH ROW EXECUTE FUNCTION public.fill_user_package_snapshot();

-- 2) Daily task limit now honours the buyer's own snapshot
CREATE OR REPLACE FUNCTION public.enforce_daily_task_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
  v_day_end   timestamptz := v_day_start + interval '1 day';
  v_limit     int;
  v_done      int;
  v_prior     int;
BEGIN
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_prior
    FROM public.task_submissions
    WHERE user_id = NEW.user_id
      AND task_id = NEW.task_id
      AND status <> 'rejected';
  IF v_prior > 0 THEN
    RAISE EXCEPTION 'এই টাস্কটি আপনি আগেই সম্পন্ন করেছেন';
  END IF;

  SELECT COALESCE(MAX(GREATEST(
           COALESCE(NULLIF(up.snapshot_daily_tasks, 0), 0),
           public.package_task_quota(up.package_id)
         )), 0) INTO v_limit
    FROM public.user_packages up
    WHERE up.user_id = NEW.user_id AND up.status = 'active';

  IF v_limit <= 0 THEN
    RAISE EXCEPTION 'টাস্ক করতে হলে একটি active প্যাকেজ লাগবে';
  END IF;

  SELECT COUNT(*) INTO v_done
    FROM public.task_submissions
    WHERE user_id = NEW.user_id
      AND status <> 'rejected'
      AND created_at >= v_day_start
      AND created_at <  v_day_end;

  IF v_done >= v_limit THEN
    RAISE EXCEPTION 'আজকের দৈনিক টাস্ক লিমিট (%) শেষ হয়েছে', v_limit;
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Legacy flag
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false;

-- 4) Remove packages nobody ever bought
DELETE FROM public.packages p
WHERE NOT EXISTS (SELECT 1 FROM public.user_packages up WHERE up.package_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.link_tasks lt WHERE lt.required_package_id = p.id);

-- 5) Mark remaining old packages as legacy (still active until launch day)
UPDATE public.packages SET is_legacy = true WHERE created_at < now();

-- 6) New package line-up — hidden until launch
INSERT INTO public.packages (name, price, duration_days, daily_tasks, daily_income, description, active, is_legacy, sort_order, featured)
VALUES
  ('প্লাটিনাম প্রো প্যাকেজ',     1500,  60, 10,   50, 'মেয়াদ ৬০ দিন • দৈনিক আয় ৫০৳ • মোট আয় ৩,০০০৳',      false, false, 101, false),
  ('মেঘা গ্রোথ প্যাকেজ',        3000,  60, 10,  100, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১০০৳ • মোট আয় ৬,০০০৳',     false, false, 102, false),
  ('আলটিমেট ভ্যালু প্যাকেজ',     4500,  60, 10,  150, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১৫০৳ • মোট আয় ৯,০০০৳',     false, false, 103, false),
  ('এলিট প্ল্যান প্যাকেজ',       6000,  60, 10,  200, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২০০৳ • মোট আয় ১২,০০০৳',    false, false, 104, false),
  ('প্রিমিয়ার এক্সপ্রেস প্যাকেজ', 9000,  60, 10,  300, 'মেয়াদ ৬০ দিন • দৈনিক আয় ৩০০৳ • মোট আয় ১৮,০০০৳',    false, false, 105, false),
  ('টাইটানিয়াম টিয়ার প্যাকেজ',  15000, 60, 10,  500, 'মেয়াদ ৬০ দিন • দৈনিক আয় ৫০০৳ • মোট আয় ৩০,০০০৳',    false, false, 106, false),
  ('স্টার পাওয়ার প্যাকেজ',       30000, 60, 10, 1000, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১,০০০৳ • মোট আয় ৬০,০০০৳',  false, false, 107, false),
  ('ইনফিনিটি প্যাকেজ',          45000, 60, 10, 1500, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১,৫০০৳ • মোট আয় ৯০,০০০৳',  false, false, 108, false),
  ('আলফা চয়েস প্যাকেজ',        60000, 60, 10, 2000, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২,০০০৳ • মোট আয় ১,২০,০০০৳', false, false, 109, false),
  ('গ্লোবাল এলিট প্যাকেজ',       70000, 60, 10, 2350, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২,৩৫০৳ • মোট আয় ১,৪১,০০০৳', false, false, 110, false),
  ('ক্রাউন এলিট প্যাকেজ',        85000, 60, 10, 2850, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২,৮৫০৳ • মোট আয় ১,৭১,০০০৳', false, false, 111, false),
  ('এপেক্স ফিউচার প্যাকেজ',      99999, 60, 10, 3500, 'মেয়াদ ৬০ দিন • দৈনিক আয় ৩,৫০০৳ • মোট আয় ২,১০,০০০৳', false, false, 112, true);

-- 7) Launch switch (hidden rollout control)
INSERT INTO public.site_settings (key, value)
VALUES ('package_launch', jsonb_build_object('launched', false))
ON CONFLICT (key) DO NOTHING;