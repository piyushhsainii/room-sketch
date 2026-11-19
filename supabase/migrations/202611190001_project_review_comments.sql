create table if not exists public.project_review_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  floor_id text,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 100),
  body text not null check (char_length(body) between 1 and 2000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists project_review_comments_project_created
  on public.project_review_comments(project_id, created_at desc, id desc);

alter table public.project_review_comments enable row level security;

-- Shared-link access is checked in the server route before using its server-only
-- service client. Direct authenticated access exposes only owned project reviews.
create policy "Owners read project reviews" on public.project_review_comments
  for select to authenticated using (
    exists (select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid())
  );

create policy "Owners resolve project reviews" on public.project_review_comments
  for update to authenticated using (
    exists (select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid())
  );
