DROP POLICY IF EXISTS "anyone can insert errors" ON public.error_logs;
CREATE POLICY "service role inserts errors" ON public.error_logs FOR INSERT TO service_role WITH CHECK (true);