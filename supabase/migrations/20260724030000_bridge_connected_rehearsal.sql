begin;

create table if not exists public.real_life_bridges (
  id uuid primary key,
  journey_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('accepted', 'skipped', 'reflected')),
  offered_at timestamptz not null,
  responded_at timestamptz,
  did_it boolean,
  intensity_before integer check (intensity_before is null or intensity_before between 0 and 10),
  intensity_after integer check (intensity_after is null or intensity_after between 0 and 10),
  reflection text check (reflection is null or char_length(reflection) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (journey_id, user_id)
    references public.personal_practice_journeys(id, user_id) on delete cascade
);

create table if not exists public.connected_rehearsals (
  id uuid primary key,
  journey_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'paused', 'completed', 'safe-finish')),
  current_moment integer not null default 0 check (current_moment between 0 and 7),
  completed_moment_ids text[] not null default '{}',
  intensity_before integer not null check (intensity_before between 0 and 10),
  intensity_after integer check (intensity_after is null or intensity_after between 0 and 10),
  used_recovery boolean not null default false,
  pause_count integer not null default 0 check (pause_count >= 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds between 0 and 720),
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (journey_id, user_id)
    references public.personal_practice_journeys(id, user_id) on delete cascade
);

drop trigger if exists real_life_bridges_set_updated_at on public.real_life_bridges;
create trigger real_life_bridges_set_updated_at before update on public.real_life_bridges
  for each row execute function public.set_updated_at();
drop trigger if exists connected_rehearsals_set_updated_at on public.connected_rehearsals;
create trigger connected_rehearsals_set_updated_at before update on public.connected_rehearsals
  for each row execute function public.set_updated_at();

alter table public.real_life_bridges enable row level security;
alter table public.connected_rehearsals enable row level security;

create policy "Users manage own real life bridges" on public.real_life_bridges
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own connected rehearsals" on public.connected_rehearsals
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.real_life_bridges to authenticated;
grant select, insert, update, delete on public.connected_rehearsals to authenticated;

commit;
