CREATE TABLE public.content_creatives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content_item_id uuid NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  provider text,
  model text,
  prompt text,
  prompt_reference jsonb NOT NULL DEFAULT '{}'::jsonb,
  format_id text,
  aspect_ratio text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  error_code text,
  error_message text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  byte_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX content_creatives_content_item_idx ON public.content_creatives (content_item_id, created_at DESC);
CREATE INDEX content_creatives_workspace_idx ON public.content_creatives (workspace_id, created_at DESC);
CREATE INDEX content_creatives_client_idx ON public.content_creatives (client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_creatives TO authenticated;
GRANT ALL ON public.content_creatives TO service_role;

ALTER TABLE public.content_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read creatives"
  ON public.content_creatives FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members insert creatives"
  ON public.content_creatives FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members update creatives"
  ON public.content_creatives FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members delete creatives"
  ON public.content_creatives FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER content_creatives_set_updated_at
  BEFORE UPDATE ON public.content_creatives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.content_items DROP CONSTRAINT content_items_status_check;
ALTER TABLE public.content_items ADD CONSTRAINT content_items_status_check
  CHECK (status IN ('draft','ready_for_creative','generating_creative','creative_generated','ready_for_review','archived'));