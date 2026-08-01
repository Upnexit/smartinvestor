CREATE POLICY "users read own owned package" ON public.packages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_packages up
  WHERE up.package_id = packages.id
    AND up.user_id = auth.uid()
    AND up.status = 'active'
));