ALTER TABLE public.client_brand_profiles
  ADD COLUMN IF NOT EXISTS creative_direction jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.creative_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  content_item_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES public.content_creatives(id) ON DELETE SET NULL,
  variant_index integer,
  feedback text NOT NULL,
  applied boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS creative_feedback_workspace_idx ON public.creative_feedback (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS creative_feedback_content_item_idx ON public.creative_feedback (content_item_id, variant_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creative_feedback TO authenticated;
GRANT ALL ON public.creative_feedback TO service_role;

ALTER TABLE public.creative_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read creative feedback" ON public.creative_feedback;
CREATE POLICY "Workspace members read creative feedback"
  ON public.creative_feedback FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members add creative feedback" ON public.creative_feedback;
CREATE POLICY "Workspace members add creative feedback"
  ON public.creative_feedback FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Workspace members update creative feedback" ON public.creative_feedback;
CREATE POLICY "Workspace members update creative feedback"
  ON public.creative_feedback FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members delete creative feedback" ON public.creative_feedback;
CREATE POLICY "Workspace members delete creative feedback"
  ON public.creative_feedback FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP TRIGGER IF EXISTS set_creative_feedback_updated_at ON public.creative_feedback;
CREATE TRIGGER set_creative_feedback_updated_at
  BEFORE UPDATE ON public.creative_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();