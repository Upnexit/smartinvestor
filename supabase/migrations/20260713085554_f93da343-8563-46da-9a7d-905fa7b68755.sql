
-- ============================================================
-- Scale to 100k+ concurrent users:
-- 1. Add missing FK indexes (eliminates sequential scans)
-- 2. Optimize RLS policies with (select auth.uid()) initplan pattern
-- 3. Composite indexes for hot query paths
-- ============================================================

-- ---------- MISSING FOREIGN-KEY INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_user_packages_user_id           ON public.user_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_package_id        ON public.user_packages(package_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status_user       ON public.user_packages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_packages_status_expires    ON public.user_packages(status, expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id             ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_reviewed_by         ON public.withdrawals(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created      ON public.withdrawals(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task_id        ON public.task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_status    ON public.task_submissions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status_created ON public.task_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer      ON public.referral_earnings(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred      ON public.referral_earnings(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by            ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_status                 ON public.profiles(status) WHERE status <> 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_created_at             ON public.profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_messages_user_id      ON public.community_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_created      ON public.community_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_bans_user_id          ON public.community_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_community_bans_banned_by        ON public.community_bans(banned_by);

CREATE INDEX IF NOT EXISTS idx_user_payment_methods_user_id    ON public.user_payment_methods(user_id);

CREATE INDEX IF NOT EXISTS idx_distributors_created_by         ON public.distributors(created_by);
CREATE INDEX IF NOT EXISTS idx_distributor_applications_reviewed_by ON public.distributor_applications(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_notice_dismissals_notice        ON public.notice_dismissals(notice_id);

CREATE INDEX IF NOT EXISTS idx_notices_published_created       ON public.notices(published, created_at DESC) WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_support_messages_status         ON public.support_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_role                 ON public.user_roles(role, user_id);

-- ---------- RLS INITPLAN OPTIMIZATION ----------
-- Wrapping auth.uid() in (select ...) causes Postgres to evaluate it once
-- per query instead of once per row. Massive win on tables with many rows.

-- profiles
DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "distributors read assigned profiles" ON public.profiles;
CREATE POLICY "distributors read assigned profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    distributor_id = (select auth.uid())
    AND public.has_role((select auth.uid()), 'distributor'::app_role)
  );

-- user_packages
DROP POLICY IF EXISTS "users read own packages" ON public.user_packages;
CREATE POLICY "users read own packages" ON public.user_packages
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "users update own pending order" ON public.user_packages;
CREATE POLICY "users update own pending order" ON public.user_packages
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND status = ANY (ARRAY['pending'::package_status, 'rejected'::package_status]))
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins manage user_packages" ON public.user_packages;
CREATE POLICY "admins manage user_packages" ON public.user_packages
  FOR ALL TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

-- withdrawals
DROP POLICY IF EXISTS "users read own withdrawals" ON public.withdrawals;
CREATE POLICY "users read own withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins manage withdrawals" ON public.withdrawals;
CREATE POLICY "admins manage withdrawals" ON public.withdrawals
  FOR ALL TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

-- task_submissions
DROP POLICY IF EXISTS "users read own submissions" ON public.task_submissions;
CREATE POLICY "users read own submissions" ON public.task_submissions
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins manage submissions" ON public.task_submissions;
CREATE POLICY "admins manage submissions" ON public.task_submissions
  FOR ALL TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

-- activity_logs
DROP POLICY IF EXISTS "users read own activity" ON public.activity_logs;
CREATE POLICY "users read own activity" ON public.activity_logs
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "admins read all activity" ON public.activity_logs;
CREATE POLICY "admins read all activity" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

-- referral_earnings
DROP POLICY IF EXISTS "users read own referrals" ON public.referral_earnings;
CREATE POLICY "users read own referrals" ON public.referral_earnings
  FOR SELECT TO authenticated USING ((select auth.uid()) = referrer_id);

DROP POLICY IF EXISTS "admins read all referrals" ON public.referral_earnings;
CREATE POLICY "admins read all referrals" ON public.referral_earnings
  FOR SELECT TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

-- notices
DROP POLICY IF EXISTS "Authenticated users read published notices" ON public.notices;
CREATE POLICY "Authenticated users read published notices" ON public.notices
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete notices" ON public.notices;
CREATE POLICY "Admins delete notices" ON public.notices
  FOR DELETE TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update notices" ON public.notices;
CREATE POLICY "Admins update notices" ON public.notices
  FOR UPDATE TO authenticated USING (public.has_role((select auth.uid()), 'admin'::app_role));

-- notice_dismissals
DROP POLICY IF EXISTS "Users read own dismissals" ON public.notice_dismissals;
CREATE POLICY "Users read own dismissals" ON public.notice_dismissals
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own dismissals" ON public.notice_dismissals;
CREATE POLICY "Users delete own dismissals" ON public.notice_dismissals
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- ---------- REFRESH STATS ----------
ANALYZE public.profiles;
ANALYZE public.user_packages;
ANALYZE public.withdrawals;
ANALYZE public.task_submissions;
ANALYZE public.activity_logs;
ANALYZE public.notices;
ANALYZE public.referral_earnings;
