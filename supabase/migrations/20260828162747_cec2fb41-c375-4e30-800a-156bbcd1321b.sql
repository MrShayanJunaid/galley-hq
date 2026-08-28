ALTER TABLE public.client_brand_profiles
  ADD COLUMN IF NOT EXISTS reference_visual_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reference_visual_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS reference_visual_error text,
  ADD COLUMN IF NOT EXISTS reference_visual_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reference_visual_signature text;