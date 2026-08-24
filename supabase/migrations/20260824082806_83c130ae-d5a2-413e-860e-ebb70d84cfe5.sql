alter table public.client_brand_profiles
  add column if not exists visual_config jsonb not null default '{}'::jsonb;

create table if not exists public.client_brand_references (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  storage_bucket text not null default 'brand-references',
  storage_path text not null,
  description text,
  mime_type text,
  byte_size integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_brand_references_client_idx on public.client_brand_references (client_id, created_at desc);
create index if not exists client_brand_references_workspace_idx on public.client_brand_references (workspace_id);

grant select, insert, update, delete on public.client_brand_references to authenticated;
grant all on public.client_brand_references to service_role;

alter table public.client_brand_references enable row level security;

drop policy if exists "Workspace members read brand references" on public.client_brand_references;
create policy "Workspace members read brand references"
  on public.client_brand_references for select to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "Workspace members add brand references" on public.client_brand_references;
create policy "Workspace members add brand references"
  on public.client_brand_references for insert to authenticated
  with check (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "Workspace members update brand references" on public.client_brand_references;
create policy "Workspace members update brand references"
  on public.client_brand_references for update to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()))
  with check (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "Workspace members delete brand references" on public.client_brand_references;
create policy "Workspace members delete brand references"
  on public.client_brand_references for delete to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

drop trigger if exists set_client_brand_references_updated_at on public.client_brand_references;
create trigger set_client_brand_references_updated_at
  before update on public.client_brand_references
  for each row execute function public.set_updated_at();

drop policy if exists "Workspace members read brand reference files" on storage.objects;
create policy "Workspace members read brand reference files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-references'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists "Workspace members write brand reference files" on storage.objects;
create policy "Workspace members write brand reference files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-references'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists "Workspace members update brand reference files" on storage.objects;
create policy "Workspace members update brand reference files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-references'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
  with check (
    bucket_id = 'brand-references'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

drop policy if exists "Workspace members delete brand reference files" on storage.objects;
create policy "Workspace members delete brand reference files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-references'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

alter table public.content_creatives
  add column if not exists variant_index integer not null default 1,
  add column if not exists variant_label text,
  add column if not exists concept text,
  add column if not exists asset_type text not null default 'image',
  add column if not exists reference_paths jsonb not null default '[]'::jsonb;

create index if not exists content_creatives_variant_idx
  on public.content_creatives (content_item_id, variant_index, version desc);