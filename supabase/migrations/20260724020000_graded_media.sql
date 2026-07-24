begin;

alter table public.personal_practice_attempts
  add column if not exists renderer text not null default 'text_voice',
  add column if not exists media_asset_id text,
  add column if not exists media_skipped boolean not null default true;

alter table public.personal_practice_attempts
  drop constraint if exists personal_practice_attempts_renderer_check;
alter table public.personal_practice_attempts
  add constraint personal_practice_attempts_renderer_check
  check (renderer in ('text_voice', 'image_audio', 'pov_video', 'video_360', 'vr_interactive'));

commit;
