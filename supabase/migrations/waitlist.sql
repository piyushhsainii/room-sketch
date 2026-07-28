create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz default now()
);