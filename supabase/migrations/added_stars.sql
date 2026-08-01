alter table public.projects
  add column published boolean not null default false,
  add column published_at timestamptz;

create table public.project_stars (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);