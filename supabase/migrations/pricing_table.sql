-- ============================================================================
-- 0. CLEAN UP — drop anything from the previous (incorrect) attempt
-- ============================================================================
drop view if exists public.user_account_overview;
drop table if exists public.profiles;   -- was a duplicate identity table; you already have public.users


-- ============================================================================
-- 1. PLANS — static reference table, mirrors src/.../pricing.ts PRICING_PLANS
-- ============================================================================
create table if not exists public.plans (
  id             text primary key,               -- 'free' | 'basic' | 'pro'
  label          text not null,
  price_monthly  numeric(10, 2) not null default 0,
  storage_gb     integer not null,
  features       text[] not null default '{}',
  sort_order     integer not null,
  created_at     timestamptz not null default now()
);

insert into public.plans (id, label, price_monthly, storage_gb, features, sort_order)
values
  ('free',  'Free',  0,  1,  array['3 active projects', 'Standard-resolution exports', 'Community support'], 0),
  ('basic', 'Basic', 9,  5,  array['Unlimited projects', 'HD exports', 'Email support'], 1),
  ('pro',   'Pro',   19, 10, array['Unlimited projects', '4K exports & sub-millimeter snapping', 'Priority support'], 2)
on conflict (id) do update set
  label = excluded.label,
  price_monthly = excluded.price_monthly,
  storage_gb = excluded.storage_gb,
  features = excluded.features,
  sort_order = excluded.sort_order;

alter table public.plans enable row level security;

drop policy if exists "Plans are readable by everyone" on public.plans;
create policy "Plans are readable by everyone"
  on public.plans for select
  using (true);


-- ============================================================================
-- 2. EXTEND YOUR EXISTING public.users TABLE
--    (not creating a new identity table — projects.user_id already points
--    here, so preferences/profile fields belong on this table too.)
-- ============================================================================
alter table public.users add column if not exists full_name                text;
alter table public.users add column if not exists avatar_url               text;
alter table public.users add column if not exists unit_of_measure          text not null default 'metric';
alter table public.users add column if not exists appearance               text not null default 'light';
alter table public.users add column if not exists high_precision_rendering boolean not null default false;

-- Add check constraints separately so re-running this script doesn't error
-- if they already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_unit_of_measure_check'
  ) then
    alter table public.users
      add constraint users_unit_of_measure_check
      check (unit_of_measure in ('metric', 'imperial'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'users_appearance_check'
  ) then
    alter table public.users
      add constraint users_appearance_check
      check (appearance in ('light', 'dark'));
  end if;
end $$;


-- ============================================================================
-- 3. SUBSCRIPTIONS — links a user to a plan. One active row per user.
--    FK points at public.users, matching how projects.user_id already does.
-- ============================================================================
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.users (id) on delete cascade,
  plan_id            text not null references public.plans (id),
  status             text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  billing_cycle      text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  current_period_end timestamptz,                 -- null while on the free plan
  storage_used_gb    numeric(10, 3) not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on public.subscriptions;
create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Plan changes normally go through billing-provider webhooks (Stripe etc.)
-- using the service role key, which bypasses RLS — no client-side
-- insert/update policy is granted here on purpose.

-- Backfill: give every existing user a free subscription row if they
-- don't already have one.
insert into public.subscriptions (user_id, plan_id, status)
select u.id, 'free', 'active'
from public.users u
left join public.subscriptions s on s.user_id = u.id
where s.id is null;


-- ============================================================================
-- 4. AUTO-PROVISIONING — new auth.users signup gets a public.users row
--    (if you don't already have a trigger doing this) + a free subscription.
--    Skip this block if you already have your own handle_new_user() that
--    populates public.users — just make sure it also inserts a subscription.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 5. updated_at auto-touch on subscriptions
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- 6. CONVENIENCE VIEW — everything SettingsPanel needs in one query
-- ============================================================================
create or replace view public.user_account_overview as
select
  u.id                                as user_id,
  u.full_name,
  u.email,
  u.avatar_url,
  u.unit_of_measure,
  u.appearance,
  u.high_precision_rendering,
  s.plan_id,
  s.status                            as subscription_status,
  s.current_period_end,
  s.storage_used_gb,
  pl.label                            as plan_label,
  pl.price_monthly,
  pl.storage_gb                       as plan_storage_gb,
  pl.features                         as plan_features
from public.users u
join public.subscriptions s on s.user_id = u.id
join public.plans pl on pl.id = s.plan_id;

alter view public.user_account_overview set (security_invoker = true);