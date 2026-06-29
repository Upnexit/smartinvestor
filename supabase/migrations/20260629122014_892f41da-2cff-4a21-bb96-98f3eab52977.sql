
CREATE POLICY "auth read community voice" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'community-voice');
CREATE POLICY "auth upload own community voice" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-voice' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "auth delete own community voice" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'community-voice' AND (storage.foldername(name))[1] = auth.uid()::text);
