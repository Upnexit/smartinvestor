DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'distributors read assigned profiles'
  ) THEN
    CREATE POLICY "distributors read assigned profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      distributor_id = auth.uid()
      AND public.has_role(auth.uid(), 'distributor'::public.app_role)
    );
  END IF;
END $$;