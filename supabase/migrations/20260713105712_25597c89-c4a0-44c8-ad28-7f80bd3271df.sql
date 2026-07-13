-- Data API grants required for Supabase/PostgREST access
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;

GRANT SELECT ON public.link_tasks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.link_tasks TO authenticated;
GRANT ALL ON public.link_tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_submissions TO authenticated;
GRANT ALL ON public.task_submissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_packages TO authenticated;
GRANT ALL ON public.user_packages TO service_role;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, UPDATE ON public.distributors TO authenticated;
GRANT ALL ON public.distributors TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_tasks TO authenticated;
GRANT ALL ON public.distributor_tasks TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_leads TO authenticated;
GRANT ALL ON public.distributor_leads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_withdrawals TO authenticated;
GRANT ALL ON public.distributor_withdrawals TO service_role;

GRANT SELECT ON public.distributor_earnings TO authenticated;
GRANT ALL ON public.distributor_earnings TO service_role;

GRANT INSERT ON public.distributor_applications TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.distributor_applications TO authenticated;
GRANT ALL ON public.distributor_applications TO service_role;

-- Link task access for distributor-created tasks
DROP POLICY IF EXISTS "distributors manage own link tasks" ON public.link_tasks;
CREATE POLICY "distributors manage own link tasks"
ON public.link_tasks
FOR ALL
TO authenticated
USING (
  created_by_distributor = (select auth.uid())
  AND public.has_role((select auth.uid()), 'distributor'::public.app_role)
)
WITH CHECK (
  created_by_distributor = (select auth.uid())
  AND public.has_role((select auth.uid()), 'distributor'::public.app_role)
);

DROP POLICY IF EXISTS "distributors read package link tasks" ON public.link_tasks;
CREATE POLICY "distributors read package link tasks"
ON public.link_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role((select auth.uid()), 'distributor'::public.app_role)
  AND required_package_id IS NOT NULL
);

-- Distributor can see active package rows for users assigned to them
DROP POLICY IF EXISTS "distributors read assigned user packages" ON public.user_packages;
CREATE POLICY "distributors read assigned user packages"
ON public.user_packages
FOR SELECT
TO authenticated
USING (
  public.has_role((select auth.uid()), 'distributor'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_packages.user_id
      AND p.distributor_id = (select auth.uid())
  )
);

-- Distributor can see submissions for users assigned to them
DROP POLICY IF EXISTS "distributors read assigned user submissions" ON public.task_submissions;
CREATE POLICY "distributors read assigned user submissions"
ON public.task_submissions
FOR SELECT
TO authenticated
USING (
  public.has_role((select auth.uid()), 'distributor'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = task_submissions.user_id
      AND p.distributor_id = (select auth.uid())
  )
);

-- Backfill missing distributor roles for existing distributor rows
INSERT INTO public.user_roles (user_id, role)
SELECT d.user_id, 'distributor'::public.app_role
FROM public.distributors d
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = d.user_id
    AND ur.role = 'distributor'::public.app_role
);

-- Keep distributor role automatically synced for future distributor records
CREATE OR REPLACE FUNCTION public.ensure_distributor_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'distributor'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_distributor_role ON public.distributors;
CREATE TRIGGER trg_ensure_distributor_role
AFTER INSERT OR UPDATE OF user_id ON public.distributors
FOR EACH ROW
EXECUTE FUNCTION public.ensure_distributor_role();