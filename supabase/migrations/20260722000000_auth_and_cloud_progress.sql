begin;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  practice_sessions integer not null default 0 check (practice_sessions >= 0),
  arena_sessions integer not null default 0 check (arena_sessions >= 0),
  highest_level integer not null default 0 check (highest_level >= 0),
  recovery_strength integer not null default 0 check (recovery_strength between 0 and 5),
  streak integer not null default 0 check (streak >= 0),
  completed_dates date[] not null default '{}',
  practiced_dates date[] not null default '{}',
  last_practiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_type text not null check (session_type in ('daily', 'arena')),
  exercise_id text,
  level integer check (level is null or level >= 0),
  intensity_before integer check (intensity_before is null or intensity_before between 0 and 10),
  intensity_after integer check (intensity_after is null or intensity_after between 0 and 10),
  repetitions integer not null default 0 check (repetitions >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  reflection text check (reflection is null or char_length(reflection) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_completed_idx
  on public.practice_sessions (user_id, completed_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_progress (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists user_progress_set_updated_at on public.user_progress;
create trigger user_progress_set_updated_at before update on public.user_progress
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.practice_sessions enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users can read own progress" on public.user_progress;
create policy "Users can read own progress" on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own progress" on public.user_progress;
create policy "Users can insert own progress" on public.user_progress for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own progress" on public.user_progress;
create policy "Users can update own progress" on public.user_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own sessions" on public.practice_sessions;
create policy "Users can read own sessions" on public.practice_sessions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own sessions" on public.practice_sessions;
create policy "Users can insert own sessions" on public.practice_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own sessions" on public.practice_sessions;
create policy "Users can delete own sessions" on public.practice_sessions for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.user_progress to authenticated;
grant select, insert, delete on public.practice_sessions to authenticated;

commit;
