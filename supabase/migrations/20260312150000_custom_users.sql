-- Custom users table for non-Supabase auth

create table if not exists public.users (
  id uuid primary key,
  email text not null default '',
  google_sub text unique,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Backfill missing users rows for existing data
insert into public.users (id, email, google_sub)
select p.id, '', null
from public.profiles p
left join public.users u on u.id = p.id
where u.id is null
on conflict (id) do nothing;

insert into public.users (id, email, google_sub)
select distinct pr.user_id, '', null
from public.projects pr
left join public.users u on u.id = pr.user_id
where u.id is null
on conflict (id) do nothing;

-- Ensure guest user exists (used when DISABLE_AUTH=true)
insert into public.users (id, email, google_sub)
values ('00000000-0000-4000-8000-000000000000', '', null)
on conflict (id) do nothing;

-- Drop foreign keys to auth.users (if present) and re-point to public.users
alter table public.projects
  drop constraint if exists projects_user_id_fkey;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.projects
  add constraint projects_user_id_fkey
  foreign key (user_id)
  references public.users(id)
  on delete cascade;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id)
  references public.users(id)
  on delete cascade;
