alter table public.projects
  add column if not exists workspace_config jsonb;