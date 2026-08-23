CREATE TABLE public.content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  objective TEXT NOT NULL,
  topic TEXT,
  idea JSONB NOT NULL DEFAULT '{}'::jsonb,
  title TEXT,
  hook TEXT,
  body TEXT,
  cta TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}'::text[],
  creative_prompt JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  generation_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_items_status_check CHECK (status IN ('draft','ready_for_creative','ready_for_review','archived'))
);

CREATE INDEX content_items_workspace_idx ON public.content_items (workspace_id, created_at DESC);
CREATE INDEX content_items_client_idx ON public.content_items (client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read content" ON public.content_items
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can create content" ON public.content_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND c.workspace_id = content_items.workspace_id
    )
  );

CREATE POLICY "Workspace members can update content" ON public.content_items
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Workspace members can delete content" ON public.content_items
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE TRIGGER content_items_set_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_items_workspace_immutable
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_change();

CREATE TABLE public.ai_generation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_code TEXT,
  duration_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_generation_events_workspace_idx ON public.ai_generation_events (workspace_id, created_at DESC);
CREATE INDEX ai_generation_events_client_idx ON public.ai_generation_events (client_id, created_at DESC);

GRANT SELECT, INSERT ON public.ai_generation_events TO authenticated;
GRANT ALL ON public.ai_generation_events TO service_role;

ALTER TABLE public.ai_generation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can read usage" ON public.ai_generation_events
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members record their own usage" ON public.ai_generation_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());