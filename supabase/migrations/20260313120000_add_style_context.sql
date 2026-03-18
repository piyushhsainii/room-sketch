-- Add per-project style context for generation

alter table public.projects
  add column if not exists style_context text;
