# Music Lab — Export Kit Implementation Plan

**Date:** 2026-04-20
**Branch:** `feat/music-lab`
**Design doc:** [2026-04-20-music-lab-export-kit-design.md](./2026-04-20-music-lab-export-kit-design.md)
**Status:** Ready to execute

Each phase is independently mergeable, produces a shippable increment, and has its own commit.
Phases are ordered so user value arrives as early as possible (Phase 3 is the first usable
kit download).

---

## Phase 0 — Dependencies + migration (foundation)

### Goal
Get runtime deps and DB schema in place before any feature code.

### Files

**New:**
- `supabase/migrations/20260420_music_lab_exports.sql`

```sql
create table music_lab_exports (
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
  constraint music_lab_exports_segment_unique unique (user_id, artist_id, song_id, segment_id)
);

create index music_lab_exports_user_idx on music_lab_exports (user_id, exported_at desc);
create index music_lab_exports_song_idx on music_lab_exports (user_id, song_id, start_s);

alter table music_lab_exports enable row level security;

create policy "users read own exports"
  on music_lab_exports for select
  using (auth.uid() = user_id);

create policy "users insert own exports"
  on music_lab_exports for insert
  with check (auth.uid() = user_id);

create policy "users update own exports"
  on music_lab_exports for update
  using (auth.uid() = user_id);
```

**Modified:**
- `package.json` — add `jszip@^3.10`, `ffmpeg-static@^5.2` (verify `sharp` already present)

### Tests
- Apply migration to local Supabase. Verify table exists with RLS.
- `npm install` clean. `rm -rf .next && npm run build` must pass.

### Commit
`chore(music-lab): export-kit deps + music_lab_exports migration`

---

## Phase 1 — Contact Sheet recipe subsystem

### Goal
A working, reusable recipe that produces a composited JPG given beats + artist context. No UI
yet — tested via direct API call with cURL.

### Files

**New:**
- `src/features/recipes/contact-sheet/types.ts` — `ContactSheetInput`, `ContactSheetResult`
- `src/features/recipes/contact-sheet/prompt-builder.ts` — per-frame prompt synthesis, applies `bannedWords`, merges `artistContext` + `directorFingerprint` + `beat.description`
- `src/features/recipes/contact-sheet/composer.ts` — takes N image buffers + captions, returns single JPG buffer via `sharp`. Grid layout driven by `layout` field. Header band + per-frame caption bands.
- `src/features/recipes/contact-sheet/recipe.ts` — orchestrates: for each beat, call image gen → collect buffers → composer → upload to Supabase → return URL
- `src/app/api/recipes/contact-sheet/generate/route.ts` — POST handler, auth-gated, wraps recipe.ts
- `src/app/api/recipes/contact-sheet/[id]/route.ts` — GET handler, returns stored sheet metadata

**Modified:**
- `src/features/recipes/services/recipes.service.ts` — register contact-sheet recipe so it shows up in catalog

### Implementation notes
- Use `gemini-2.5-flash-image` via existing image-gen service in the app. Don't reimplement.
- Composer default layout `2x3` (2 cols, 3 rows, 6 frames). Image cell size 512×288 (16:9). Full sheet = 1024 wide × (header + 3·(288+caption)) ≈ 1100 tall.
- Caption band: 40px tall, dark background, monospace 12px for timecode + sans 14px for description. Truncate description to fit.
- Store JPG in `directors-palette` bucket at `contact-sheets/{artistId}/{timestamp}_{recipeRunId}.jpg`. Quality 85.
- Filter every per-frame prompt through `bannedWords` (re-use the existing lexicon filter util from Artist DNA).

### Tests
- cURL test: POST to `/api/recipes/contact-sheet/generate` with a Country Fat payload (6 beats, his DNA context, banned words). Confirm JPG comes back, visually sane, no banned words visible in any frame.
- Verify sheet lands in Supabase storage.
- Verify the record shows up in the recipes catalog.

### Commit
`feat(recipes): contact-sheet recipe — 6-frame composited brief for any scene`

---

## Phase 2 — Audio-to-MP4 wrap + storage

### Goal
Server endpoint that takes `{ songUrl, startS, endS }` → returns an MP4 URL (black screen + audio).

### Files

**New:**
- `src/features/music-lab/services/audio-clip.service.ts` — wraps `ffmpeg-static` binary call
- `src/app/api/music-lab/export-kit/[segmentId]/audio/route.ts` — POST handler. Pulls song via signed URL if needed, runs ffmpeg, uploads result to Supabase at `audio-kits/{artistId}/{segmentId}.mp4`, returns URL.

### Implementation notes
- ffmpeg command:
  ```
  ffmpeg -f lavfi -i color=c=black:s=640x360:d=${dur} \
         -ss ${startS} -t ${dur} -i ${songUrl} \
         -map 0:v -map 1:a -c:v libx264 -preset veryfast -tune stillimage -c:a aac -b:a 128k \
         -shortest -y output.mp4
  ```
- Temp dir under `/tmp/` with cleanup.
- Cache: if `audio-kits/{artistId}/{segmentId}.mp4` already exists with matching start/end, return existing URL (idempotency).
- Max duration 15s — reject anything over.

### Tests
- cURL POST with Dusty Exit 9 URL, start=60, end=75. Confirm MP4 comes back, plays in VLC, is exactly 15s with black video + correct audio.
- Second call with same params returns cached URL in <500ms.

### Commit
`feat(music-lab): audio-to-mp4 wrapper for export kit segments`

---

## Phase 3 — Per-segment Export Kit ZIP (MVP ship point)

### Goal
Working end-to-end per-segment download: user can POST a segment spec and get back a ZIP with all
4 files. No UI yet — exercised via cURL. **This is the first shippable increment.**

### Files

**New:**
- `src/features/music-lab/types/export-kit.ts` — `SegmentSpec`, `ExportKitPayload`
- `src/features/music-lab/services/export-kit.service.ts` — orchestrates: fetch character sheet → call contact-sheet recipe → call audio-clip service → write `kit-notes.txt` → zip via `jszip` → stream response. Writes `music_lab_exports` row (upsert, bump `download_count`).
- `src/app/api/music-lab/export-kit/[segmentId]/zip/route.ts` — POST handler. Body: `SegmentSpec`. Response: `application/zip` stream with filename `{artistName}_{segmentLabel}_kit.zip`.

### `kit-notes.txt` format
```
Music Lab Export Kit
====================

Artist:      Country Fat
Song:        Dusty Exit 9
Segment:     Hook 1
Timecode:    0:12 – 0:27 (15s)
Tempo:       92 BPM
Exported:    2026-04-20 14:23 UTC

Files in this kit
-----------------
character-sheet.jpg    Artist identity reference — use as "who"
contact-sheet.jpg      Segment visual brief — use as "what happens"
audio-15s.mp4          Song segment with black video — upload to your video generator

Workflow
--------
1. Upload all three files to your video generator of choice.
2. Use the character sheet as the identity / subject reference.
3. Use the contact sheet as the scene / shot direction reference.
4. Use the MP4 as the audio / lip-sync source.
```

### Tests
- cURL POST with a Country Fat segment spec. Confirm ZIP downloads, contains all 4 files with correct content.
- `music_lab_exports` row created. Second download of same segment bumps `download_count` to 2.

### Commit
`feat(music-lab): per-segment export kit ZIP endpoint`

---

## Phase 4 — Music Lab Export Kit UI (segment picker + table)

### Goal
First usable UI. User can scrub a song, drop segment markers, generate contact sheets per segment,
and download kits. **Use the `frontend-design` skill for visual implementation.**

### Files

**New:**
- `src/features/music-lab/components/ExportKitTab.tsx` — top-level panel
- `src/features/music-lab/components/SegmentPicker.tsx` — waveform + drag-to-create / drag-to-resize segment markers. Lift pattern from `docs/playgrounds/seedance-2-panel.html` (its waveform interaction is the reference).
- `src/features/music-lab/components/SegmentRow.tsx` — one row: label, timecode, contact-sheet status, exports count, download button
- `src/features/music-lab/components/ContactSheetEditor.tsx` — modal: user writes 6 beat descriptions (or uses "Auto-draft from DNA" button), hits Generate, preview appears, save
- `src/features/music-lab/components/SongCoverageStrip.tsx` — horizontal bar showing covered vs uncovered ranges
- `src/features/music-lab/hooks/useSegments.ts` — zustand slice: segments array, CRUD, persisted to localStorage per song
- `src/features/music-lab/hooks/useExportKit.ts` — wraps the service, progress state, toast on success

**Modified:**
- `src/features/music-lab/components/MusicLabPanel.tsx` — add "Export Kit" tab after existing tabs

### UX rules
- Segment max duration = 15s. UI caps drag.
- Minimum = 3s.
- Overlaps allowed but flagged with a warning badge (user may want overlapping takes).
- Default segment label is `Segment N`; user can rename inline.
- Contact sheet editor has "Auto-draft beats from DNA" button — calls an LLM endpoint that returns 6 beat descriptions given artist DNA + segment label + timecode. User can edit before generating.

### Tests
- Playwright: load artist, open Music Lab → Export Kit, create a segment by drag, rename it, open contact sheet editor, auto-draft, generate, download ZIP. Verify the downloaded file.
- Manual: song coverage strip visually reflects segment presence.

### Commit
`feat(music-lab): export kit UI — segment picker, contact sheet editor, per-segment download`

---

## Phase 5 — Song coverage + export history

### Goal
Close the "what have I already exported" loop with the coverage strip, export badges, and the
"My exports" global view.

### Files

**New:**
- `src/app/api/music-lab/export-kit/song/[songId]/history/route.ts` — GET: segments exported for this song
- `src/app/api/music-lab/export-kit/history/route.ts` — GET: "My exports" — paginated list across all songs
- `src/features/music-lab/components/ExportHistoryPanel.tsx` — "My exports" list view (accessed from Music Lab top-level button)
- `src/features/music-lab/services/export-history.service.ts` — wraps both endpoints

**Modified:**
- `src/features/music-lab/components/SegmentRow.tsx` — show `✓ exported Nx · date` badge pulled from history
- `src/features/music-lab/components/SongCoverageStrip.tsx` — overlay green bands on exported ranges

### Tests
- Export 3 segments over 2 sessions. Reload. Coverage strip and badges reflect history.
- "My exports" view lists all exports, newest first. Re-download works.

### Commit
`feat(music-lab): song coverage strip + export history view`

---

## Phase 6 — Master ZIP (download everything)

### Goal
One-click export of the entire song's kits as a master ZIP with coverage report.

### Files

**New:**
- `src/app/api/music-lab/export-kit/song/[songId]/zip/route.ts` — POST: streams master ZIP

### Master ZIP structure
```
{artistName}_{songName}_master_kit.zip
├── song-master.mp3
├── character-sheet.jpg
├── coverage-report.txt
└── segments/
    ├── hook-1/
    │   ├── contact-sheet.jpg
    │   ├── audio-15s.mp4
    │   └── kit-notes.txt
    ├── verse-1/
    │   └── ...
    └── outro/
        └── ...
```

`coverage-report.txt` format per the design doc (total song length, exported ranges, uncovered gaps).

### Tests
- cURL POST. Download master ZIP. Verify all segments + master + coverage report present.
- Verify `coverage-report.txt` accurately lists uncovered ranges.

### Commit
`feat(music-lab): master ZIP download with coverage report`

---

## Phase 7 — Polish + pricing

### Goal
Ship-ready. Credits pricing, error states, empty states, copy.

### Files

**Modified:**
- `src/features/recipes/contact-sheet/recipe.ts` — charge 30 pts per sheet (6 frames × 5)
- `src/features/music-lab/components/ExportKitTab.tsx` — empty state ("Drop a segment on the waveform to get started"), error handling for failed audio/contact-sheet generation, progress indicators
- `src/features/credits/services/credits.service.ts` — add contact-sheet recipe pricing row

### Pricing decisions (from design doc's open questions)
1. **Contact sheet cost:** 30 pts per generation (6 × 5 pts, matches image-gen pricing).
2. **Max segments per song:** cap at 20 to keep master ZIPs reasonable.
3. **Regeneration policy:** old contact sheets preserved in storage; `music_lab_exports` tracks `download_count`; each regen produces a new sheet URL without deleting the prior.

### Tests
- Full run-through on a real song (Dusty Exit 9 with Country Fat).
- `rm -rf .next && npm run build` passes.
- Playwright covers happy path end-to-end.

### Commit
`feat(music-lab): export kit polish — pricing, empty/error states, limits`

---

## Completion checklist

- [ ] Migration applied to production Supabase
- [ ] All 7 phases merged to `feat/music-lab`, each a standalone commit
- [ ] Full cURL test script in `docs/research/seedance-2.0-phase0/test-export-kit.sh`
- [ ] Playwright test green: `tests/music-lab/export-kit.spec.ts`
- [ ] `CLAUDE.md` or memory updated: "Music Lab Export Kit ships as filter-agnostic alternative to full Seedance automation"
- [ ] Announcement drafted (use announcement system) so users discover the new tab

---

## Risk register

| Risk | Mitigation |
|------|------------|
| ffmpeg-static fails on Vercel edge | Use node runtime explicitly for audio endpoint; fallback to client-side ffmpeg.wasm if deployment blocks it |
| Master ZIP too large for response | Stream ZIP (don't buffer); cap segments at 20; document 500MB response limit |
| Contact sheet quality varies | Default beats prompt includes director fingerprint + DNA lookDescription; "Regenerate this frame only" button in editor lets user fix single bad frames |
| User expects stem separation | Explicitly out of scope for this plan; parked for follow-on |
| E005 filter gets fixed by ByteDance mid-ship | Great — doesn't invalidate the kit; Seedance becomes a drop-in target that accepts the same kit |

## Out of scope (reaffirmed)

- Animated waveform wrappers
- Lyric video export
- Still-image audio wrappers (cover art + audio)
- Written-prompt output (contact sheet supersedes)
- Seedance 2.0 face-ref integration (E005 blocked)
- Song stem separation
- Auto beat-detection for segment suggestions (user picks segments manually)
