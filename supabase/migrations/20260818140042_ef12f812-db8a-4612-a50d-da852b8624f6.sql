-- 1. Prevent tenant hopping on clients
CREATE OR REPLACE FUNCTION public.prevent_workspace_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
    RAISE EXCEPTION 'workspace_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_prevent_workspace_change
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_change();

CREATE INDEX IF NOT EXISTS clients_workspace_id_idx ON public.clients (workspace_id);
CREATE INDEX IF NOT EXISTS clients_workspace_status_idx ON public.clients (workspace_id, status);
CREATE INDEX IF NOT EXISTS clients_workspace_created_idx ON public.clients (workspace_id, created_at DESC);

-- 2. Brand profiles
CREATE TABLE public.client_brand_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  brand_name TEXT,
  website_url TEXT,
  industry TEXT,
  description TEXT,
  target_audience TEXT,
  brand_positioning TEXT,
  brand_voice TEXT,
  tone_preferences TEXT,
  key_offerings TEXT,
  brand_notes TEXT,
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT client_brand_profiles_client_unique UNIQUE (client_id)
);

CREATE INDEX client_brand_profiles_workspace_idx ON public.client_brand_profiles (workspace_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_brand_profiles TO authenticated;
GRANT ALL ON public.client_brand_profiles TO service_role;

ALTER TABLE public.client_brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_brand_profiles_select_members
ON public.client_brand_profiles FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY client_brand_profiles_insert_members
ON public.client_brand_profiles FOR INSERT TO authenticated
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.workspace_id = client_brand_profiles.workspace_id
  )
);

CREATE POLICY client_brand_profiles_update_members
ON public.client_brand_profiles FOR UPDATE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()))
WITH CHECK (
  public.is_workspace_member(workspace_id, auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.workspace_id = client_brand_profiles.workspace_id
  )
);

CREATE POLICY client_brand_profiles_delete_members
ON public.client_brand_profiles FOR DELETE TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER client_brand_profiles_set_updated_at
BEFORE UPDATE ON public.client_brand_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER client_brand_profiles_prevent_workspace_change
BEFORE UPDATE ON public.client_brand_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_change();

REVOKE EXECUTE ON FUNCTION public.prevent_workspace_change() FROM anon;