-- Track edits/derivations between generations

alter table public.project_generations
  add column if not exists parent_generation_id uuid references public.project_generations(id) on delete set null;

alter table public.project_generations
  add column if not exists edit_prompt text;
