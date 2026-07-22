begin;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_goal text not null check (primary_goal in ('work', 'close-relationships', 'new-people')),
  primary_challenge text not null check (primary_challenge in ('start', 'express', 'conflict')),
  daily_minutes integer not null check (daily_minutes in (3, 5, 10)),
  onboarding_completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  start_date date not null default current_date,
  current_day integer not null default 1 check (current_day between 1 and 7),
  plan_definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists learning_plans_one_active_per_user_idx
  on public.learning_plans (user_id) where status = 'active';

alter table public.practice_sessions
  add column if not exists plan_id uuid references public.learning_plans(id) on delete set null,
  add column if not exists plan_day integer check (plan_day is null or plan_day between 1 and 7),
  add column if not exists self_rating_before integer check (self_rating_before is null or self_rating_before between 0 and 10),
  add column if not exists self_rating_after integer check (self_rating_after is null or self_rating_after between 0 and 10);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();
drop trigger if exists learning_plans_set_updated_at on public.learning_plans;
create trigger learning_plans_set_updated_at before update on public.learning_plans
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;
alter table public.learning_plans enable row level security;

create policy "Users manage own preferences" on public.user_preferences
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own learning plans" on public.learning_plans
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.learning_plans to authenticated;

commit;
