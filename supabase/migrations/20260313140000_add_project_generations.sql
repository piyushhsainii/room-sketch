-- Store all generated variations per project

create table if not exists public.project_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  generation_type text not null check (generation_type in ('render', 'render_video')),
  render_url text,
  video_url text,
  style_context text,
  created_at timestamptz not null default now()
);

create index if not exists project_generations_project_created_idx
  on public.project_generations (project_id, created_at desc);

create index if not exists project_generations_user_created_idx
  on public.project_generations (user_id, created_at desc);
