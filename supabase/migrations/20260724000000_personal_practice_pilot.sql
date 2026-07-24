begin;

create table if not exists public.personal_practice_journeys (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_skill_id text not null,
  current_stage text not null default 'guided'
    check (current_stage in ('guided', 'prompted', 'independent', 'light-surprise', 'connected-rehearsal')),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Sensitive repair text is inserted only after an explicit cloud-save choice.
create table if not exists public.past_event_repairs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_skill_id text not null,
  moments text[] not null default '{}',
  selected_moment text,
  fact_text text check (fact_text is null or char_length(fact_text) <= 2000),
  conclusion_text text check (conclusion_text is null or char_length(conclusion_text) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (id, user_id)
    references public.personal_practice_journeys(id, user_id) on delete cascade
);

create table if not exists public.personal_practice_attempts (
  id uuid primary key,
  journey_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  target_skill_id text not null,
  variation_id text not null,
  variation_seed text not null,
  stage text not null
    check (stage in ('guided', 'prompted', 'independent', 'light-surprise', 'connected-rehearsal')),
  changed_dimensions text[] not null default '{}'
    check (cardinality(changed_dimensions) <= 2),
  anxiety_before integer not null check (anxiety_before between 0 and 10),
  anxiety_after integer not null check (anxiety_after between 0 and 10),
  completed boolean not null default false,
  safe_finished boolean not null default false,
  used_hint boolean not null default false,
  reflection text check (reflection is null or char_length(reflection) <= 2000),
  decision text not null check (decision in ('repeat', 'soften', 'progress')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (journey_id, user_id)
    references public.personal_practice_journeys(id, user_id) on delete cascade
);

create index if not exists personal_practice_journeys_user_idx
  on public.personal_practice_journeys (user_id, updated_at desc);
create index if not exists personal_practice_attempts_journey_idx
  on public.personal_practice_attempts (journey_id, completed_at);

drop trigger if exists personal_practice_journeys_set_updated_at on public.personal_practice_journeys;
create trigger personal_practice_journeys_set_updated_at before update on public.personal_practice_journeys
  for each row execute function public.set_updated_at();
drop trigger if exists past_event_repairs_set_updated_at on public.past_event_repairs;
create trigger past_event_repairs_set_updated_at before update on public.past_event_repairs
  for each row execute function public.set_updated_at();

alter table public.personal_practice_journeys enable row level security;
alter table public.past_event_repairs enable row level security;
alter table public.personal_practice_attempts enable row level security;

create policy "Users manage own personal practice journeys"
  on public.personal_practice_journeys for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own past event repairs"
  on public.past_event_repairs for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own personal practice attempts"
  on public.personal_practice_attempts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.personal_practice_journeys to authenticated;
grant select, insert, update, delete on public.past_event_repairs to authenticated;
grant select, insert, update, delete on public.personal_practice_attempts to authenticated;

commit;
