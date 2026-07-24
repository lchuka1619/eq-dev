begin;

alter table public.personal_practice_attempts
  drop constraint if exists personal_practice_attempts_decision_check;
alter table public.personal_practice_attempts
  add constraint personal_practice_attempts_decision_check
  check (decision in ('repeat', 'soften', 'progress', 'consolidate', 'pause'));

create table if not exists public.today_practice_routes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  readiness jsonb not null default '{}'::jsonb,
  recommended_route text not null
    check (recommended_route in ('past_repair', 'future_rehearsal', 'daily_skill_loop')),
  selected_route text
    check (selected_route is null or selected_route in ('past_repair', 'future_rehearsal', 'daily_skill_loop')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists today_practice_routes_set_updated_at on public.today_practice_routes;
create trigger today_practice_routes_set_updated_at before update on public.today_practice_routes
  for each row execute function public.set_updated_at();

alter table public.today_practice_routes enable row level security;

create policy "Users manage own today practice route"
  on public.today_practice_routes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.today_practice_routes to authenticated;

commit;
