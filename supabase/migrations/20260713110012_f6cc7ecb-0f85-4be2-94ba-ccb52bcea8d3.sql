DROP POLICY IF EXISTS "distributors read package link tasks" ON public.link_tasks;
CREATE POLICY "distributors read package link tasks"
ON public.link_tasks
FOR SELECT
TO authenticated
USING (
  public.has_role((select auth.uid()), 'distributor'::public.app_role)
  AND required_package_id IS NOT NULL
  AND (
    created_by_distributor IS NULL
    OR created_by_distributor = (select auth.uid())
  )
);