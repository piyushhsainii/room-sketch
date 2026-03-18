-- Initial schema for RenderAI

create extension if not exists "pgcrypto";

-- Helper for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  renders_used integer not null default 0,
  videos_used integer not null default 0,
  usage_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists plan text,
  add column if not exists renders_used integer,
  add column if not exists videos_used integer,
  add column if not exists usage_reset_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.profiles
  alter column plan set default 'free';

update public.profiles
  set plan = coalesce(plan, 'free'),
      renders_used = coalesce(renders_used, 0),
      videos_used = coalesce(videos_used, 0),
      created_at = coalesce(created_at, now()),
      updated_at = coalesce(updated_at, now());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  floorplan_url text not null,
  render_url text,
  video_url text,
  status text not null default 'uploaded' check (status in ('uploaded', 'rendering', 'completed', 'failed')),
  generation_type text not null default 'render' check (generation_type in ('render', 'render_video')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists user_id uuid,
  add column if not exists name text,
  add column if not exists floorplan_url text,
  add column if not exists render_url text,
  add column if not exists video_url text,
  add column if not exists status text,
  add column if not exists generation_type text,
  add column if not exists error_message text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.projects
  alter column status set default 'uploaded';

alter table public.projects
  alter column generation_type set default 'render';

update public.projects
  set status = coalesce(status, 'uploaded'),
      generation_type = coalesce(generation_type, 'render'),
      created_at = coalesce(created_at, now()),
      updated_at = coalesce(updated_at, now());

create index if not exists projects_user_created_idx on public.projects (user_id, created_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
for delete
to authenticated
using (user_id = auth.uid());

-- Optional: create storage buckets (public)
-- You can also do this in the Supabase dashboard.
insert into storage.buckets (id, name, public)
values
  ('floorplans', 'floorplans', true),
  ('renders', 'renders', true),
  ('videos', 'videos', true)
on conflict (id) do nothing;
