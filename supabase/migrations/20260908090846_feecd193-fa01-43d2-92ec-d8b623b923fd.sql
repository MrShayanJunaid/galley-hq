ALTER TABLE public.client_brand_profiles
  ADD COLUMN IF NOT EXISTS website_identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS website_identity_at timestamptz;