CREATE POLICY "Workspace members read creative files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'creatives'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );