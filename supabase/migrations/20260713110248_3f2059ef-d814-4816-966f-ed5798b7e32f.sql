REVOKE ALL PRIVILEGES ON public.distributor_earnings FROM anon;
REVOKE ALL PRIVILEGES ON public.distributor_leads FROM anon;
REVOKE ALL PRIVILEGES ON public.distributor_tasks FROM anon;
REVOKE ALL PRIVILEGES ON public.distributor_withdrawals FROM anon;
REVOKE ALL PRIVILEGES ON public.distributors FROM anon;
REVOKE ALL PRIVILEGES ON public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON public.task_submissions FROM anon;
REVOKE ALL PRIVILEGES ON public.user_packages FROM anon;
REVOKE ALL PRIVILEGES ON public.user_roles FROM anon;
REVOKE ALL PRIVILEGES ON public.link_tasks FROM anon;
REVOKE ALL PRIVILEGES ON public.packages FROM anon;

GRANT SELECT ON public.packages TO anon;
GRANT SELECT ON public.link_tasks TO anon;
GRANT INSERT ON public.distributor_applications TO anon;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;