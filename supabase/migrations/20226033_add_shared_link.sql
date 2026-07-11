alter table projects
  add column share_token text unique,
  add column share_enabled boolean default false;

create index if not exists idx_projects_share_token on projects(share_token) where share_token is not null;