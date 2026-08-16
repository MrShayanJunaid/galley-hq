REVOKE ALL ON FUNCTION public.is_workspace_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_workspace_role(uuid, uuid, public.workspace_role[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, uuid, public.workspace_role[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.bootstrap_user(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_user(text, text) TO authenticated, service_role;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

DROP POLICY IF EXISTS "subscriptions_no_client_writes" ON public.subscriptions;
CREATE POLICY "subscriptions_block_client_inserts"
ON public.subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "subscriptions_block_client_updates"
ON public.subscriptions
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "subscriptions_block_client_deletes"
ON public.subscriptions
FOR DELETE
TO authenticated, anon
USING (false);