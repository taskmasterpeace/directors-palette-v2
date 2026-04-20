-- Music Lab Export Kit: tracks every per-segment ZIP download per user+song.
-- Enables "song coverage" UI, export history view, and duplicate-download counts.

create table if not exists music_lab_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references artist_profiles(id) on delete cascade,
  song_id text not null,
  segment_id text not null,
  segment_label text,
  start_s numeric not null,
  end_s numeric not null,
  duration_s numeric generated always as (end_s - start_s) stored,
  contact_sheet_url text,
  audio_clip_url text,
  exported_at timestamptz not null default now(),
  download_count int not null default 1,
  constraint music_lab_exports_segment_unique unique (user_id, artist_id, song_id, segment_id),
  constraint music_lab_exports_duration_check check (end_s > start_s and (end_s - start_s) <= 15)
);

create index if not exists music_lab_exports_user_idx
  on music_lab_exports (user_id, exported_at desc);
create index if not exists music_lab_exports_song_idx
  on music_lab_exports (user_id, song_id, start_s);

alter table music_lab_exports enable row level security;

create policy "music_lab_exports_select_own"
  on music_lab_exports for select
  using (auth.uid() = user_id);

create policy "music_lab_exports_insert_own"
  on music_lab_exports for insert
  with check (auth.uid() = user_id);

create policy "music_lab_exports_update_own"
  on music_lab_exports for update
  using (auth.uid() = user_id);

create policy "music_lab_exports_delete_own"
  on music_lab_exports for delete
  using (auth.uid() = user_id);

comment on table music_lab_exports is
  'Per-segment export kit downloads for Music Lab. One row per user+artist+song+segment, download_count bumps on re-download.';
