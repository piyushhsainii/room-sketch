-- Store cached 3D workspace extraction per project

alter table public.projects
  add column if not exists scene_json jsonb,
  add column if not exists workspace_enabled boolean not null default false;
