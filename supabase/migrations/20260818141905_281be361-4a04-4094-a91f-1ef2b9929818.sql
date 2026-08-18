ALTER TABLE public.client_brand_profiles
  ADD COLUMN IF NOT EXISTS products_services text,
  ADD COLUMN IF NOT EXISTS usp text,
  ADD COLUMN IF NOT EXISTS key_differentiators text,
  ADD COLUMN IF NOT EXISTS customer_problems text,
  ADD COLUMN IF NOT EXISTS desired_perception text,
  ADD COLUMN IF NOT EXISTS content_topics text,
  ADD COLUMN IF NOT EXISTS content_goals text,
  ADD COLUMN IF NOT EXISTS content_formats text,
  ADD COLUMN IF NOT EXISTS cta_preferences text,
  ADD COLUMN IF NOT EXISTS content_instructions text,
  ADD COLUMN IF NOT EXISTS voice_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS field_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_suggestions jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_suggestions_at timestamptz,
  ADD COLUMN IF NOT EXISTS website_analysis jsonb,
  ADD COLUMN IF NOT EXISTS website_analysis_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS website_analysis_error text,
  ADD COLUMN IF NOT EXISTS website_analyzed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_brand_profiles_onboarding_status_check'
  ) THEN
    ALTER TABLE public.client_brand_profiles
      ADD CONSTRAINT client_brand_profiles_onboarding_status_check
      CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_brand_profiles_website_analysis_status_check'
  ) THEN
    ALTER TABLE public.client_brand_profiles
      ADD CONSTRAINT client_brand_profiles_website_analysis_status_check
      CHECK (website_analysis_status IN ('idle', 'running', 'completed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS client_brand_profiles_workspace_idx
  ON public.client_brand_profiles (workspace_id);
CREATE INDEX IF NOT EXISTS client_brand_profiles_onboarding_status_idx
  ON public.client_brand_profiles (onboarding_status);

CREATE TABLE IF NOT EXISTS public.brand_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  website_url text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted jsonb,
  duration_ms integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brand_analysis_runs_status_check CHECK (status IN ('running', 'completed', 'failed'))
);

GRANT SELECT, INSERT, UPDATE ON public.brand_analysis_runs TO authenticated;
GRANT ALL ON public.brand_analysis_runs TO service_role;

ALTER TABLE public.brand_analysis_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members read analysis runs" ON public.brand_analysis_runs;
CREATE POLICY "Workspace members read analysis runs"
  ON public.brand_analysis_runs FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members create analysis runs" ON public.brand_analysis_runs;
CREATE POLICY "Workspace members create analysis runs"
  ON public.brand_analysis_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Workspace members update analysis runs" ON public.brand_analysis_runs;
CREATE POLICY "Workspace members update analysis runs"
  ON public.brand_analysis_runs FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE INDEX IF NOT EXISTS brand_analysis_runs_client_idx
  ON public.brand_analysis_runs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brand_analysis_runs_workspace_idx
  ON public.brand_analysis_runs (workspace_id);

DROP TRIGGER IF EXISTS brand_analysis_runs_set_updated_at ON public.brand_analysis_runs;
CREATE TRIGGER brand_analysis_runs_set_updated_at
  BEFORE UPDATE ON public.brand_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS brand_analysis_runs_prevent_workspace_change ON public.brand_analysis_runs;
CREATE TRIGGER brand_analysis_runs_prevent_workspace_change
  BEFORE UPDATE ON public.brand_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_workspace_change();