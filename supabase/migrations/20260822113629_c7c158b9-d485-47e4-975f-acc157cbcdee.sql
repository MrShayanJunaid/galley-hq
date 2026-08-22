update public.client_brand_profiles
set website_url = 'https://exterly.io',
    ai_suggestions = '{}'::jsonb,
    ai_suggestions_at = null,
    website_analysis = null,
    website_analysis_status = 'idle',
    website_analyzed_at = null
where client_id = '78c78792-389f-4c2f-95ea-2defa6550e68';

delete from public.brand_analysis_runs
where client_id = '78c78792-389f-4c2f-95ea-2defa6550e68' and website_url like '%stripe.com%';