-- Migration: Create deleted_users_archive table and comprehensive atomic purge RPC
-- Archives all financial records, packages, tasks, and withdrawals before permanent deletion.

-- 1. Create deleted_users_archive table
CREATE TABLE IF NOT EXISTS public.deleted_users_archive (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id uuid NOT NULL,
    full_name text,
    phone text,
    email text,
    user_code text,
    referral_code text,
    payment_method text,
    payment_number text,
    registered_at timestamptz,
    deleted_at timestamptz NOT NULL DEFAULT now(),
    deleted_by uuid,
    
    -- Financial and Activity Archive Stats
    total_packages_amount numeric(14,2) NOT NULL DEFAULT 0,
    packages_count integer NOT NULL DEFAULT 0,
    packages_details jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    tasks_completed_count integer NOT NULL DEFAULT 0,
    total_tasks_reward numeric(14,2) NOT NULL DEFAULT 0,
    
    total_withdrawn_amount numeric(14,2) NOT NULL DEFAULT 0,
    withdrawals_count integer NOT NULL DEFAULT 0,
    withdrawals_details jsonb NOT NULL DEFAULT '[]'::jsonb,
    
    balance_at_deletion numeric(14,2) NOT NULL DEFAULT 0,
    locked_balance_at_deletion numeric(14,2) NOT NULL DEFAULT 0,
    lifetime_earned numeric(14,2) NOT NULL DEFAULT 0,
    
    archive_notes text
);

-- Indexes for lightning-fast search
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_phone ON public.deleted_users_archive (phone);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_full_name ON public.deleted_users_archive (full_name);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_email ON public.deleted_users_archive (email);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_user_code ON public.deleted_users_archive (user_code);
CREATE INDEX IF NOT EXISTS idx_deleted_users_archive_deleted_at ON public.deleted_users_archive (deleted_at DESC);

-- Enable RLS
ALTER TABLE public.deleted_users_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view deleted users archive" ON public.deleted_users_archive;
CREATE POLICY "Admins can view deleted users archive"
ON public.deleted_users_archive FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage deleted users archive" ON public.deleted_users_archive;
CREATE POLICY "Admins can manage deleted users archive"
ON public.deleted_users_archive FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Drop old function to allow new return type
DROP FUNCTION IF EXISTS public.admin_delete_user_data(uuid, uuid);

-- 3. Comprehensive admin_delete_user_data function
CREATE OR REPLACE FUNCTION public.admin_delete_user_data(_actor uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
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

    -- 4) Aggregate withdrawals (using account_number column)
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
END;$$;

REVOKE ALL ON FUNCTION public.admin_delete_user_data(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_data(uuid,uuid) TO authenticated, service_role;
