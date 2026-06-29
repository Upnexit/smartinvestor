
-- package-images: read by anyone signed in; write by admin only
CREATE POLICY "read package images" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'package-images');
CREATE POLICY "admin write package images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'package-images' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'package-images' AND public.has_role(auth.uid(),'admin'));

-- payment-logos: read public; write admin
CREATE POLICY "read payment logos" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'payment-logos');
CREATE POLICY "admin write payment logos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'payment-logos' AND public.has_role(auth.uid(),'admin'));

-- payment-screenshots: user reads own; admin reads all; user writes own
CREATE POLICY "user read own screenshots" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='payment-screenshots' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "user write own screenshots" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='payment-screenshots' AND owner = auth.uid());
CREATE POLICY "admin delete screenshots" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='payment-screenshots' AND public.has_role(auth.uid(),'admin'));

-- avatars: user manages own, anyone signed in reads
CREATE POLICY "read avatars" ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id='avatars');
CREATE POLICY "user write own avatar" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='avatars' AND owner = auth.uid())
  WITH CHECK (bucket_id='avatars' AND owner = auth.uid());
