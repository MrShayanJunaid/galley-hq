REVOKE ALL ON FUNCTION public.is_workspace_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_workspace_role(UUID, UUID, public.workspace_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bootstrap_user(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(UUID, UUID, public.workspace_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_user(TEXT, TEXT) TO authenticated;