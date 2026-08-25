-- supabase/migrations/xxxx_add_star_count_and_community.sql

alter table public.projects
  add column if not exists star_count integer not null default 0;

update public.projects p
set star_count = sub.cnt
from (
  select project_id, count(*) as cnt
  from public.project_stars
  group by project_id
) sub
where p.id = sub.project_id;

create or replace function public.bump_project_star_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.projects set star_count = star_count + 1 where id = new.project_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.projects set star_count = greatest(star_count - 1, 0) where id = old.project_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists project_stars_count_ins on public.project_stars;
create trigger project_stars_count_ins
after insert on public.project_stars
for each row execute function public.bump_project_star_count();

drop trigger if exists project_stars_count_del on public.project_stars;
create trigger project_stars_count_del
after delete on public.project_stars
for each row execute function public.bump_project_star_count();

create index if not exists idx_projects_published_stars
  on public.projects (published, star_count desc, id desc)
  where published = true;