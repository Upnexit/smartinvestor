/*
================================================================================
  SMART CLICK BD (BD Eran) - COMPLETE DATABASE CONSOLIDATED SCHEMA SCRIPT
================================================================================
  Project Ref: gpyarcrizvjyukaazndj
  Primary Admin: smartclickbd@gmail.com
  
  USAGE:
  1. Open a new Supabase project SQL Editor.
  2. Paste this entire script and click "Run".
  3. Every table, enum, function, trigger, policy, storage bucket, and seed
     record is created idempotently without any errors.
================================================================================
*/

-- =========================================================================
-- SECTION 1: EXTENSIONS & SEQUENCES
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS public.user_code_seq 
    START WITH 1000 
    INCREMENT BY 1 
    MINVALUE 1;

-- =========================================================================
-- SECTION 2: CUSTOM ENUM TYPES
-- =========================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'distributor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
        CREATE TYPE public.package_status AS ENUM ('pending', 'active', 'rejected', 'expired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM ('bkash', 'nagad', 'rocket');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'banned');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
    END IF;
END $$;



-- =========================================================================
-- SECTION 3: DATABASE TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    full_name text,
    phone text,
    email text,
    avatar_url text,
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    locked_balance numeric(12,2) DEFAULT 300 NOT NULL,
    total_earned numeric(12,2) DEFAULT 0 NOT NULL,
    tasks_completed integer DEFAULT 0 NOT NULL,
    referral_code text,
    referred_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    payment_method public.payment_method DEFAULT 'bkash'::payment_method NOT NULL,
    payment_number text DEFAULT ''::text NOT NULL,
    user_code text NOT NULL,
    signup_bonus_paid boolean DEFAULT false NOT NULL,
    status public.user_status DEFAULT 'active'::user_status NOT NULL,
    suspend_reason text,
    email_verified boolean DEFAULT false NOT NULL,
    distributor_id uuid,
    app_installed_at timestamptz,
    telegram_chat_id bigint,
    telegram_username text,
    telegram_connect_code text,
    telegram_connected_at timestamptz,
    last_spin_at timestamptz,
    total_spins integer DEFAULT 0 NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_referral_code_key UNIQUE (referral_code)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_roles_pkey PRIMARY KEY (id),
    CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price numeric(12,2) NOT NULL,
    daily_tasks integer DEFAULT 0 NOT NULL,
    daily_income numeric(12,2) DEFAULT 0 NOT NULL,
    duration_days integer DEFAULT 45 NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    image_url text,
    featured boolean DEFAULT false NOT NULL,
    is_legacy boolean DEFAULT false NOT NULL,
    CONSTRAINT packages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.distributor_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    price numeric DEFAULT 0 NOT NULL,
    monthly_salary numeric DEFAULT 0 NOT NULL,
    duration_label text DEFAULT 'কাজ যতদিন চলবে'::text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT distributor_packages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT site_settings_pkey PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    priority text DEFAULT 'info'::text NOT NULL,
    target_package_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    target_all_users boolean DEFAULT false NOT NULL,
    published boolean DEFAULT false NOT NULL,
    expires_at timestamptz,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    target_user_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    CONSTRAINT notices_pkey PRIMARY KEY (id),
    CONSTRAINT notices_priority_check CHECK ((priority = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);

CREATE TABLE IF NOT EXISTS public.notice_deletion_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notice_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    priority text NOT NULL,
    target_all_users boolean NOT NULL,
    target_package_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    target_user_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    audience_count integer DEFAULT 0 NOT NULL,
    dismissed_count integer DEFAULT 0 NOT NULL,
    notice_created_at timestamptz,
    deleted_at timestamptz DEFAULT now() NOT NULL,
    reason text DEFAULT 'all_recipients_dismissed'::text NOT NULL,
    CONSTRAINT notice_deletion_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notice_dismissals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notice_id uuid NOT NULL,
    user_id uuid NOT NULL,
    dismissed_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT notice_dismissals_pkey PRIMARY KEY (id),
    CONSTRAINT notice_dismissals_notice_id_user_id_key UNIQUE (notice_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.communities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT communities_pkey PRIMARY KEY (id),
    CONSTRAINT communities_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.community_bans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    banned_by uuid,
    reason text,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT community_bans_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.community_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content text,
    voice_url text,
    voice_duration_ms integer,
    created_at timestamptz DEFAULT now() NOT NULL,
    image_url text,
    CONSTRAINT community_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.link_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    link_url text NOT NULL,
    action_type text DEFAULT 'like_comment'::text NOT NULL,
    reward numeric(12,2) DEFAULT 0 NOT NULL,
    required_package_id uuid,
    active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    category text,
    daily_limit integer DEFAULT 0 NOT NULL,
    scheduled_date date,
    is_draft boolean DEFAULT false NOT NULL,
    created_by_distributor uuid,
    CONSTRAINT link_tasks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.task_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    task_id uuid NOT NULL,
    status public.submission_status DEFAULT 'pending'::submission_status NOT NULL,
    proof_url text,
    reward_credited numeric(12,2) DEFAULT 0 NOT NULL,
    rejection_reason text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT task_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT task_submissions_user_id_task_id_key UNIQUE (user_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.user_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    package_id uuid NOT NULL,
    status public.package_status DEFAULT 'pending'::package_status NOT NULL,
    trx_id text,
    payment_method public.payment_method,
    screenshot_url text,
    rejection_reason text,
    activated_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    sender_number text,
    payment_txn text,
    submitted_at timestamptz,
    reviewed_at timestamptz,
    purchased_at timestamptz DEFAULT now() NOT NULL,
    snapshot_price numeric,
    snapshot_duration_days integer,
    snapshot_daily_tasks integer,
    snapshot_daily_income numeric,
    snapshot_package_name text,
    CONSTRAINT user_packages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    method public.payment_method NOT NULL,
    account_number text NOT NULL,
    account_name text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_payment_methods_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.referral_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_user_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    source text,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT referral_earnings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    method public.payment_method NOT NULL,
    account_number text NOT NULL,
    status public.withdrawal_status DEFAULT 'pending'::withdrawal_status NOT NULL,
    trx_id text,
    rejection_reason text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    note text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    fee numeric(12,2) DEFAULT 0 NOT NULL,
    gross_amount numeric(12,2),
    balance_at_request numeric,
    CONSTRAINT withdrawals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shop_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0 NOT NULL,
    old_price numeric,
    image_url text,
    tag_label text,
    tag_gradient text DEFAULT 'from-amber-500 to-orange-600'::text NOT NULL,
    category text,
    stock integer DEFAULT 0 NOT NULL,
    rating numeric DEFAULT 4.9 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT shop_products_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.shop_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    product_id uuid,
    product_name text NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    address text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    note text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    payment_method text DEFAULT 'cod'::text NOT NULL,
    sender_number text,
    trx_id text,
    payment_status text DEFAULT 'unpaid'::text NOT NULL,
    CONSTRAINT shop_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.distributors (
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    payment_method public.payment_method DEFAULT 'bkash'::payment_method,
    payment_number text,
    district text,
    thana text,
    address text,
    commission_rate numeric DEFAULT 5 NOT NULL,
    total_users integer DEFAULT 0 NOT NULL,
    total_earned numeric DEFAULT 0 NOT NULL,
    balance numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    daily_task_limit integer DEFAULT 5 NOT NULL,
    locked_balance numeric DEFAULT 0 NOT NULL,
    can_manage_withdrawals boolean DEFAULT false NOT NULL,
    CONSTRAINT distributors_pkey PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS public.distributor_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    father_name text,
    phone text NOT NULL,
    email text NOT NULL,
    division text,
    district text NOT NULL,
    thana text NOT NULL,
    address text NOT NULL,
    payment_method public.payment_method DEFAULT 'bkash'::payment_method NOT NULL,
    payment_number text NOT NULL,
    experience text,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    password text,
    CONSTRAINT distributor_applications_pkey PRIMARY KEY (id),
    CONSTRAINT distributor_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE IF NOT EXISTS public.distributor_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    distributor_id uuid NOT NULL,
    source text NOT NULL,
    amount numeric NOT NULL,
    related_user_id uuid,
    related_withdrawal_id uuid,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT distributor_earnings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.distributor_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    distributor_id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    source text,
    status text DEFAULT 'new'::text NOT NULL,
    next_followup_at timestamptz,
    notes text,
    converted_user_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT distributor_leads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.distributor_package_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    distributor_id uuid NOT NULL,
    package_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method public.payment_method NOT NULL,
    sender_number text NOT NULL,
    trx_id text NOT NULL,
    submitted_at timestamptz DEFAULT now() NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamptz,
    rejection_reason text,
    snapshot_package_name text NOT NULL,
    snapshot_price numeric NOT NULL,
    snapshot_monthly_salary numeric NOT NULL,
    snapshot_duration_label text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT distributor_package_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.distributor_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    distributor_id uuid NOT NULL,
    title text NOT NULL,
    fb_page_url text NOT NULL,
    action_type text DEFAULT 'like'::text NOT NULL,
    reward numeric DEFAULT 0 NOT NULL,
    instruction text,
    status text DEFAULT 'draft'::text NOT NULL,
    published_task_id uuid,
    created_at timestamptz DEFAULT now() NOT NULL,
    verified_at timestamptz,
    published_at timestamptz,
    CONSTRAINT distributor_tasks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.distributor_withdrawals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    distributor_id uuid NOT NULL,
    amount numeric NOT NULL,
    method public.payment_method DEFAULT 'bkash'::payment_method NOT NULL,
    account_number text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    note text,
    reviewed_by uuid,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT distributor_withdrawals_pkey PRIMARY KEY (id),
    CONSTRAINT distributor_withdrawals_amount_check CHECK ((amount > (0)::numeric))
);

CREATE TABLE IF NOT EXISTS public.deleted_users_archive (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_user_id uuid NOT NULL,
    full_name text,
    phone text,
    email text,
    user_code text,
    referral_code text,
    payment_method text,
    payment_number text,
    registered_at timestamptz,
    deleted_at timestamptz DEFAULT now() NOT NULL,
    deleted_by uuid,
    total_packages_amount numeric(14,2) DEFAULT 0 NOT NULL,
    packages_count integer DEFAULT 0 NOT NULL,
    packages_details jsonb DEFAULT '[]'::jsonb NOT NULL,
    tasks_completed_count integer DEFAULT 0 NOT NULL,
    total_tasks_reward numeric(14,2) DEFAULT 0 NOT NULL,
    total_withdrawn_amount numeric(14,2) DEFAULT 0 NOT NULL,
    withdrawals_count integer DEFAULT 0 NOT NULL,
    withdrawals_details jsonb DEFAULT '[]'::jsonb NOT NULL,
    balance_at_deletion numeric(14,2) DEFAULT 0 NOT NULL,
    locked_balance_at_deletion numeric(14,2) DEFAULT 0 NOT NULL,
    lifetime_earned numeric(14,2) DEFAULT 0 NOT NULL,
    archive_notes text,
    CONSTRAINT deleted_users_archive_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.spin_wheel_slices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    color text DEFAULT '#F59E0B'::text NOT NULL,
    text_color text DEFAULT '#FFFFFF'::text NOT NULL,
    weight integer DEFAULT 10 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT spin_wheel_slices_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.spin_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    won_amount numeric NOT NULL,
    deposit_required numeric NOT NULL,
    status text DEFAULT 'pending_deposit'::text NOT NULL,
    payment_method text,
    sender_number text,
    trx_id text,
    screenshot_url text,
    admin_notes text,
    slice_label text,
    created_at timestamptz DEFAULT now() NOT NULL,
    submitted_at timestamptz,
    approved_at timestamptz,
    reviewed_by uuid,
    CONSTRAINT spin_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sender text NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT support_messages_pkey PRIMARY KEY (id),
    CONSTRAINT support_messages_sender_check CHECK ((sender = ANY (ARRAY['user'::text, 'admin'::text])))
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL,
    last_used_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE TABLE IF NOT EXISTS public.email_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    consumed_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT email_otps_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip text,
    user_agent text,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.error_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level text DEFAULT 'error'::text NOT NULL,
    message text NOT NULL,
    source text,
    context jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid,
    url text,
    user_agent text,
    fingerprint text,
    count integer DEFAULT 1 NOT NULL,
    last_seen_at timestamptz DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    resolved_at timestamptz,
    resolved_by uuid,
    CONSTRAINT error_logs_pkey PRIMARY KEY (id)
);


-- =========================================================================
-- SECTION 4: FOREIGN KEY CONSTRAINTS
-- =========================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_bans_banned_by_fkey') THEN
        ALTER TABLE public.community_bans ADD CONSTRAINT community_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_bans_user_id_fkey') THEN
        ALTER TABLE public.community_bans ADD CONSTRAINT community_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_messages_user_id_fkey') THEN
        ALTER TABLE public.community_messages ADD CONSTRAINT community_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributor_applications_reviewed_by_fkey') THEN
        ALTER TABLE public.distributor_applications ADD CONSTRAINT distributor_applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributor_package_orders_package_id_fkey') THEN
        ALTER TABLE public.distributor_package_orders ADD CONSTRAINT distributor_package_orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES distributor_packages(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributors_created_by_fkey') THEN
        ALTER TABLE public.distributors ADD CONSTRAINT distributors_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'distributors_user_id_fkey') THEN
        ALTER TABLE public.distributors ADD CONSTRAINT distributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_otps_user_id_fkey') THEN
        ALTER TABLE public.email_otps ADD CONSTRAINT email_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'link_tasks_required_package_id_fkey') THEN
        ALTER TABLE public.link_tasks ADD CONSTRAINT link_tasks_required_package_id_fkey FOREIGN KEY (required_package_id) REFERENCES packages(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notice_dismissals_notice_id_fkey') THEN
        ALTER TABLE public.notice_dismissals ADD CONSTRAINT notice_dismissals_notice_id_fkey FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_distributor_id_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_referred_by_fkey') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_user_id_fkey') THEN
        ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_earnings_referred_user_id_fkey') THEN
        ALTER TABLE public.referral_earnings ADD CONSTRAINT referral_earnings_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_earnings_referrer_id_fkey') THEN
        ALTER TABLE public.referral_earnings ADD CONSTRAINT referral_earnings_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_orders_product_id_fkey') THEN
        ALTER TABLE public.shop_orders ADD CONSTRAINT shop_orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES shop_products(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spin_history_reviewed_by_fkey') THEN
        ALTER TABLE public.spin_history ADD CONSTRAINT spin_history_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spin_history_user_id_fkey') THEN
        ALTER TABLE public.spin_history ADD CONSTRAINT spin_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_submissions_task_id_fkey') THEN
        ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_task_id_fkey FOREIGN KEY (task_id) REFERENCES link_tasks(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_submissions_user_id_fkey') THEN
        ALTER TABLE public.task_submissions ADD CONSTRAINT task_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_packages_package_id_fkey') THEN
        ALTER TABLE public.user_packages ADD CONSTRAINT user_packages_package_id_fkey FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_packages_user_id_fkey') THEN
        ALTER TABLE public.user_packages ADD CONSTRAINT user_packages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_packages_user_id_profiles_fkey') THEN
        ALTER TABLE public.user_packages ADD CONSTRAINT user_packages_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_payment_methods_user_id_fkey') THEN
        ALTER TABLE public.user_payment_methods ADD CONSTRAINT user_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_fkey') THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_reviewed_by_fkey') THEN
        ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_user_id_fkey') THEN
        ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'withdrawals_user_id_profiles_fkey') THEN
        ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;


-- =========================================================================
-- SECTION 5: PERFORMANCE & SEARCH INDEXES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_event ON public.activity_logs USING btree (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS communities_slug_key ON public.communities USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_community_bans_banned_by ON public.community_bans USING btree (banned_by);
CREATE INDEX IF NOT EXISTS idx_community_bans_user_id ON public.community_bans USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_created ON public.community_messages USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_user_id ON public.community_messages USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_deleted_at ON public.deleted_users_archive USING btree (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_email ON public.deleted_users_archive USING btree (email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_full_name ON public.deleted_users_archive USING btree (full_name);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_phone ON public.deleted_users_archive USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_user_code ON public.deleted_users_archive USING btree (user_code);
CREATE INDEX IF NOT EXISTS idx_distributor_applications_reviewed_by ON public.distributor_applications USING btree (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_distributor_applications_status ON public.distributor_applications USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distributor_earnings_dist ON public.distributor_earnings USING btree (distributor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distributor_leads_dist ON public.distributor_leads USING btree (distributor_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS distributor_package_one_live_order_idx ON public.distributor_package_orders USING btree (distributor_id, package_id) WHERE (status = ANY (ARRAY['pending'::text, 'active'::text]));
CREATE INDEX IF NOT EXISTS distributor_package_orders_distributor_idx ON public.distributor_package_orders USING btree (distributor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS distributor_package_orders_status_idx ON public.distributor_package_orders USING btree (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_distributor_tasks_dist ON public.distributor_tasks USING btree (distributor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distributors_created_by ON public.distributors USING btree (created_by);
CREATE INDEX IF NOT EXISTS email_otps_user_idx ON public.email_otps USING btree (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS error_logs_fingerprint_unresolved_uniq ON public.error_logs USING btree (fingerprint) WHERE ((resolved = false) AND (fingerprint IS NOT NULL));
CREATE INDEX IF NOT EXISTS error_logs_resolved_created_idx ON public.error_logs USING btree (resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_tasks_active_date ON public.link_tasks USING btree (active, scheduled_date) WHERE (is_draft = false);
CREATE INDEX IF NOT EXISTS idx_link_tasks_active_pkg_date ON public.link_tasks USING btree (required_package_id, scheduled_date) WHERE ((active = true) AND (is_draft = false));
CREATE INDEX IF NOT EXISTS idx_link_tasks_created_by_distributor ON public.link_tasks USING btree (created_by_distributor);
CREATE INDEX IF NOT EXISTS idx_link_tasks_pkg_date ON public.link_tasks USING btree (required_package_id, scheduled_date);
CREATE UNIQUE INDEX IF NOT EXISTS link_tasks_unique_slot_idx ON public.link_tasks USING btree (scheduled_date, required_package_id, link_url) WHERE ((is_draft = false) AND (scheduled_date IS NOT NULL) AND (required_package_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_notice_deletion_log_deleted_at ON public.notice_deletion_log USING btree (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notice_dismissals_notice ON public.notice_dismissals USING btree (notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_dismissals_user ON public.notice_dismissals USING btree (user_id, notice_id);
CREATE UNIQUE INDEX IF NOT EXISTS notice_dismissals_notice_id_user_id_key ON public.notice_dismissals USING btree (notice_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notices_published ON public.notices USING btree (published, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_published_created ON public.notices USING btree (published, created_at DESC) WHERE (published = true);
CREATE INDEX IF NOT EXISTS notices_target_user_ids_gin ON public.notices USING gin (target_user_ids);
CREATE INDEX IF NOT EXISTS idx_profiles_app_installed_at ON public.profiles USING btree (app_installed_at) WHERE (app_installed_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles USING btree (referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles USING btree (status) WHERE (status <> 'active'::user_status);
CREATE INDEX IF NOT EXISTS profiles_distributor_id_idx ON public.profiles USING btree (distributor_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles USING btree (referral_code);
CREATE INDEX IF NOT EXISTS profiles_telegram_chat_id_idx ON public.profiles USING btree (telegram_chat_id) WHERE (telegram_chat_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_connect_code_key ON public.profiles USING btree (telegram_connect_code) WHERE (telegram_connect_code IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_code_key ON public.profiles USING btree (user_code);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_key ON public.push_subscriptions USING btree (endpoint);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred ON public.referral_earnings USING btree (referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings USING btree (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_status_created_idx ON public.shop_orders USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_status_idx ON public.shop_orders USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_user_created_idx ON public.shop_orders USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_user_idx ON public.shop_orders USING btree (user_id);
CREATE INDEX IF NOT EXISTS shop_products_active_sort_idx ON public.shop_products USING btree (active, sort_order);
CREATE INDEX IF NOT EXISTS idx_spin_history_status ON public.spin_history USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spin_history_user_created ON public.spin_history USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spin_wheel_slices_active_sort ON public.spin_wheel_slices USING btree (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON public.support_messages USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_user_created_idx ON public.support_messages USING btree (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status_created ON public.task_submissions USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id ON public.task_submissions USING btree (task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_created ON public.task_submissions USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_created_active ON public.task_submissions USING btree (user_id, created_at DESC) WHERE (status <> 'rejected'::submission_status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_status ON public.task_submissions USING btree (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS task_submissions_user_id_task_id_key ON public.task_submissions USING btree (user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_active_user ON public.user_packages USING btree (user_id) WHERE (status = 'active'::package_status);
CREATE INDEX IF NOT EXISTS idx_user_packages_package_id ON public.user_packages USING btree (package_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status_expires ON public.user_packages USING btree (status, expires_at) WHERE (status = 'active'::package_status);
CREATE INDEX IF NOT EXISTS idx_user_packages_status_user ON public.user_packages USING btree (user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_packages_user_id ON public.user_packages USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user_id ON public.user_payment_methods USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles USING btree (role, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reviewed_by ON public.withdrawals USING btree (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON public.withdrawals USING btree (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals USING btree (user_id);


-- =========================================================================
-- SECTION 6: STORED PROCEDURES & DATABASE FUNCTIONS (58 FUNCTIONS)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_spin(p_spin_id uuid, p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_distributor(_actor uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_email text;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT email INTO v_email FROM public.distributors WHERE user_id = _user_id;
  IF v_email IS NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = _user_id;
  END IF;

  -- Detach referred users
  UPDATE public.profiles SET distributor_id = NULL WHERE distributor_id = _user_id;

  -- Purge distributor-owned data
  DELETE FROM public.distributor_withdrawals WHERE distributor_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.distributors WHERE user_id = _user_id;

  -- Purge related applications by email (approved/pending/rejected)
  IF v_email IS NOT NULL AND length(v_email) > 0 THEN
    DELETE FROM public.distributor_applications WHERE lower(email) = lower(v_email);
  END IF;

  -- Purge related public-schema personal data & profile
  DELETE FROM public.task_submissions WHERE user_id = _user_id;
  DELETE FROM public.withdrawals WHERE user_id = _user_id;
  DELETE FROM public.user_packages WHERE user_id = _user_id;
  DELETE FROM public.referral_earnings WHERE referrer_id = _user_id OR referred_user_id = _user_id;
  DELETE FROM public.community_messages WHERE user_id = _user_id;
  DELETE FROM public.user_payment_methods WHERE user_id = _user_id;
  DELETE FROM public.support_messages WHERE user_id = _user_id;
  DELETE FROM public.email_otps WHERE user_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_notice(_actor uuid, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  DELETE FROM public.notices WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'notice not found';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_package(_actor uuid, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.packages WHERE id = _id;
END;$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_user_data(_actor uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
    _prof RECORD;
    _pkg_amount numeric(14,2) := 0;
    _pkg_count integer := 0;
    _pkg_json jsonb := '[]'::jsonb;
    _task_count integer := 0;
    _task_reward numeric(14,2) := 0;
    _with_amount numeric(14,2) := 0;
    _with_count integer := 0;
    _with_json jsonb := '[]'::jsonb;
    _archive_id uuid;
BEGIN
    -- Authorization check
    IF NOT public.has_role(_actor, 'admin') THEN 
        RAISE EXCEPTION 'অননুমোদিত অ্যাক্সেস: শুধুমাত্র অ্যাডমিন ইউজার ডিলিট করতে পারবেন'; 
    END IF;
    IF _actor = _user_id THEN 
        RAISE EXCEPTION 'অ্যাডমিন নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না'; 
    END IF;

    -- 1) Gather existing profile info
    SELECT * INTO _prof FROM public.profiles WHERE id = _user_id;

    -- 2) Aggregate package info
    SELECT 
        COALESCE(SUM(COALESCE(p.price, 0)), 0),
        COUNT(*),
        COALESCE(jsonb_agg(jsonb_build_object(
            'package_id', up.package_id,
            'package_name', COALESCE(p.name, 'Default Package'),
            'price', COALESCE(p.price, 0),
            'status', up.status,
            'purchased_at', up.created_at,
            'payment_method', up.payment_method
        )), '[]'::jsonb)
    INTO _pkg_amount, _pkg_count, _pkg_json
    FROM public.user_packages up
    LEFT JOIN public.packages p ON p.id = up.package_id
    WHERE up.user_id = _user_id;

    -- 3) Aggregate task submissions
    SELECT 
        COUNT(*),
        COALESCE(SUM(COALESCE(reward_credited, 0)), 0)
    INTO _task_count, _task_reward
    FROM public.task_submissions
    WHERE user_id = _user_id AND status = 'approved';

    -- 4) Aggregate withdrawals
    SELECT 
        COALESCE(SUM(COALESCE(amount, 0)), 0),
        COUNT(*),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'amount', amount,
            'method', method,
            'account_number', account_number,
            'status', status,
            'created_at', created_at
        )), '[]'::jsonb)
    INTO _with_amount, _with_count, _with_json
    FROM public.withdrawals
    WHERE user_id = _user_id AND status = 'approved';

    -- 5) Archive this user's data before purge
    INSERT INTO public.deleted_users_archive (
        original_user_id,
        full_name,
        phone,
        email,
        user_code,
        referral_code,
        payment_method,
        payment_number,
        registered_at,
        deleted_at,
        deleted_by,
        total_packages_amount,
        packages_count,
        packages_details,
        tasks_completed_count,
        total_tasks_reward,
        total_withdrawn_amount,
        withdrawals_count,
        withdrawals_details,
        balance_at_deletion,
        locked_balance_at_deletion,
        lifetime_earned,
        archive_notes
    ) VALUES (
        _user_id,
        COALESCE(_prof.full_name, 'Unknown User'),
        COALESCE(_prof.phone, ''),
        COALESCE(_prof.email, ''),
        COALESCE(_prof.user_code, ''),
        COALESCE(_prof.referral_code, ''),
        COALESCE(_prof.payment_method::text, ''),
        COALESCE(_prof.payment_number, ''),
        _prof.created_at,
        now(),
        _actor,
        _pkg_amount,
        _pkg_count,
        _pkg_json,
        _task_count,
        _task_reward,
        _with_amount,
        _with_count,
        _with_json,
        COALESCE(_prof.balance, 0),
        COALESCE(_prof.locked_balance, 0),
        COALESCE(_prof.total_earned, 0),
        'Admin permanently deleted user and archived all financial history.'
    ) RETURNING id INTO _archive_id;

    -- 6) Clear foreign key references pointing to this user
    UPDATE public.profiles SET referred_by = NULL WHERE referred_by = _user_id;
    UPDATE public.profiles SET distributor_id = NULL WHERE distributor_id = _user_id;
    UPDATE public.distributors SET created_by = _actor WHERE created_by = _user_id;
    UPDATE public.distributor_applications SET reviewed_by = _actor WHERE reviewed_by = _user_id;
    UPDATE public.withdrawals SET reviewed_by = _actor WHERE reviewed_by = _user_id;
    UPDATE public.community_bans SET banned_by = _actor WHERE banned_by = _user_id;

    -- 7) Delete live activity and financial records
    DELETE FROM public.task_submissions WHERE user_id = _user_id;
    DELETE FROM public.withdrawals WHERE user_id = _user_id;
    DELETE FROM public.user_packages WHERE user_id = _user_id;
    DELETE FROM public.referral_earnings WHERE referrer_id = _user_id OR referred_user_id = _user_id;

    -- 8) Community, messages, and notifications
    DELETE FROM public.community_messages WHERE user_id = _user_id;
    DELETE FROM public.community_bans WHERE user_id = _user_id;
    DELETE FROM public.support_messages WHERE user_id = _user_id;

    -- 9) Preferences, tokens, logs
    DELETE FROM public.user_payment_methods WHERE user_id = _user_id;
    DELETE FROM public.notice_dismissals WHERE user_id = _user_id;
    DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
    DELETE FROM public.email_otps WHERE user_id = _user_id;
    DELETE FROM public.activity_logs WHERE user_id = _user_id;

    -- 10) Distributor tables
    DELETE FROM public.distributor_earnings WHERE distributor_id = _user_id OR related_user_id = _user_id;
    DELETE FROM public.distributor_withdrawals WHERE distributor_id = _user_id;
    DELETE FROM public.distributor_package_orders WHERE distributor_id = _user_id;
    DELETE FROM public.distributor_tasks WHERE distributor_id = _user_id;
    DELETE FROM public.distributor_leads WHERE distributor_id = _user_id;
    IF _prof.email IS NOT NULL AND _prof.email <> '' THEN
      DELETE FROM public.distributor_applications WHERE email = _prof.email;
    END IF;
    IF _prof.phone IS NOT NULL AND _prof.phone <> '' THEN
      DELETE FROM public.distributor_applications WHERE phone = _prof.phone;
    END IF;
    DELETE FROM public.distributors WHERE user_id = _user_id;

    -- 11) Shop orders
    DELETE FROM public.shop_orders WHERE user_id = _user_id;

    -- 12) Roles and Profile
    DELETE FROM public.user_roles WHERE user_id = _user_id;
    DELETE FROM public.profiles WHERE id = _user_id;

    -- 13) Permanently delete from auth.users (guaranteed to remove authentication identity)
    DELETE FROM auth.users WHERE id = _user_id;

    RETURN jsonb_build_object(
        'success', true,
        'archive_id', _archive_id,
        'user_id', _user_id,
        'message', 'ইউজার সফলভাবে সম্পূর্ণ সিস্টেম থেকে মুছে ফেলা হয়েছে এবং সমস্ত হিসাব আর্কাইভে সংরক্ষণ করা হয়েছে।'
    );
END;$function$;

CREATE OR REPLACE FUNCTION public.admin_distributor_bundle(_actor uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_distributor jsonb;
  v_profile jsonb;
  v_stats jsonb;
  v_users jsonb;
  v_activity jsonb;
  v_user_activity jsonb;
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT to_jsonb(d) INTO v_distributor FROM public.distributors d WHERE d.user_id = _user_id;
  SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = _user_id;

  SELECT public.distributor_stats(_user_id) INTO v_stats;

  SELECT COALESCE(jsonb_agg(row_to_json(u) ORDER BY u.created_at DESC), '[]'::jsonb) INTO v_users
  FROM (
    SELECT p.id, p.full_name, p.email, p.phone, p.user_code, p.balance, p.total_earned,
           p.status, p.created_at,
           EXISTS(SELECT 1 FROM public.user_packages up WHERE up.user_id = p.id AND up.status='active') AS has_active_package
    FROM public.profiles p
    WHERE p.distributor_id = _user_id
    ORDER BY p.created_at DESC
    LIMIT 500
  ) u;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_activity
  FROM (
    SELECT id, event_type, meta, ip, user_agent, created_at
    FROM public.activity_logs
    WHERE user_id = _user_id AND created_at >= v_day_start
    ORDER BY created_at DESC
    LIMIT 200
  ) a;

  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_user_activity
  FROM (
    SELECT al.id, al.user_id, al.event_type, al.meta, al.created_at,
           p.full_name AS actor_name, p.user_code AS actor_code
    FROM public.activity_logs al
    JOIN public.profiles p ON p.id = al.user_id
    WHERE p.distributor_id = _user_id AND al.created_at >= v_day_start
    ORDER BY al.created_at DESC
    LIMIT 200
  ) a;

  RETURN jsonb_build_object(
    'distributor', v_distributor,
    'profile', v_profile,
    'stats', v_stats,
    'users', v_users,
    'activity', v_activity,
    'user_activity', v_user_activity
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_spin(p_spin_id uuid, p_admin_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_distributor_package_order(_actor uuid, _order_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS distributor_package_orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result public.distributor_package_orders;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'invalid action'; END IF;

  UPDATE public.distributor_package_orders
  SET status = CASE WHEN _action = 'approve' THEN 'active' ELSE 'rejected' END,
      rejection_reason = CASE WHEN _action = 'reject' THEN NULLIF(trim(_reason), '') ELSE NULL END,
      reviewed_by = _actor,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _order_id AND status = 'pending'
  RETURNING * INTO result;

  IF result.id IS NULL THEN RAISE EXCEPTION 'pending order not found'; END IF;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_distributor_withdrawal(_actor uuid, _id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.distributor_withdrawals;
  v_bal numeric;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.distributor_withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'already_reviewed'; END IF;

  IF _action = 'approve' THEN
    SELECT balance INTO v_bal FROM public.distributors WHERE user_id = v_row.distributor_id FOR UPDATE;
    IF COALESCE(v_bal,0) < v_row.amount THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;
    UPDATE public.distributors
      SET balance = balance - v_row.amount
      WHERE user_id = v_row.distributor_id;
    UPDATE public.distributor_withdrawals
      SET status = 'approved',
          reviewed_by = _actor,
          reviewed_at = now(),
          rejection_reason = NULL
      WHERE id = _id;
  ELSIF _action = 'reject' THEN
    UPDATE public.distributor_withdrawals
      SET status = 'rejected',
          reviewed_by = _actor,
          reviewed_at = now(),
          rejection_reason = COALESCE(NULLIF(trim(_reason), ''), 'Rejected by admin')
      WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_user_package(_actor_user_id uuid, _order_id uuid, _action text, _reason text DEFAULT NULL::text)
 RETURNS user_packages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.user_packages;
  v_dur int;
BEGIN
  IF NOT public.has_role(_actor_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT * INTO v_row FROM public.user_packages WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;

  IF _action = 'approve' THEN
    IF v_row.trx_id IS NULL OR length(v_row.trx_id) < 6 THEN
      RAISE EXCEPTION 'trx_id required to approve';
    END IF;
    SELECT duration_days INTO v_dur FROM public.packages WHERE id = v_row.package_id;
    UPDATE public.user_packages
      SET status = 'active',
          purchased_at = now(),
          activated_at = now(),
          reviewed_at = now(),
          expires_at = now() + (COALESCE(v_dur, 30) || ' days')::interval,
          rejection_reason = NULL
      WHERE id = _order_id
      RETURNING * INTO v_row;
  ELSIF _action = 'reject' THEN
    IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
      RAISE EXCEPTION 'rejection reason required (min 3 chars)';
    END IF;
    UPDATE public.user_packages
      SET status = 'rejected',
          rejection_reason = trim(_reason),
          reviewed_at = now()
      WHERE id = _order_id
      RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_actor uuid, _id uuid, _action text, _note text DEFAULT NULL::text)
 RETURNS withdrawals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.withdrawals;
  v_bal numeric;
  v_debit numeric;
  v_dist uuid;
  v_tax numeric;
  v_net numeric;
  v_actor_is_distributor boolean;
  v_actor_is_admin boolean;
BEGIN
  v_actor_is_admin := public.has_role(_actor,'admin');
  v_actor_is_distributor := public.distributor_can_manage_withdrawals(_actor);

  IF NOT (v_actor_is_admin OR v_actor_is_distributor) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_row FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'withdrawal not found'; END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'withdrawal already reviewed (status: %)', v_row.status;
  END IF;

  IF _action = 'approve' THEN
    SELECT COALESCE(balance, 0) INTO v_bal FROM public.profiles WHERE id = v_row.user_id FOR UPDATE;
    v_debit := COALESCE(v_row.gross_amount, v_row.amount, 0);
    IF v_bal < v_debit THEN
      RAISE EXCEPTION 'insufficient balance (available: %, requested: %)', v_bal, v_debit;
    END IF;

    UPDATE public.profiles
      SET balance = GREATEST(COALESCE(balance, 0) - v_debit, 0)
      WHERE id = v_row.user_id;

    UPDATE public.withdrawals
      SET status = 'approved', note = _note, reviewed_by = _actor, reviewed_at = now()
      WHERE id = _id
      RETURNING * INTO v_row;

    v_tax := COALESCE(v_row.fee, 0);
    v_net := COALESCE(v_row.amount, 0);

    IF v_actor_is_distributor AND NOT v_actor_is_admin THEN
      -- Distributor approved: credit them the full gross (fee + net payout)
      IF v_tax > 0 THEN
        INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
        VALUES (_actor, 'withdrawal_tax', v_tax, v_row.user_id, v_row.id);
      END IF;
      IF v_net > 0 THEN
        INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
        VALUES (_actor, 'withdrawal_payout', v_net, v_row.user_id, v_row.id);
      END IF;
      IF (v_tax + v_net) > 0 THEN
        UPDATE public.distributors
          SET balance = COALESCE(balance,0) + v_tax + v_net,
              total_earned = COALESCE(total_earned,0) + v_tax + v_net,
              updated_at = now()
          WHERE user_id = _actor;
      END IF;
    ELSE
      -- Admin approved: only fee credited to user's assigned distributor (legacy behavior)
      SELECT distributor_id INTO v_dist FROM public.profiles WHERE id = v_row.user_id;
      IF v_dist IS NOT NULL AND v_tax > 0 THEN
        INSERT INTO public.distributor_earnings(distributor_id, source, amount, related_user_id, related_withdrawal_id)
        VALUES (v_dist, 'withdrawal_tax', v_tax, v_row.user_id, v_row.id);
        UPDATE public.distributors
          SET balance = COALESCE(balance,0) + v_tax,
              total_earned = COALESCE(total_earned,0) + v_tax,
              updated_at = now()
          WHERE user_id = v_dist;
      END IF;
    END IF;

  ELSIF _action = 'reject' THEN
    UPDATE public.withdrawals
      SET status = 'rejected', note = _note, rejection_reason = _note, reviewed_by = _actor, reviewed_at = now()
      WHERE id = _id
      RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid action: %', _action;
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_notice(_actor uuid, _id uuid, _patch jsonb)
 RETURNS notices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.notices;
  v_priority text;
  v_target_package_ids uuid[];
  v_target_user_ids uuid[];
  v_all boolean;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  v_priority := COALESCE(NULLIF(_patch->>'priority', ''), 'info');
  IF v_priority NOT IN ('info', 'warning', 'critical') THEN v_priority := 'info'; END IF;

  SELECT COALESCE(array_agg(value::uuid), '{}'::uuid[]) INTO v_target_package_ids
  FROM jsonb_array_elements_text(COALESCE(_patch->'target_package_ids', '[]'::jsonb)) AS value;

  SELECT COALESCE(array_agg(value::uuid), '{}'::uuid[]) INTO v_target_user_ids
  FROM jsonb_array_elements_text(COALESCE(_patch->'target_user_ids', '[]'::jsonb)) AS value;

  v_all := COALESCE((_patch->>'target_all_users')::boolean, false);

  IF COALESCE(NULLIF(trim(_patch->>'title'), ''), '') = '' THEN RAISE EXCEPTION 'Title is required'; END IF;
  IF COALESCE(NULLIF(trim(_patch->>'body'), ''), '') = '' THEN RAISE EXCEPTION 'Body is required'; END IF;

  IF _id IS NULL THEN
    INSERT INTO public.notices (
      title, body, priority, target_package_ids, target_user_ids,
      target_all_users, published, expires_at, created_by
    ) VALUES (
      trim(_patch->>'title'),
      trim(_patch->>'body'),
      v_priority,
      CASE WHEN v_all THEN '{}'::uuid[] ELSE v_target_package_ids END,
      CASE WHEN v_all THEN '{}'::uuid[] ELSE v_target_user_ids END,
      v_all,
      COALESCE((_patch->>'published')::boolean, true),
      NULLIF(_patch->>'expires_at', '')::timestamptz,
      _actor
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.notices SET
      title = trim(COALESCE(_patch->>'title', title)),
      body = trim(COALESCE(_patch->>'body', body)),
      priority = v_priority,
      target_package_ids = CASE WHEN COALESCE((_patch->>'target_all_users')::boolean, target_all_users) THEN '{}'::uuid[] ELSE v_target_package_ids END,
      target_user_ids = CASE WHEN COALESCE((_patch->>'target_all_users')::boolean, target_all_users) THEN '{}'::uuid[] ELSE v_target_user_ids END,
      target_all_users = COALESCE((_patch->>'target_all_users')::boolean, target_all_users),
      published = COALESCE((_patch->>'published')::boolean, published),
      expires_at = CASE WHEN _patch ? 'expires_at' THEN NULLIF(_patch->>'expires_at', '')::timestamptz ELSE expires_at END
    WHERE id = _id
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'notice not found'; END IF;
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_save_package(_actor uuid, _id uuid, _patch jsonb)
 RETURNS packages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_row public.packages;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _id IS NULL THEN
    INSERT INTO public.packages (name, price, daily_income, daily_tasks, duration_days, image_url, active, description, featured, sort_order)
    VALUES (
      _patch->>'name',
      COALESCE((_patch->>'price')::numeric,0),
      COALESCE((_patch->>'daily_income')::numeric,(_patch->>'daily_earning')::numeric,0),
      COALESCE((_patch->>'daily_tasks')::int,(_patch->>'daily_task_limit')::int,0),
      COALESCE((_patch->>'duration_days')::int,45),
      _patch->>'image_url',
      COALESCE((_patch->>'active')::boolean,true),
      _patch->>'description',
      COALESCE((_patch->>'featured')::boolean,false),
      COALESCE((_patch->>'sort_order')::int,0)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.packages SET
      name = COALESCE(_patch->>'name', name),
      price = COALESCE((_patch->>'price')::numeric, price),
      daily_income = COALESCE((_patch->>'daily_income')::numeric, (_patch->>'daily_earning')::numeric, daily_income),
      daily_tasks = COALESCE((_patch->>'daily_tasks')::int, (_patch->>'daily_task_limit')::int, daily_tasks),
      duration_days = COALESCE((_patch->>'duration_days')::int, duration_days),
      image_url = COALESCE(_patch->>'image_url', image_url),
      active = COALESCE((_patch->>'active')::boolean, active),
      description = COALESCE(_patch->>'description', description),
      featured = COALESCE((_patch->>'featured')::boolean, featured),
      sort_order = COALESCE((_patch->>'sort_order')::int, sort_order)
    WHERE id = _id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;$function$;

CREATE OR REPLACE FUNCTION public.admin_send_missed_task_notice(_actor uuid, _user_id uuid, _bd_date date)
 RETURNS notices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.notices;
  v_name text;
  v_title text;
  v_body text;
  v_expires timestamptz;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE id = _user_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  v_title := '⚠️ দৈনিক টাস্ক অসম্পূর্ণ — সতর্কতা';
  v_body := format(
    'প্রিয় %s,%s%sআপনি %s তারিখে আপনার দৈনিক টাস্ক সম্পূর্ণ করেননি। প্রতিদিন নির্ধারিত টাস্ক সম্পন্ন না করলে আপনার আয় এবং প্যাকেজের সুবিধা ক্ষতিগ্রস্ত হতে পারে।%s%sঅনুগ্রহ করে আজই লগইন করে বাকি টাস্ক সম্পন্ন করুন। ধন্যবাদ।',
    COALESCE(NULLIF(trim(v_name), ''), 'সদস্য'),
    E'\n', E'\n',
    to_char(COALESCE(_bd_date, (now() AT TIME ZONE 'Asia/Dhaka')::date), 'DD Mon YYYY'),
    E'\n', E'\n'
  );
  v_expires := now() + interval '3 days';

  INSERT INTO public.notices (
    title, body, priority, target_package_ids, target_user_ids,
    target_all_users, published, expires_at, created_by
  ) VALUES (
    v_title, v_body, 'warning',
    '{}'::uuid[], ARRAY[_user_id]::uuid[],
    false, true, v_expires, _actor
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(_actor uuid, _user_id uuid, _status user_status, _reason text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_row public.profiles;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET status = _status, suspend_reason = CASE WHEN _status='active' THEN NULL ELSE _reason END
    WHERE id = _user_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found'; END IF;
  RETURN v_row;
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_toggle_notice(_actor uuid, _id uuid, _published boolean)
 RETURNS notices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.notices;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  UPDATE public.notices
    SET published = _published
    WHERE id = _id
    RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'notice not found';
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_toggle_package(_actor uuid, _id uuid, _active boolean)
 RETURNS packages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_row public.packages;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.packages SET active = _active WHERE id = _id RETURNING * INTO v_row;
  RETURN v_row;
END;$function$;

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(_actor uuid, _user_id uuid, _patch jsonb)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(_patch->>'full_name', full_name),
    phone = COALESCE(_patch->>'phone', phone),
    email = COALESCE(_patch->>'email', email),
    avatar_url = COALESCE(_patch->>'avatar_url', avatar_url),
    status = COALESCE((_patch->>'status')::public.user_status, status),
    balance = CASE
      WHEN _patch ? 'balance' AND NULLIF(trim(_patch->>'balance'), '') IS NOT NULL
        THEN GREATEST((_patch->>'balance')::numeric, 0)
      ELSE balance
    END,
    locked_balance = CASE
      WHEN _patch ? 'locked_balance' AND NULLIF(trim(_patch->>'locked_balance'), '') IS NOT NULL
        THEN GREATEST((_patch->>'locked_balance')::numeric, 0)
      ELSE locked_balance
    END
  WHERE id = _user_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_upsert_distributor(_actor uuid, _user_id uuid, _patch jsonb)
 RETURNS distributors
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.distributors;
  v_pm public.payment_method;
  v_status text;
  v_has_balance boolean;
  v_has_locked boolean;
  v_has_cmw boolean;
BEGIN
  IF NOT public.has_role(_actor,'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  BEGIN
    v_pm := COALESCE((_patch->>'payment_method')::public.payment_method,'bkash');
  EXCEPTION WHEN others THEN
    v_pm := 'bkash';
  END;

  v_status := COALESCE(NULLIF(_patch->>'status', ''), 'active');
  v_has_balance := (_patch ? 'balance') AND (_patch->>'balance') IS NOT NULL AND (_patch->>'balance') <> '';
  v_has_locked  := (_patch ? 'locked_balance') AND (_patch->>'locked_balance') IS NOT NULL AND (_patch->>'locked_balance') <> '';
  v_has_cmw     := (_patch ? 'can_manage_withdrawals');

  INSERT INTO public.profiles (
    id, full_name, phone, email, payment_method, payment_number,
    user_code, referral_code, balance, locked_balance, total_earned
  ) VALUES (
    _user_id,
    COALESCE(_patch->>'full_name',''),
    NULLIF(_patch->>'phone',''),
    COALESCE(_patch->>'email',''),
    v_pm,
    COALESCE(NULLIF(_patch->>'payment_number',''),''),
    'SN-' || lpad(nextval('public.user_code_seq')::text, 6, '0'),
    upper(substr(md5(random()::text), 1, 8)),
    0, 0, 0
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    email = COALESCE(NULLIF(EXCLUDED.email,''), public.profiles.email),
    payment_method = COALESCE(EXCLUDED.payment_method, public.profiles.payment_method),
    payment_number = COALESCE(NULLIF(EXCLUDED.payment_number,''), public.profiles.payment_number),
    updated_at = now();

  INSERT INTO public.distributors (
    user_id, full_name, email, phone, payment_method, payment_number,
    district, thana, address, commission_rate, status, notes, created_by,
    balance, locked_balance, can_manage_withdrawals
  ) VALUES (
    _user_id,
    COALESCE(_patch->>'full_name',''),
    COALESCE(_patch->>'email',''),
    NULLIF(_patch->>'phone',''),
    v_pm,
    NULLIF(_patch->>'payment_number',''),
    NULLIF(_patch->>'district',''),
    NULLIF(_patch->>'thana',''),
    NULLIF(_patch->>'address',''),
    COALESCE((_patch->>'commission_rate')::numeric, 5),
    v_status,
    NULLIF(_patch->>'notes',''),
    _actor,
    CASE WHEN v_has_balance THEN (_patch->>'balance')::numeric ELSE 0 END,
    CASE WHEN v_has_locked  THEN (_patch->>'locked_balance')::numeric ELSE 0 END,
    CASE WHEN v_has_cmw THEN COALESCE((_patch->>'can_manage_withdrawals')::boolean, false) ELSE false END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), public.distributors.full_name),
    email = COALESCE(NULLIF(EXCLUDED.email,''), public.distributors.email),
    phone = COALESCE(EXCLUDED.phone, public.distributors.phone),
    payment_method = COALESCE(EXCLUDED.payment_method, public.distributors.payment_method),
    payment_number = COALESCE(EXCLUDED.payment_number, public.distributors.payment_number),
    district = COALESCE(EXCLUDED.district, public.distributors.district),
    thana = COALESCE(EXCLUDED.thana, public.distributors.thana),
    address = COALESCE(EXCLUDED.address, public.distributors.address),
    commission_rate = COALESCE(EXCLUDED.commission_rate, public.distributors.commission_rate),
    status = COALESCE(EXCLUDED.status, public.distributors.status),
    notes = COALESCE(EXCLUDED.notes, public.distributors.notes),
    balance = CASE WHEN v_has_balance THEN (_patch->>'balance')::numeric ELSE public.distributors.balance END,
    locked_balance = CASE WHEN v_has_locked THEN (_patch->>'locked_balance')::numeric ELSE public.distributors.locked_balance END,
    can_manage_withdrawals = CASE WHEN v_has_cmw THEN COALESCE((_patch->>'can_manage_withdrawals')::boolean, false) ELSE public.distributors.can_manage_withdrawals END,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'distributor')
    ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_user_withdraw_history(_actor uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_profile jsonb; v_history jsonb; v_stats jsonb;
BEGIN
  IF NOT (public.has_role(_actor,'admin')
          OR public.distributor_can_manage_withdrawals(_actor)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT to_jsonb(x) INTO v_profile FROM (
    SELECT id, full_name, phone, email, user_code, balance, locked_balance, total_earned, created_at, status
    FROM public.profiles WHERE id = _user_id
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(w) ORDER BY w.created_at DESC), '[]'::jsonb) INTO v_history FROM (
    SELECT id, amount, gross_amount, fee, balance_at_request, method, account_number, status, note, rejection_reason, created_at, reviewed_at
    FROM public.withdrawals WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 50
  ) w;

  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'approved_count', COUNT(*) FILTER (WHERE status IN ('approved','paid')),
    'approved_total', COALESCE(SUM(COALESCE(gross_amount, amount)) FILTER (WHERE status IN ('approved','paid')), 0),
    'rejected_count', COUNT(*) FILTER (WHERE status = 'rejected'),
    'pending_count',  COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO v_stats FROM public.withdrawals WHERE user_id = _user_id;

  RETURN jsonb_build_object('profile', v_profile, 'history', v_history, 'stats', v_stats);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_send_missed_task_notices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day_start timestamptz := (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
  v_day_end   timestamptz := v_day_start + interval '1 day';
  v_bd_date   date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  v_expires   timestamptz := now() + interval '18 hours';
  v_title     text := '⚠️ দৈনিক টাস্ক অসম্পূর্ণ — সতর্কতা';
  v_inserted  int := 0;
  r           record;
  v_body      text;
BEGIN
  FOR r IN
    SELECT DISTINCT p.id, COALESCE(NULLIF(trim(p.full_name), ''), 'সদস্য') AS full_name
    FROM public.profiles p
    JOIN public.user_packages up ON up.user_id = p.id AND up.status = 'active'
    WHERE COALESCE(p.status, 'active') = 'active'
      -- No task submission today (approved or pending — rejected doesn't count as an attempt)
      AND NOT EXISTS (
        SELECT 1 FROM public.task_submissions ts
        WHERE ts.user_id = p.id
          AND ts.status <> 'rejected'
          AND ts.created_at >= v_day_start
          AND ts.created_at <  v_day_end
      )
      -- Don't duplicate a notice already sent to this user today
      AND NOT EXISTS (
        SELECT 1 FROM public.notices n
        WHERE n.title = v_title
          AND n.created_at >= v_day_start
          AND p.id = ANY(n.target_user_ids)
      )
  LOOP
    v_body := format(
      'প্রিয় %s,%s%sআপনি %s তারিখে দুপুর ১২টার মধ্যে আপনার দৈনিক টাস্ক সম্পন্ন করেননি। প্রতিদিন নির্ধারিত টাস্ক সম্পন্ন না করলে আপনার আয় এবং প্যাকেজের সুবিধা ক্ষতিগ্রস্ত হতে পারে।%s%sঅনুগ্রহ করে আজই লগইন করে বাকি টাস্ক সম্পন্ন করুন। ধন্যবাদ।',
      r.full_name, E'\n', E'\n',
      to_char(v_bd_date, 'DD Mon YYYY'), E'\n', E'\n'
    );

    INSERT INTO public.notices (
      title, body, priority, target_package_ids, target_user_ids,
      target_all_users, published, expires_at, created_by
    ) VALUES (
      v_title, v_body, 'warning',
      '{}'::uuid[], ARRAY[r.id]::uuid[],
      false, true, v_expires, NULL
    );
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_link_tasks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff_date date := (now() AT TIME ZONE 'Asia/Dhaka')::date - INTERVAL '2 days';
  v_cutoff_ts   timestamptz := now() - INTERVAL '2 days';
  v_deleted     int := 0;
BEGIN
  WITH del AS (
    DELETE FROM public.link_tasks
    WHERE is_draft = false
      AND (
        (scheduled_date IS NOT NULL AND scheduled_date < v_cutoff_date)
        OR (scheduled_date IS NULL AND created_at < v_cutoff_ts)
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM del;
  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.credit_task_reward()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$;

CREATE OR REPLACE FUNCTION public.distributor_can_manage_withdrawals(_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.distributors
    WHERE user_id = _uid
      AND COALESCE(can_manage_withdrawals, false) = true
      AND COALESCE(status, 'active') = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.distributor_stats(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_users int := 0;
  v_active_packages int := 0;
  v_total_deposit numeric := 0;
  v_my_balance numeric := 0;
  v_my_locked numeric := 0;
  v_my_earned numeric := 0;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles WHERE distributor_id = _user_id;
  SELECT count(*) INTO v_active_packages FROM public.user_packages up
    JOIN public.profiles p ON p.id = up.user_id
    WHERE p.distributor_id = _user_id AND up.status='active';
  SELECT COALESCE(SUM(pk.price),0) INTO v_total_deposit FROM public.user_packages up
    JOIN public.packages pk ON pk.id = up.package_id
    JOIN public.profiles p ON p.id = up.user_id
    WHERE p.distributor_id = _user_id AND up.status='active';
  SELECT balance, locked_balance, total_earned
    INTO v_my_balance, v_my_locked, v_my_earned
    FROM public.distributors WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'active_packages', v_active_packages,
    'total_deposit', v_total_deposit,
    'balance', COALESCE(v_my_balance,0),
    'locked_balance', COALESCE(v_my_locked,0),
    'total_earned', COALESCE(v_my_earned,0)
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.distributor_withdrawal_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_bal numeric;
BEGIN
  SELECT balance INTO v_bal FROM public.distributors WHERE user_id = NEW.distributor_id;
  IF COALESCE(v_bal,0) < NEW.amount THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.enforce_daily_task_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.enforce_user_package_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dur int;
  v_price numeric;
BEGIN
  SELECT duration_days, price INTO v_dur, v_price FROM public.packages WHERE id = NEW.package_id;
  IF v_dur IS NULL THEN v_dur := 30; END IF;

  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + (v_dur || ' days')::interval;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(v_price, 0) <= 0 THEN
      NEW.status := 'active';
      NEW.purchased_at := COALESCE(NEW.purchased_at, now());
      NEW.activated_at := COALESCE(NEW.activated_at, now());
    ELSE
      NEW.status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_distributor_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'distributor'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.execute_user_spin(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.expire_user_packages()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.user_packages SET status='expired'
    WHERE status='active' AND expires_at IS NOT NULL AND expires_at < now();
$function$;

CREATE OR REPLACE FUNCTION public.fill_distributor_package_order_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p public.distributor_packages%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.distributor_packages WHERE id = NEW.package_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Distributor package is not available'; END IF;
  NEW.snapshot_package_name := p.name;
  NEW.snapshot_price := p.price;
  NEW.snapshot_monthly_salary := p.monthly_salary;
  NEW.snapshot_duration_label := p.duration_label;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fill_user_package_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.guard_link_task_daily_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref_code text;
  v_referrer uuid;
  v_pm public.payment_method;
  v_initial_balance numeric := 0;
  v_locked_balance numeric := 300;
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

  BEGIN
    IF NEW.raw_user_meta_data ? 'initial_balance' THEN
      v_initial_balance := GREATEST(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'initial_balance'), '')::numeric, 0), 0);
    END IF;
  EXCEPTION WHEN others THEN
    v_initial_balance := 0;
  END;

  BEGIN
    IF NEW.raw_user_meta_data ? 'locked_balance' THEN
      v_locked_balance := GREATEST(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'locked_balance'), '')::numeric, 300), 0);
    ELSIF NEW.raw_user_meta_data ? 'initial_locked_balance' THEN
      v_locked_balance := GREATEST(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'initial_locked_balance'), '')::numeric, 300), 0);
    END IF;
  EXCEPTION WHEN others THEN
    v_locked_balance := 300;
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
    v_initial_balance,
    v_locked_balance
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

CREATE OR REPLACE FUNCTION public.log_referral_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO public.activity_logs (user_id, event_type, meta)
    VALUES (
      NEW.referred_by,
      'referral_signup',
      jsonb_build_object(
        'referred_user_id', NEW.id,
        'referred_name', NEW.full_name,
        'user_code', NEW.user_code
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.maybe_cleanup_link_task()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.my_referred_friends()
 RETURNS TABLE(id uuid, full_name text, user_code text, created_at timestamp with time zone, has_active_package boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, p.user_code, p.created_at,
    EXISTS(SELECT 1 FROM public.user_packages up WHERE up.user_id = p.id AND up.status = 'active') AS has_active_package
  FROM public.profiles p
  WHERE p.referred_by = auth.uid()
  ORDER BY p.created_at DESC
  LIMIT 200;
$function$;

CREATE OR REPLACE FUNCTION public.notice_audience_count(_target_all_users boolean, _target_user_ids uuid[], _target_package_ids uuid[])
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _target_all_users THEN
      (SELECT COUNT(*)::int FROM public.profiles WHERE COALESCE(status,'active') = 'active')
    ELSE
      (
        SELECT COUNT(*)::int FROM (
          SELECT p.id FROM public.profiles p
          WHERE COALESCE(p.status,'active') = 'active'
            AND (
              (COALESCE(array_length(_target_user_ids,1),0) > 0 AND p.id = ANY(_target_user_ids))
              OR EXISTS (
                SELECT 1 FROM public.user_packages up
                WHERE up.user_id = p.id AND up.status = 'active'
                  AND up.package_id = ANY(COALESCE(_target_package_ids,'{}'::uuid[]))
              )
            )
          GROUP BY p.id
        ) x
      )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.notice_autodelete_if_all_dismissed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notice   public.notices;
  v_audience int;
  v_dismissed int;
BEGIN
  SELECT * INTO v_notice FROM public.notices WHERE id = NEW.notice_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NOT v_notice.published THEN RETURN NEW; END IF;

  v_audience := public.notice_audience_count(
    v_notice.target_all_users,
    v_notice.target_user_ids,
    v_notice.target_package_ids
  );
  IF COALESCE(v_audience, 0) <= 0 THEN RETURN NEW; END IF;

  SELECT COUNT(DISTINCT user_id)::int INTO v_dismissed
    FROM public.notice_dismissals WHERE notice_id = v_notice.id;

  IF v_dismissed >= v_audience THEN
    INSERT INTO public.notice_deletion_log (
      notice_id, title, body, priority,
      target_all_users, target_package_ids, target_user_ids,
      audience_count, dismissed_count, notice_created_at, reason
    ) VALUES (
      v_notice.id, v_notice.title, v_notice.body, v_notice.priority,
      v_notice.target_all_users, v_notice.target_package_ids, v_notice.target_user_ids,
      v_audience, v_dismissed, v_notice.created_at, 'all_recipients_dismissed'
    );
    DELETE FROM public.notice_dismissals WHERE notice_id = v_notice.id;
    DELETE FROM public.notices WHERE id = v_notice.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.package_active_user_count(_pkg uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(DISTINCT up.user_id)::int
  FROM public.user_packages up
  WHERE up.status = 'active'
    AND (_pkg IS NULL OR up.package_id = _pkg);
$function$;

CREATE OR REPLACE FUNCTION public.package_task_quota(_package_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT GREATEST(
    COALESCE((
      SELECT NULLIF(p.daily_tasks, 0)
      FROM public.packages p
      WHERE p.id = _package_id
      LIMIT 1
    ), 10),
    COALESCE((
      SELECT COUNT(*)::integer
      FROM public.link_tasks lt
      WHERE lt.required_package_id = _package_id
        AND lt.scheduled_date = ((now() AT TIME ZONE 'Asia/Dhaka')::date)
        AND lt.active = true
        AND COALESCE(lt.is_draft, false) = false
    ), 0)
  )::integer;
$function$;

CREATE OR REPLACE FUNCTION public.packages_active_user_counts()
 RETURNS TABLE(package_id uuid, active_users integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT up.package_id, COUNT(DISTINCT up.user_id)::int
  FROM public.user_packages up
  WHERE up.status = 'active'
  GROUP BY up.package_id;
$function$;

CREATE OR REPLACE FUNCTION public.pay_distributor_on_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_distributor uuid;
  v_rate numeric;
  v_price numeric;
  v_commission numeric;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT distributor_id INTO v_distributor FROM public.profiles WHERE id = NEW.user_id;
    IF v_distributor IS NULL THEN RETURN NEW; END IF;

    SELECT COALESCE(commission_rate, 7) INTO v_rate FROM public.distributors WHERE user_id = v_distributor;
    IF v_rate IS NULL THEN RETURN NEW; END IF;

    SELECT price INTO v_price FROM public.packages WHERE id = NEW.package_id;
    v_commission := ROUND(COALESCE(v_price, 0) * COALESCE(v_rate, 0) / 100.0, 2);
    IF v_commission <= 0 THEN RETURN NEW; END IF;

    -- Idempotency guard: don't double-credit if we already have an entry for this user_package
    IF EXISTS (
      SELECT 1 FROM public.distributor_earnings
      WHERE distributor_id = v_distributor
        AND source = 'package_commission'
        AND (meta->>'user_package_id') = NEW.id::text
    ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.distributor_earnings (distributor_id, source, amount, related_user_id, meta)
    VALUES (v_distributor, 'package_commission', v_commission, NEW.user_id,
      jsonb_build_object('user_package_id', NEW.id, 'package_id', NEW.package_id, 'package_price', v_price, 'commission_rate', v_rate));

    UPDATE public.distributors
      SET balance = COALESCE(balance,0) + v_commission,
          total_earned = COALESCE(total_earned,0) + v_commission,
          updated_at = now()
      WHERE user_id = v_distributor;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.pay_referral_on_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer uuid;
  v_price numeric;
  v_commission numeric;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = NEW.user_id;
    IF v_referrer IS NOT NULL THEN
      SELECT price INTO v_price FROM public.packages WHERE id = NEW.package_id;
      v_commission := ROUND(COALESCE(v_price, 0) * 0.05, 2);
      IF v_commission > 0 THEN
        INSERT INTO public.referral_earnings (referrer_id, referred_user_id, amount, source)
        VALUES (v_referrer, NEW.user_id, v_commission, 'package_activation');

        UPDATE public.profiles
          SET balance = balance + v_commission,
              total_earned = total_earned + v_commission
          WHERE id = v_referrer;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.profile_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow admins
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Allow updates coming from nested triggers (SECURITY DEFINER functions
  -- like credit_task_reward, pay_referral_on_activation). When those fire,
  -- pg_trigger_depth() > 1 inside this guard.
  IF pg_trigger_depth() > 1 THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.purge_old_activity_logs()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.activity_logs
   WHERE created_at < (date_trunc('day', (now() AT TIME ZONE 'Asia/Dhaka')) AT TIME ZONE 'Asia/Dhaka');
$function$;

CREATE OR REPLACE FUNCTION public.record_error_log(_level text, _message text, _source text, _context jsonb, _user_id uuid, _url text, _user_agent text, _fingerprint text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF _fingerprint IS NULL OR length(_fingerprint) = 0 THEN
    _fingerprint := md5(coalesce(_level,'') || '|' || coalesce(_source,'') || '|' || coalesce(_message,''));
  END IF;

  INSERT INTO public.error_logs (level, message, source, context, user_id, url, user_agent, fingerprint, last_seen_at)
  VALUES (coalesce(nullif(_level,''),'error'), left(coalesce(_message,''),4000), _source,
          coalesce(_context,'{}'::jsonb), _user_id, _url, left(coalesce(_user_agent,''),400), _fingerprint, now())
  ON CONFLICT (fingerprint) WHERE resolved = false
  DO UPDATE SET
    count = public.error_logs.count + 1,
    last_seen_at = now(),
    message = EXCLUDED.message,
    context = EXCLUDED.context,
    url = COALESCE(EXCLUDED.url, public.error_logs.url),
    user_id = COALESCE(EXCLUDED.user_id, public.error_logs.user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.submit_spin_deposit(p_spin_id uuid, p_method text, p_sender text, p_trx text, p_screenshot text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.telegram_chat_for_user(_user_id uuid)
 RETURNS TABLE(chat_id bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.telegram_chat_id
  FROM public.profiles p
  WHERE p.id = _user_id
    AND p.telegram_chat_id IS NOT NULL
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.telegram_connect_account(_code text, _chat_id bigint, _username text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles;
BEGIN
  IF _code IS NULL OR length(trim(_code)) < 6 THEN
    RAISE EXCEPTION 'invalid connect code';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE telegram_connect_code = trim(_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid connect code';
  END IF;

  UPDATE public.profiles
    SET telegram_chat_id = _chat_id,
        telegram_username = NULLIF(trim(COALESCE(_username, '')), ''),
        telegram_connected_at = now(),
        telegram_connect_code = NULL
    WHERE id = v_profile.id;

  RETURN QUERY SELECT v_profile.id, v_profile.full_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.telegram_find_account_by_chat(_chat_id bigint)
 RETURNS TABLE(full_name text, user_code text, balance numeric, locked_balance numeric, total_earned numeric, active_package text, package_expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.full_name,
    p.user_code,
    p.balance,
    p.locked_balance,
    p.total_earned,
    pkg.name AS active_package,
    up.expires_at AS package_expires_at
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT up.package_id, up.expires_at
    FROM public.user_packages up
    WHERE up.user_id = p.id AND up.status = 'active'
    ORDER BY up.activated_at DESC NULLS LAST, up.created_at DESC
    LIMIT 1
  ) up ON true
  LEFT JOIN public.packages pkg ON pkg.id = up.package_id
  WHERE p.telegram_chat_id = _chat_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.telegram_notice_recipients(_actor uuid, _target_all_users boolean, _target_package_ids uuid[] DEFAULT '{}'::uuid[], _target_user_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS TABLE(user_id uuid, chat_id bigint, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id, p.telegram_chat_id, p.full_name
  FROM public.profiles p
  WHERE public.has_role(_actor, 'admin'::public.app_role)
    AND p.telegram_chat_id IS NOT NULL
    AND (
      _target_all_users
      OR (COALESCE(array_length(_target_user_ids, 1), 0) > 0 AND p.id = ANY(_target_user_ids))
      OR EXISTS (
        SELECT 1 FROM public.user_packages up
        WHERE up.user_id = p.id AND up.status = 'active'
          AND up.package_id = ANY(COALESCE(_target_package_ids, '{}'::uuid[]))
      )
    )
  LIMIT 5000;
$function$;

CREATE OR REPLACE FUNCTION public.telegram_notice_recipients(_actor uuid, _target_all_users boolean, _target_package_ids uuid[] DEFAULT '{}'::uuid[])
 RETURNS TABLE(user_id uuid, chat_id bigint, full_name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id, p.telegram_chat_id, p.full_name
  FROM public.profiles p
  WHERE public.has_role(_actor, 'admin'::public.app_role)
    AND p.telegram_chat_id IS NOT NULL
    AND (
      _target_all_users
      OR EXISTS (
        SELECT 1
        FROM public.user_packages up
        WHERE up.user_id = p.id
          AND up.status = 'active'
          AND up.package_id = ANY(COALESCE(_target_package_ids, '{}'::uuid[]))
      )
    )
  LIMIT 5000;
$function$;

CREATE OR REPLACE FUNCTION public.withdrawals_snapshot_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  SELECT COALESCE(balance, 0) INTO NEW.balance_at_request
    FROM public.profiles
    WHERE id = NEW.user_id;

  NEW.balance_at_request := COALESCE(NEW.balance_at_request, 0);
  RETURN NEW;
END;
$function$;


-- =========================================================================
-- AUTH TRIGGER: AUTOMATIC PROFILE & ROLE CREATION ON SIGNUP
-- =========================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- =========================================================================
-- TABLE TRIGGERS
-- =========================================================================

DROP TRIGGER IF EXISTS trg_distributor_applications_updated ON public.distributor_applications;
CREATE TRIGGER trg_distributor_applications_updated
    BEFORE UPDATE ON public.distributor_applications
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_distributor_leads_updated_at ON public.distributor_leads;
CREATE TRIGGER trg_distributor_leads_updated_at
    BEFORE UPDATE ON public.distributor_leads
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS fill_distributor_package_order_snapshot_trigger ON public.distributor_package_orders;
CREATE TRIGGER fill_distributor_package_order_snapshot_trigger
    BEFORE INSERT ON public.distributor_package_orders
    FOR EACH ROW
    EXECUTE FUNCTION fill_distributor_package_order_snapshot();

DROP TRIGGER IF EXISTS set_distributor_package_orders_updated_at ON public.distributor_package_orders;
CREATE TRIGGER set_distributor_package_orders_updated_at
    BEFORE UPDATE ON public.distributor_package_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_distributor_packages_updated_at ON public.distributor_packages;
CREATE TRIGGER set_distributor_packages_updated_at
    BEFORE UPDATE ON public.distributor_packages
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS dw_check_balance ON public.distributor_withdrawals;
CREATE TRIGGER dw_check_balance
    BEFORE INSERT ON public.distributor_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION distributor_withdrawal_guard();

DROP TRIGGER IF EXISTS dw_set_updated_at ON public.distributor_withdrawals;
CREATE TRIGGER dw_set_updated_at
    BEFORE UPDATE ON public.distributor_withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS distributors_updated_at ON public.distributors;
CREATE TRIGGER distributors_updated_at
    BEFORE UPDATE ON public.distributors
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ensure_distributor_role ON public.distributors;
CREATE TRIGGER trg_ensure_distributor_role
    AFTER UPDATE ON public.distributors
    FOR EACH ROW
    EXECUTE FUNCTION ensure_distributor_role();

DROP TRIGGER IF EXISTS link_tasks_updated_at ON public.link_tasks;
CREATE TRIGGER link_tasks_updated_at
    BEFORE UPDATE ON public.link_tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notice_autodelete_if_all_dismissed ON public.notice_dismissals;
CREATE TRIGGER trg_notice_autodelete_if_all_dismissed
    AFTER INSERT ON public.notice_dismissals
    FOR EACH ROW
    EXECUTE FUNCTION notice_autodelete_if_all_dismissed();

DROP TRIGGER IF EXISTS trg_notices_updated_at ON public.notices;
CREATE TRIGGER trg_notices_updated_at
    BEFORE UPDATE ON public.notices
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS packages_updated_at ON public.packages;
CREATE TRIGGER packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS profile_guard_trg ON public.profiles;
CREATE TRIGGER profile_guard_trg
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION profile_guard();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_log_referral_signup ON public.profiles;
CREATE TRIGGER trg_log_referral_signup
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION log_referral_signup();

DROP TRIGGER IF EXISTS trg_shop_orders_updated_at ON public.shop_orders;
CREATE TRIGGER trg_shop_orders_updated_at
    BEFORE UPDATE ON public.shop_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_shop_products_updated_at ON public.shop_products;
CREATE TRIGGER trg_shop_products_updated_at
    BEFORE UPDATE ON public.shop_products
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS site_settings_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS credit_task_reward_trg ON public.task_submissions;
CREATE TRIGGER credit_task_reward_trg
    AFTER INSERT ON public.task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION credit_task_reward();

DROP TRIGGER IF EXISTS task_submissions_updated_at ON public.task_submissions;
CREATE TRIGGER task_submissions_updated_at
    BEFORE UPDATE ON public.task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_enforce_daily_task_limit ON public.task_submissions;
CREATE TRIGGER trg_enforce_daily_task_limit
    BEFORE INSERT ON public.task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION enforce_daily_task_limit();

DROP TRIGGER IF EXISTS trg_task_submissions_cleanup ON public.task_submissions;
CREATE TRIGGER trg_task_submissions_cleanup
    AFTER INSERT ON public.task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION maybe_cleanup_link_task();

DROP TRIGGER IF EXISTS trg_enforce_user_package_defaults ON public.user_packages;
CREATE TRIGGER trg_enforce_user_package_defaults
    BEFORE INSERT ON public.user_packages
    FOR EACH ROW
    EXECUTE FUNCTION enforce_user_package_defaults();

DROP TRIGGER IF EXISTS trg_fill_user_package_snapshot ON public.user_packages;
CREATE TRIGGER trg_fill_user_package_snapshot
    BEFORE INSERT ON public.user_packages
    FOR EACH ROW
    EXECUTE FUNCTION fill_user_package_snapshot();

DROP TRIGGER IF EXISTS trg_pay_distributor_on_activation ON public.user_packages;
CREATE TRIGGER trg_pay_distributor_on_activation
    AFTER INSERT ON public.user_packages
    FOR EACH ROW
    EXECUTE FUNCTION pay_distributor_on_activation();

DROP TRIGGER IF EXISTS trg_pay_referral_on_activation ON public.user_packages;
CREATE TRIGGER trg_pay_referral_on_activation
    AFTER INSERT ON public.user_packages
    FOR EACH ROW
    EXECUTE FUNCTION pay_referral_on_activation();

DROP TRIGGER IF EXISTS user_packages_updated_at ON public.user_packages;
CREATE TRIGGER user_packages_updated_at
    BEFORE UPDATE ON public.user_packages
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS user_payment_methods_updated_at ON public.user_payment_methods;
CREATE TRIGGER user_payment_methods_updated_at
    BEFORE UPDATE ON public.user_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS withdrawals_snapshot_balance ON public.withdrawals;
CREATE TRIGGER withdrawals_snapshot_balance
    BEFORE INSERT ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION withdrawals_snapshot_balance();

DROP TRIGGER IF EXISTS withdrawals_updated_at ON public.withdrawals;
CREATE TRIGGER withdrawals_updated_at
    BEFORE UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();


-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notice_deletion_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notice_dismissals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.link_tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_earnings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_package_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.distributor_withdrawals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.deleted_users_archive ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spin_wheel_slices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "admins read all activity" ON public.activity_logs;
CREATE POLICY "admins read all activity" ON public.activity_logs
    FOR SELECT
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "users insert own activity" ON public.activity_logs;
CREATE POLICY "users insert own activity" ON public.activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "users read own activity" ON public.activity_logs;
CREATE POLICY "users read own activity" ON public.activity_logs
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "admin manage communities" ON public.communities;
CREATE POLICY "admin manage communities" ON public.communities
    TO public
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "public read communities" ON public.communities;
CREATE POLICY "public read communities" ON public.communities
    FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "admin manage bans" ON public.community_bans;
CREATE POLICY "admin manage bans" ON public.community_bans
    TO public
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "self read bans" ON public.community_bans;
CREATE POLICY "self read bans" ON public.community_bans
    FOR SELECT
    TO authenticated
    USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "admins manage community" ON public.community_messages;
CREATE POLICY "admins manage community" ON public.community_messages
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth posts community" ON public.community_messages;
CREATE POLICY "auth posts community" ON public.community_messages
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "auth reads community" ON public.community_messages;
CREATE POLICY "auth reads community" ON public.community_messages
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "users delete own messages" ON public.community_messages;
CREATE POLICY "users delete own messages" ON public.community_messages
    FOR DELETE
    TO authenticated
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Admins can manage deleted users archive" ON public.deleted_users_archive;
CREATE POLICY "Admins can manage deleted users archive" ON public.deleted_users_archive
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view deleted users archive" ON public.deleted_users_archive;
CREATE POLICY "Admins can view deleted users archive" ON public.deleted_users_archive
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete applications" ON public.distributor_applications;
CREATE POLICY "Admins delete applications" ON public.distributor_applications
    FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update applications" ON public.distributor_applications;
CREATE POLICY "Admins update applications" ON public.distributor_applications
    FOR UPDATE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins view applications" ON public.distributor_applications;
CREATE POLICY "Admins view applications" ON public.distributor_applications
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit application" ON public.distributor_applications;
CREATE POLICY "Anyone can submit application" ON public.distributor_applications
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (((status = 'pending'::text) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL) AND (rejection_reason IS NULL)));

DROP POLICY IF EXISTS "distributor_earnings_admin_write" ON public.distributor_earnings;
CREATE POLICY "distributor_earnings_admin_write" ON public.distributor_earnings
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))
    WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "distributor_earnings_owner_read" ON public.distributor_earnings;
CREATE POLICY "distributor_earnings_owner_read" ON public.distributor_earnings
    FOR SELECT
    TO authenticated
    USING (((distributor_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));

DROP POLICY IF EXISTS "distributor_leads_owner" ON public.distributor_leads;
CREATE POLICY "distributor_leads_owner" ON public.distributor_leads
    TO authenticated
    USING (((distributor_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)))
    WITH CHECK (((distributor_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));

DROP POLICY IF EXISTS "Admins can review distributor package orders" ON public.distributor_package_orders;
CREATE POLICY "Admins can review distributor package orders" ON public.distributor_package_orders
    FOR UPDATE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Distributors can create own package orders" ON public.distributor_package_orders;
CREATE POLICY "Distributors can create own package orders" ON public.distributor_package_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (((distributor_id = auth.uid()) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM distributors d
  WHERE ((d.user_id = auth.uid()) AND (d.status = 'active'::text)))) AND (EXISTS ( SELECT 1
   FROM distributor_packages p
  WHERE ((p.id = distributor_package_orders.package_id) AND (p.active = true))))));

DROP POLICY IF EXISTS "Distributors can update own pending package orders" ON public.distributor_package_orders;
CREATE POLICY "Distributors can update own pending package orders" ON public.distributor_package_orders
    FOR UPDATE
    TO authenticated
    USING (((distributor_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'rejected'::text]))))
    WITH CHECK (((distributor_id = auth.uid()) AND (status = 'pending'::text)));

DROP POLICY IF EXISTS "Distributors can view own package orders" ON public.distributor_package_orders;
CREATE POLICY "Distributors can view own package orders" ON public.distributor_package_orders
    FOR SELECT
    TO authenticated
    USING (((distributor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "Admins can manage distributor packages" ON public.distributor_packages;
CREATE POLICY "Admins can manage distributor packages" ON public.distributor_packages
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can view active distributor packages" ON public.distributor_packages;
CREATE POLICY "Authenticated users can view active distributor packages" ON public.distributor_packages
    FOR SELECT
    TO authenticated
    USING (((active = true) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "distributor_tasks_owner" ON public.distributor_tasks;
CREATE POLICY "distributor_tasks_owner" ON public.distributor_tasks
    TO authenticated
    USING (((distributor_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)))
    WITH CHECK (((distributor_id = ( SELECT auth.uid() AS uid)) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));

DROP POLICY IF EXISTS "Admin manages withdrawals" ON public.distributor_withdrawals;
CREATE POLICY "Admin manages withdrawals" ON public.distributor_withdrawals
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Distributor creates own withdrawal" ON public.distributor_withdrawals;
CREATE POLICY "Distributor creates own withdrawal" ON public.distributor_withdrawals
    FOR INSERT
    TO authenticated
    WITH CHECK (((distributor_id = auth.uid()) AND has_role(auth.uid(), 'distributor'::app_role)));

DROP POLICY IF EXISTS "Distributor sees own withdrawals" ON public.distributor_withdrawals;
CREATE POLICY "Distributor sees own withdrawals" ON public.distributor_withdrawals
    FOR SELECT
    TO authenticated
    USING (((distributor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "distributors_admin_all" ON public.distributors;
CREATE POLICY "distributors_admin_all" ON public.distributors
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "distributors_select_own_or_admin" ON public.distributors;
CREATE POLICY "distributors_select_own_or_admin" ON public.distributors
    FOR SELECT
    TO authenticated
    USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "distributors_update_own_or_admin" ON public.distributors;
CREATE POLICY "distributors_update_own_or_admin" ON public.distributors
    FOR UPDATE
    TO authenticated
    USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)))
    WITH CHECK (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "own otps insert" ON public.email_otps;
CREATE POLICY "own otps insert" ON public.email_otps
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "own otps select" ON public.email_otps;
CREATE POLICY "own otps select" ON public.email_otps
    FOR SELECT
    TO authenticated
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "own otps update" ON public.email_otps;
CREATE POLICY "own otps update" ON public.email_otps
    FOR UPDATE
    TO authenticated
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "admin delete errors" ON public.error_logs;
CREATE POLICY "admin delete errors" ON public.error_logs
    FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin read errors" ON public.error_logs;
CREATE POLICY "admin read errors" ON public.error_logs
    FOR SELECT
    TO public
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin update errors" ON public.error_logs;
CREATE POLICY "admin update errors" ON public.error_logs
    FOR UPDATE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "service role inserts errors" ON public.error_logs;
CREATE POLICY "service role inserts errors" ON public.error_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

DROP POLICY IF EXISTS "admins manage tasks" ON public.link_tasks;
CREATE POLICY "admins manage tasks" ON public.link_tasks
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "auth users read active tasks" ON public.link_tasks;
CREATE POLICY "auth users read active tasks" ON public.link_tasks
    FOR SELECT
    TO public
    USING (((active = true) AND (is_draft = false) AND ((scheduled_date IS NULL) OR (scheduled_date <= ((now() AT TIME ZONE 'Asia/Dhaka'::text))::date))));

DROP POLICY IF EXISTS "distributors manage own link tasks" ON public.link_tasks;
CREATE POLICY "distributors manage own link tasks" ON public.link_tasks
    TO authenticated
    USING (((created_by_distributor = ( SELECT auth.uid() AS uid)) AND has_role(( SELECT auth.uid() AS uid), 'distributor'::app_role)))
    WITH CHECK (((created_by_distributor = ( SELECT auth.uid() AS uid)) AND has_role(( SELECT auth.uid() AS uid), 'distributor'::app_role)));

DROP POLICY IF EXISTS "distributors read package link tasks" ON public.link_tasks;
CREATE POLICY "distributors read package link tasks" ON public.link_tasks
    FOR SELECT
    TO authenticated
    USING ((has_role(( SELECT auth.uid() AS uid), 'distributor'::app_role) AND (required_package_id IS NOT NULL) AND ((created_by_distributor IS NULL) OR (created_by_distributor = ( SELECT auth.uid() AS uid)))));

DROP POLICY IF EXISTS "Admins can read notice deletion log" ON public.notice_deletion_log;
CREATE POLICY "Admins can read notice deletion log" ON public.notice_deletion_log
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users delete own dismissals" ON public.notice_dismissals;
CREATE POLICY "Users delete own dismissals" ON public.notice_dismissals
    FOR DELETE
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Users insert own dismissals" ON public.notice_dismissals;
CREATE POLICY "Users insert own dismissals" ON public.notice_dismissals
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users read own dismissals" ON public.notice_dismissals;
CREATE POLICY "Users read own dismissals" ON public.notice_dismissals
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "Admins delete notices" ON public.notices;
CREATE POLICY "Admins delete notices" ON public.notices
    FOR DELETE
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins insert notices" ON public.notices;
CREATE POLICY "Admins insert notices" ON public.notices
    FOR INSERT
    TO authenticated
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update notices" ON public.notices;
CREATE POLICY "Admins update notices" ON public.notices
    FOR UPDATE
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users read published notices" ON public.notices;
CREATE POLICY "Authenticated users read published notices" ON public.notices
    FOR SELECT
    TO authenticated
    USING (((published = true) OR has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)));

DROP POLICY IF EXISTS "admins manage packages" ON public.packages;
CREATE POLICY "admins manage packages" ON public.packages
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "anyone reads active packages" ON public.packages;
CREATE POLICY "anyone reads active packages" ON public.packages
    FOR SELECT
    TO anon, authenticated
    USING ((active = true));

DROP POLICY IF EXISTS "users read own owned package" ON public.packages;
CREATE POLICY "users read own owned package" ON public.packages
    FOR SELECT
    TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM user_packages up
  WHERE ((up.package_id = packages.id) AND (up.user_id = auth.uid()) AND (up.status = 'active'::package_status)))));

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "dist_manage_view_profiles" ON public.profiles;
CREATE POLICY "dist_manage_view_profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (distributor_can_manage_withdrawals(auth.uid()));

DROP POLICY IF EXISTS "distributors read assigned profiles" ON public.profiles;
CREATE POLICY "distributors read assigned profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (((distributor_id = ( SELECT auth.uid() AS uid)) AND has_role(( SELECT auth.uid() AS uid), 'distributor'::app_role)));

DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = id));

DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = id))
    WITH CHECK ((( SELECT auth.uid() AS uid) = id));

DROP POLICY IF EXISTS "admins read all push subs" ON public.push_subscriptions;
CREATE POLICY "admins read all push subs" ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "users manage own push subs" ON public.push_subscriptions;
CREATE POLICY "users manage own push subs" ON public.push_subscriptions
    TO authenticated
    USING ((user_id = auth.uid()))
    WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "admins read all referrals" ON public.referral_earnings;
CREATE POLICY "admins read all referrals" ON public.referral_earnings
    FOR SELECT
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "users read own referrals" ON public.referral_earnings;
CREATE POLICY "users read own referrals" ON public.referral_earnings
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = referrer_id));

DROP POLICY IF EXISTS "Admins can delete orders" ON public.shop_orders;
CREATE POLICY "Admins can delete orders" ON public.shop_orders
    FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update orders" ON public.shop_orders;
CREATE POLICY "Admins can update orders" ON public.shop_orders
    FOR UPDATE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can place a valid order" ON public.shop_orders;
CREATE POLICY "Anyone can place a valid order" ON public.shop_orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK ((((user_id IS NULL) OR (user_id = auth.uid())) AND ((length(btrim(customer_name)) >= 2) AND (length(btrim(customer_name)) <= 120)) AND ((length(btrim(phone)) >= 6) AND (length(btrim(phone)) <= 20)) AND (quantity > 0) AND (quantity <= 100) AND (unit_price >= (0)::numeric) AND (total_amount >= (0)::numeric) AND (status = 'new'::text) AND (payment_status = 'unpaid'::text) AND (payment_method = ANY (ARRAY['cod'::text, 'bkash'::text, 'nagad'::text, 'rocket'::text])) AND ((payment_method = 'cod'::text) OR ((sender_number IS NOT NULL) AND ((length(btrim(sender_number)) >= 6) AND (length(btrim(sender_number)) <= 20)) AND (trx_id IS NOT NULL) AND ((length(btrim(trx_id)) >= 4) AND (length(btrim(trx_id)) <= 40))))));

DROP POLICY IF EXISTS "Users can view their own orders" ON public.shop_orders;
CREATE POLICY "Users can view their own orders" ON public.shop_orders
    FOR SELECT
    TO authenticated
    USING (((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "validated order insert" ON public.shop_orders;
CREATE POLICY "validated order insert" ON public.shop_orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK ((((user_id IS NULL) OR (user_id = auth.uid())) AND (status = 'new'::text) AND (payment_status = 'unpaid'::text) AND (payment_method = ANY (ARRAY['cod'::text, 'bkash'::text, 'nagad'::text, 'rocket'::text])) AND ((length(btrim(customer_name)) >= 2) AND (length(btrim(customer_name)) <= 120)) AND ((length(btrim(phone)) >= 6) AND (length(btrim(phone)) <= 20)) AND ((quantity >= 1) AND (quantity <= 100)) AND (unit_price >= (0)::numeric) AND (total_amount >= (0)::numeric) AND ((payment_method = 'cod'::text) OR ((sender_number IS NOT NULL) AND ((length(btrim(sender_number)) >= 6) AND (length(btrim(sender_number)) <= 20)) AND (trx_id IS NOT NULL) AND ((length(btrim(trx_id)) >= 4) AND (length(btrim(trx_id)) <= 40))))));

DROP POLICY IF EXISTS "Admins can delete products" ON public.shop_products;
CREATE POLICY "Admins can delete products" ON public.shop_products
    FOR DELETE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert products" ON public.shop_products;
CREATE POLICY "Admins can insert products" ON public.shop_products
    FOR INSERT
    TO authenticated
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update products" ON public.shop_products;
CREATE POLICY "Admins can update products" ON public.shop_products
    FOR UPDATE
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view active products" ON public.shop_products;
CREATE POLICY "Anyone can view active products" ON public.shop_products
    FOR SELECT
    TO public
    USING (((active = true) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "admins manage site settings" ON public.site_settings;
CREATE POLICY "admins manage site settings" ON public.site_settings
    TO authenticated
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "authenticated read payment settings" ON public.site_settings;
CREATE POLICY "authenticated read payment settings" ON public.site_settings
    FOR SELECT
    TO authenticated
    USING ((key = ANY (ARRAY['payment_bkash'::text, 'payment_nagad'::text, 'payment_rocket'::text, 'dashboard_banner'::text])));

DROP POLICY IF EXISTS "public read allowlisted settings" ON public.site_settings;
CREATE POLICY "public read allowlisted settings" ON public.site_settings
    FOR SELECT
    TO anon, authenticated
    USING ((key = ANY (ARRAY['site'::text, 'payment_accounts'::text, 'package_launch'::text])));

DROP POLICY IF EXISTS "Admins can manage all spin history" ON public.spin_history;
CREATE POLICY "Admins can manage all spin history" ON public.spin_history
    TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

DROP POLICY IF EXISTS "Users can insert own spin history" ON public.spin_history;
CREATE POLICY "Users can insert own spin history" ON public.spin_history
    FOR INSERT
    TO authenticated
    WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own spin deposit" ON public.spin_history;
CREATE POLICY "Users can update own spin deposit" ON public.spin_history
    FOR UPDATE
    TO authenticated
    USING ((user_id = auth.uid()))
    WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own spin history" ON public.spin_history;
CREATE POLICY "Users can view own spin history" ON public.spin_history
    FOR SELECT
    TO authenticated
    USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage slices" ON public.spin_wheel_slices;
CREATE POLICY "Admins can manage slices" ON public.spin_wheel_slices
    TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));

DROP POLICY IF EXISTS "Anyone authenticated can view active slices" ON public.spin_wheel_slices;
CREATE POLICY "Anyone authenticated can view active slices" ON public.spin_wheel_slices
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "admin insert any" ON public.support_messages;
CREATE POLICY "admin insert any" ON public.support_messages
    FOR INSERT
    TO authenticated
    WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) AND (sender = 'admin'::text)));

DROP POLICY IF EXISTS "own or admin select" ON public.support_messages;
CREATE POLICY "own or admin select" ON public.support_messages
    FOR SELECT
    TO authenticated
    USING (((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));

DROP POLICY IF EXISTS "user insert own" ON public.support_messages;
CREATE POLICY "user insert own" ON public.support_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (((user_id = auth.uid()) AND (sender = 'user'::text)));

DROP POLICY IF EXISTS "admins manage submissions" ON public.task_submissions;
CREATE POLICY "admins manage submissions" ON public.task_submissions
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "distributors read assigned user submissions" ON public.task_submissions;
CREATE POLICY "distributors read assigned user submissions" ON public.task_submissions
    FOR SELECT
    TO authenticated
    USING ((has_role(( SELECT auth.uid() AS uid), 'distributor'::app_role) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = task_submissions.user_id) AND (p.distributor_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "users create own submissions" ON public.task_submissions;
CREATE POLICY "users create own submissions" ON public.task_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "users read own submissions" ON public.task_submissions;
CREATE POLICY "users read own submissions" ON public.task_submissions
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "admins manage user_packages" ON public.user_packages;
CREATE POLICY "admins manage user_packages" ON public.user_packages
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "distributors read assigned user packages" ON public.user_packages;
CREATE POLICY "distributors read assigned user packages" ON public.user_packages
    FOR SELECT
    TO authenticated
    USING ((has_role(( SELECT auth.uid() AS uid), 'distributor'::app_role) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = user_packages.user_id) AND (p.distributor_id = ( SELECT auth.uid() AS uid)))))));

DROP POLICY IF EXISTS "users create own package orders" ON public.user_packages;
CREATE POLICY "users create own package orders" ON public.user_packages
    FOR INSERT
    TO authenticated
    WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::package_status)));

DROP POLICY IF EXISTS "users read own packages" ON public.user_packages;
CREATE POLICY "users read own packages" ON public.user_packages
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "users update own pending order" ON public.user_packages;
CREATE POLICY "users update own pending order" ON public.user_packages
    FOR UPDATE
    TO authenticated
    USING (((( SELECT auth.uid() AS uid) = user_id) AND (status = ANY (ARRAY['pending'::package_status, 'rejected'::package_status]))))
    WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

DROP POLICY IF EXISTS "users manage own payment methods" ON public.user_payment_methods;
CREATE POLICY "users manage own payment methods" ON public.user_payment_methods
    TO authenticated
    USING ((auth.uid() = user_id))
    WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
    FOR SELECT
    TO authenticated
    USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "admins manage withdrawals" ON public.withdrawals;
CREATE POLICY "admins manage withdrawals" ON public.withdrawals
    TO authenticated
    USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

DROP POLICY IF EXISTS "dist_manage_view_withdrawals" ON public.withdrawals;
CREATE POLICY "dist_manage_view_withdrawals" ON public.withdrawals
    FOR SELECT
    TO authenticated
    USING (distributor_can_manage_withdrawals(auth.uid()));

DROP POLICY IF EXISTS "users create own withdrawals" ON public.withdrawals;
CREATE POLICY "users create own withdrawals" ON public.withdrawals
    FOR INSERT
    TO authenticated
    WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::withdrawal_status)));

DROP POLICY IF EXISTS "users read own withdrawals" ON public.withdrawals;
CREATE POLICY "users read own withdrawals" ON public.withdrawals
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = user_id));


-- =========================================================================
-- SECTION 7: STORAGE BUCKETS & STORAGE RLS POLICIES
-- =========================================================================

-- Insert Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, null, null),
    ('package-images', 'package-images', true, null, null),
    ('payment-logos', 'payment-logos', true, null, null),
    ('community-voice', 'community-voice', false, null, null),
    ('payment-screenshots', 'payment-screenshots', false, null, null)
ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public;

-- Note: RLS is already enabled by default on storage.objects in Supabase.
-- Attempting ALTER TABLE storage.objects requires supabase_storage_admin owner, so we omit that command.

-- Storage Policies: avatars
DROP POLICY IF EXISTS "read avatars" ON storage.objects;
CREATE POLICY "read avatars" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "user write own avatar" ON storage.objects;
CREATE POLICY "user write own avatar" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid())
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

-- Storage Policies: package-images
DROP POLICY IF EXISTS "read package images" ON storage.objects;
CREATE POLICY "read package images" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'package-images');

DROP POLICY IF EXISTS "admin write package images" ON storage.objects;
CREATE POLICY "admin write package images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'package-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'package-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies: payment-logos
DROP POLICY IF EXISTS "read payment logos" ON storage.objects;
CREATE POLICY "read payment logos" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'payment-logos');

DROP POLICY IF EXISTS "admin write payment logos" ON storage.objects;
CREATE POLICY "admin write payment logos" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies: community-voice
DROP POLICY IF EXISTS "auth read community voice" ON storage.objects;
CREATE POLICY "auth read community voice" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-voice');

DROP POLICY IF EXISTS "auth upload own community voice" ON storage.objects;
CREATE POLICY "auth upload own community voice" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-voice' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth delete own community voice" ON storage.objects;
CREATE POLICY "auth delete own community voice" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-voice' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage Policies: payment-screenshots
DROP POLICY IF EXISTS "user read own screenshots" ON storage.objects;
CREATE POLICY "user read own screenshots" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "user write own screenshots" ON storage.objects;
CREATE POLICY "user write own screenshots" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots' AND owner = auth.uid());

DROP POLICY IF EXISTS "admin delete screenshots" ON storage.objects;
CREATE POLICY "admin delete screenshots" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-screenshots' AND public.has_role(auth.uid(), 'admin'));



-- =========================================================================
-- SECTION 8: SEED DATA & INITIAL CONFIGURATION
-- =========================================================================

-- 1. Default Investment Packages
INSERT INTO public.packages (id, name, price, daily_tasks, daily_income, duration_days, description, active, sort_order, image_url, featured, is_legacy)
VALUES
    ('2845051f-acae-433b-9913-a32a2cd2924d', 'Premium Gold⭐⭐⭐', 999.00, 10, 500.00, 30, 'গোল্ড টায়ারে আপগ্রেড — দ্বিগুণ আয়ের সুযোগ।', true, 4, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1791326976076.webp?token=eyJraWQiOiJkMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc5MTMyNjk3NjA3Ni53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MTMyNjk3OCwiZXhwIjoxODIyODYyOTc4fQ.vMEQLZJbA5_RJs2maWwZsKBMFCg1GH9RVKed4lMPwYQ', false, true),
    ('dbbf9040-57f6-468f-8a8f-78998e7080b7', 'Premium ⭐⭐⭐⭐⭐', 1499.00, 10, 1000.00, 30, 'স্বপ্ন পূরণের প্যাকেজ — দৈনিক 1499 ৳ নিশ্চিত আয়।', true, 7, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1791326995164.webp?token=eyJraWQiOiJkMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc5MTMyNjk5NTE2NC53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MTMyNjk5NywiZXhwIjoxODIyODYyOTk3fQ.86U0DuznaVk9gARhox9iuPA811BR3YsSjnxqK3X97QQ', false, true),
    ('a13bd19c-efd2-4431-9bdd-391f7cec06f1', 'মেঘা গ্রোথ প্যাকেজ', 3000.00, 10, 300.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১০০৳ • মোট আয় ৬,০০০৳', true, 102, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786455176209.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NTE3NjIwOS53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NTE3OCwiZXhwIjoxODE3OTkxMTc4fQ.TvIZxQn9aixTjZcZKJqenO6vtQhSlSedndiUlaC3oWs', false, false),
    ('abc39f2e-8a63-435f-85fc-07671f8b74c8', 'গ্লোবাল এলিট প্যাকেজ', 35000.00, 10, 3500.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২,৩৫০৳ • মোট আয় ১,৪১,০০০৳', true, 110, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786457099333.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NzA5OTMzMy53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NzEwMCwiZXhwIjoxODE3OTkzMTAwfQ.dKNKCmwivJkGTnepLx7qcikQyR32asXHThbMDjZAahw', false, false),
    ('0b2cc3fa-0068-4d6e-9b4e-1bc63c78d212', 'আলটিমেট ভ্যালু প্যাকেজ', 5000.00, 10, 500.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১৫০৳ • মোট আয় ৯,০০০৳', true, 103, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1790427200977.webp?token=eyJraWQiOiJkMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc5MDQyNzIwMDk3Ny53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDQyNzIxNSwiZXhwIjoxODIxOTYzMjE1fQ.XPgamFpy2f6mfDicsel6EIcGMzIlmFtHnuDnunykJtg', false, false),
    ('7621e494-9ad2-46d8-8159-e770f351cd70', 'Premium ⭐⭐', 499.00, 10, 300.00, 30, 'শুরু করার জন্য পারফেক্ট — Like, Comment, Share করে দৈনিক আয় শুরু করুন।', true, 1, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1791326927196.webp?token=eyJraWQiOiJkMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc5MTMyNjkyNzE5Ni53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MTMyNjkyOSwiZXhwIjoxODIyODYyOTI5fQ.ZF95ipMKyN0X-T397aDNS6E34-lQfOuYEES2KIm1l7c', false, true),
    ('fe27935c-8b64-4bd8-8263-76cc9796a76e', 'প্লাটিনাম প্রো প্যাকেজ', 2000.00, 10, 200.00, 45, 'মেয়াদ 45 দিন • দৈনিক আয় 200৳ • মোট আয় 9000৳', true, 101, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1785515786377.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NTUxNTc4NjM3Ny53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NTUxNTc4OSwiZXhwIjoxODE3MDUxNzg5fQ.Q2xQDBQDmyuG-c7BDFPmgd20DOF1h71P5Wrjj77wTiY', false, false),
    ('7bf45788-d44e-462c-980d-2d98ce41d5cf', 'স্টার পাওয়ার প্যাকেজ', 20000.00, 10, 2000.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১,০০০৳ • মোট আয় ৬০,০০০৳', true, 107, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786456485679.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NjQ4NTY3OS53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NjQ4NywiZXhwIjoxODE3OTkyNDg3fQ.hb3doYPoNxAkfDuCWJheL_0A1Uw7lNY1jdTV-TOZrLI', false, false),
    ('f2cef09d-37c7-40a5-92c0-b5ad0d49a8c2', 'টাইটেনিয়াম টিয়ার প্যাকেজ', 15000.00, 10, 650.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ৫০০৳ • মোট আয় ৩০,০০০৳', true, 106, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786456387101.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NjM4NzEwMS53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NjM4OCwiZXhwIjoxODE3OTkyMzg4fQ.JCgW8fwxWDklqqDoYZql48dgytTV6JTig8de-zga3Vc', false, false),
    ('9d37f5a2-725b-49e5-9f79-7a1ed4c816f7', 'প্রিমিয়ার এক্সেস ', 10000.00, 10, 1150.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ৩০০৳ • মোট আয় ১৮,০০০৳', true, 105, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786456138329.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NjEzODMyOS53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NjE0MSwiZXhwIjoxODE3OTkyMTQxfQ.z0bvU56fHcJUN-dCNednxo_w67vhDIlfHxLYCiON4MM', false, false),
    ('6d299007-5163-486b-b6b8-f4b7f551cc54', 'ইনফিনিটি প্যাকেজ', 25000.00, 10, 2500.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ১,৫০০৳ • মোট আয় ৯০,০০০৳', true, 108, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786456599860.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NjU5OTg2MC53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NjYwMCwiZXhwIjoxODE3OTkyNjAwfQ._KSYWbuszp8ooCUOh8Vry7VyuddscRmZMWjIdFtNsz8', false, false),
    ('53dcd38f-860a-41ee-9a2a-4bb97ce64d5c', 'এলিট প্ল্যান প্যাকেজ', 7500.00, 10, 750.00, 60, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২০০৳ • মোট আয় ১২,০০০৳', true, 104, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1790427235328.webp?token=eyJraWQiOiJkMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc5MDQyNzIzNTMyOC53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDQyNzI2MywiZXhwIjoxODIxOTYzMjYzfQ.72cDyJMpn8cJabXxagldWydbtJHZbD_V7NzpHhE_Bv4', false, false),
    ('71caf3a1-00e7-47b2-bde0-89cacaea4d80', 'ইউনাইটেড প্যাকেজ', 1000.00, 10, 100.00, 45, 'সর্বনিম্ন প্যাকেজ — দৈনিক ১০টি টাস্কে 100টাকা আয়, ৬০ দিনে মোট ১৫০০ টাকা।', true, 100, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1790343235779.webp?token=eyJraWQiOiJkMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc5MDM0MzIzNTc3OS53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc5MDM0MzIzNywiZXhwIjoxODIxODc5MjM3fQ.1WYrXBb_3ytWeZHzI0BgZqi-lcgFByKKLZsbq1q6IU4', false, false),
    ('90f44615-50a8-45cc-aaa1-ce45800fd41a', 'আলফা চয়েস প্যাকেজ', 30000.00, 10, 3000.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২,০০০৳ • মোট আয় ১,২০,০০০৳', true, 109, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786457083593.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NzA4MzU5My53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NzA4NywiZXhwIjoxODE3OTkzMDg3fQ.glxMmnKxRBUrU5wRkQK8W02qugh6fCGZu4nL1UsYB8g', false, false),
    ('0dffa2b8-7760-45f1-9cd5-8322d4aa883f', 'ক্রাউন এলিট প্যাকেজ', 50000.00, 10, 5000.00, 45, 'মেয়াদ ৬০ দিন • দৈনিক আয় ২,৮৫০৳ • মোট আয় ১,৭১,০০০৳', true, 111, 'https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/package-images/pkg-1786457493477.webp?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYWNrYWdlLWltYWdlcy9wa2ctMTc4NjQ1NzQ5MzQ3Ny53ZWJwIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NjQ1NzQ5NiwiZXhwIjoxODE3OTkzNDk2fQ.U6ygmmmpTpsaULoS3rbPkksqJfQXT8Elw-Cxez3GhHg', false, false)
ON CONFLICT (id) DO NOTHING;


-- 2. Lucky Spin Wheel Slices (24h Lucky Spin with 50% Deposit Claim)
INSERT INTO public.spin_wheel_slices (id, label, amount, color, text_color, weight, is_active, sort_order)
VALUES
    ('5a3d42e7-b3d2-4173-93ce-1631e831396a', '50', 50, '#E11D48', '#FFFFFF', 10, true, 1),
    ('943b1e22-643b-46d0-9ea9-aa3c7b183277', '৳100', 100, '#9333EA', '#FFFFFF', 100, true, 2),
    ('eecb6e17-5e57-472b-a501-77376cf04662', '200', 200, '#2563EB', '#FFFFFF', 20, true, 3),
    ('0735e5d9-ab95-4090-8752-62ab6742b8f5', '300', 300, '#0D9488', '#FFFFFF', 25, true, 4),
    ('9f2c0cd0-aaf6-47a6-89f7-88bb60727d42', '400', 400, '#EA580C', '#FFFFFF', 30, true, 5),
    ('1fceb51f-8b74-4485-84a7-be812708ded6', '৳500', 500, '#16A34A', '#FFFFFF', 40, true, 6),
    ('530a4078-ec9b-4423-9898-204e803de300', '600', 600, '#06B6D4', '#FFFFFF', 25, true, 7),
    ('822311a8-a6aa-4d75-bb04-a5bbe1e0b211', '৳700', 700, '#DC2626', '#FFFFFF', 45, true, 8),
    ('4db41f39-d519-4352-8cd9-8d8ed5953a37', '৳8000', 8000, '#8B5CF6', '#FFFFFF', 99, true, 9),
    ('56864b3d-676d-4196-81e7-e8e21c67146a', '৳900', 900, '#F59E0B', '#FFFFFF', 15, true, 10),
    ('16d4751e-cb54-4b1b-8e06-8fe828c68acd', '৳1000', 1000, '#EC4899', '#FFFFFF', 20, true, 11)
ON CONFLICT (id) DO NOTHING;


-- 3. Site Settings
INSERT INTO public.site_settings (key, value)
VALUES
    ('payment_numbers', '{"bkash":"01700000000","nagad":"01700000000","rocket":"01700000000"}'::jsonb),
    ('payment_nagad', '{"type":"personal","active":true,"number":"","logo_url":"https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/payment-logos/nagad-1782795238001.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXltZW50LWxvZ29zL25hZ2FkLTE3ODI3OTUyMzgwMDEucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4Mjc5NTIzOCwiZXhwIjoxODE0MzMxMjM4fQ.UwDAgAf6RsO2AB3VIGi_alwSQ07ZJUdrAggz7p-teNw","instructions":""}'::jsonb),
    ('payment_rocket', '{"type":"personal","active":true,"number":"","logo_url":"https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/payment-logos/rocket-1782795250365.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXltZW50LWxvZ29zL3JvY2tldC0xNzgyNzk1MjUwMzY1LnBuZyIsInNjb3BlIjoiZG93bmxvYWQiLCJpYXQiOjE3ODI3OTUyNTAsImV4cCI6MTgxNDMzMTI1MH0.ZGwxiG_ymEkLm7K3BaxUZ5uebMIN58bQvQocJKUgBrY","instructions":""}'::jsonb),
    ('dashboard_banner', '{"title":"স্বাগতম Smart Click BD-এ!","enabled":true,"message":"প্রতিদিন লাইক-কমেন্ট করে আয় করুন।","variant":"amber"}'::jsonb),
    ('payment_accounts', '{"bkash":"01700000000","logos":{"bkash":"","nagad":"","rocket":""},"nagad":"01800000000","guides":{"bkash":"","nagad":"","rocket":""},"rocket":"01900000000","instructions":"Send Money করুন, Cash Out নয়","system_logo_url":"/logo.png"}'::jsonb),
    ('site', '{"tagline":"স্মার্ট ক্লিক বিডি","cta_link":"/register","cta_text":"এখনই শুরু করুন","logo_url":"/logo.png","site_name":"Smart Click BD","hero_title":"লাইক কমেন্ট করে ইনকাম","favicon_url":"","bonus_locked":true,"signup_bonus":150,"hero_subtitle":"বিশ্বস্ত বাংলাদেশী প্ল্যাটফর্ম","referral_commission":15}'::jsonb),
    ('package_launch', '{"launched":true}'::jsonb),
    ('payment_bkash', '{"type":"personal","active":true,"number":"01336701811","logo_url":"https://gpyarcrizvjyukaazndj.supabase.co/storage/v1/object/sign/payment-logos/bkash-1782795218157.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kMDdhNGJjMi1jNzgxLTQzYTItOGI3Yi04MGNiZDExYzJhYTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwYXltZW50LWxvZ29zL2JrYXNoLTE3ODI3OTUyMTgxNTcucG5nIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4Mjc5NTIxOCwiZXhwIjoxODE0MzMxMjE4fQ._zXgX3n5BYTcDe5LGCxSFcVy9XC_zQyKAQy8EP1It-g","agent_number":"","instructions":"প্রিয় গ্রাহক, নিচের বিকাশ পার্সোনাল নম্বর-এ সেন্ড মানি সম্পন্ন করুন:\n• বিকাশ পার্সোনাল নম্বর: 01628114111\n• বিকাশ অ্যাপ খুলুন → \"Send Money\" অপশন সিলেক্ট করুন → উপরের নম্বরটি দিন → প্যাকেজের সঠিক পরিমাণ টাকা পাঠান।\n• পেমেন্ট শেষে প্রাপ্ত TrxID এবং যেই নম্বর থেকে পাঠিয়েছেন সেটি ফর্মে সঠিকভাবে দিন।\n• ভুল/কম টাকা পাঠালে অর্ডার রিজেক্ট হবে — অনুগ্রহ করে সাবধানে যাচাই করুন।"}'::jsonb),
    ('auto_task_last_run', '{"date":"2026-10-26","ran_at":"2026-10-25T20:00:03.989Z","packages":[{"quota":10,"created":10,"existing":0,"package_id":"2845051f-acae-433b-9913-a32a2cd2924d","reward_each":50,"active_users":1,"package_name":"Premium Gold⭐⭐⭐"},{"quota":10,"created":10,"existing":0,"package_id":"a13bd19c-efd2-4431-9bdd-391f7cec06f1","reward_each":30,"active_users":2,"package_name":"মেঘা গ্রোথ প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"0b2cc3fa-0068-4d6e-9b4e-1bc63c78d212","reward_each":50,"active_users":1,"package_name":"আলটিমেট ভ্যালু প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"7621e494-9ad2-46d8-8159-e770f351cd70","reward_each":30,"active_users":1,"package_name":"Premium ⭐⭐"},{"quota":10,"created":10,"existing":0,"package_id":"fe27935c-8b64-4bd8-8263-76cc9796a76e","reward_each":20,"active_users":2,"package_name":"প্লাটিনাম প্রো প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"f2cef09d-37c7-40a5-92c0-b5ad0d49a8c2","reward_each":65,"active_users":2,"package_name":"টাইটেনিয়াম টিয়ার প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"9d37f5a2-725b-49e5-9f79-7a1ed4c816f7","reward_each":115,"active_users":2,"package_name":"প্রিমিয়ার এক্সেস "},{"quota":10,"created":10,"existing":0,"package_id":"6d299007-5163-486b-b6b8-f4b7f551cc54","reward_each":250,"active_users":1,"package_name":"ইনফিনিটি প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"53dcd38f-860a-41ee-9a2a-4bb97ce64d5c","reward_each":75,"active_users":2,"package_name":"এলিট প্ল্যান প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"71caf3a1-00e7-47b2-bde0-89cacaea4d80","reward_each":10,"active_users":5,"package_name":"ইউনাইটেড প্যাকেজ"},{"quota":10,"created":10,"existing":0,"package_id":"90f44615-50a8-45cc-aaa1-ce45800fd41a","reward_each":300,"active_users":1,"package_name":"আলফা চয়েস প্যাকেজ"}],"total_created":110}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;




-- =========================================================================
-- SECTION 9: REALTIME PUBLICATIONS
-- =========================================================================

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_packages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.link_tasks;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_earnings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.distributors;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.distributor_applications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_ad_views;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;



-- =========================================================================
-- SECTION 10: DESIGNATED SUPER ADMIN ROLE SETUP
-- =========================================================================
-- Automatically assigns 'admin' and 'user' roles to smartclickbd@gmail.com if already registered in auth.users

DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'smartclickbd@gmail.com' LIMIT 1;
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'user'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;



-- =========================================================================
-- SECTION 11: AD TASK REWARD & WITHDRAW VERIFICATION SYSTEM
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.user_ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0.20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_ad_views_user_date ON public.user_ad_views(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_ad_views_created_at ON public.user_ad_views(created_at DESC);

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

  SELECT value INTO v_settings FROM site_settings WHERE key = 'ad_settings';
  v_today_start := (timezone('Asia/Dhaka', now()))::date::timestamp AT TIME ZONE 'Asia/Dhaka';

  SELECT COUNT(*), COALESCE(SUM(reward_amount), 0), COUNT(DISTINCT user_id)
  INTO v_total_views, v_total_expense, v_total_users
  FROM user_ad_views;

  SELECT COUNT(*), COALESCE(SUM(reward_amount), 0), COUNT(DISTINCT user_id)
  INTO v_today_views, v_today_expense, v_today_users
  FROM user_ad_views
  WHERE created_at >= v_today_start;

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

  INSERT INTO public.site_settings (key, value, updated_at)
  VALUES ('ad_settings', _settings, now())
  ON CONFLICT (key) DO UPDATE
  SET value = _settings, updated_at = now();

  v_fee := COALESCE((_settings->>'verification_fee')::NUMERIC, NULL);
  IF v_fee IS NOT NULL AND v_fee >= 0 THEN
    UPDATE public.packages
    SET price = v_fee, updated_at = now()
    WHERE id = v_pkg_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
END;
$$;
