REVOKE ALL ON FUNCTION public.ensure_distributor_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_distributor_role() FROM anon;
REVOKE ALL ON FUNCTION public.ensure_distributor_role() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_distributor_role() TO service_role;