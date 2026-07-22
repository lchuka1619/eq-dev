begin;

alter table public.practice_sessions
  add column if not exists client_event_id uuid;

update public.practice_sessions
set client_event_id = case
  when id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then id::text::uuid
  else gen_random_uuid()
end
where client_event_id is null;

alter table public.practice_sessions
  alter column client_event_id set default gen_random_uuid(),
  alter column client_event_id set not null;

create unique index if not exists practice_sessions_client_event_idx
  on public.practice_sessions (client_event_id);

drop policy if exists "Users can update own sessions" on public.practice_sessions;
create policy "Users can update own sessions"
  on public.practice_sessions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant update on public.practice_sessions to authenticated;

commit;
