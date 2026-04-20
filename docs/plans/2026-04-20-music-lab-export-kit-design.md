# Music Lab — Export Kit Design

**Date:** 2026-04-20
**Branch:** `feat/music-lab`
**Status:** Draft — awaiting sign-off before implementation plan

---

## Why

Seedance 2.0's input filter (E005) rejects any reference image containing a realistic face (see
`docs/research/2026-04-19-seedance-2.0-phase0-findings.md`). Rather than fight the filter, we
pivot Music Lab's value prop:

> **DP v2 is the music video pre-production hub. Users assemble the pieces here, then take the
> kit to any external video generator that doesn't have ByteDance's face filter (Kling, Runway,
> Minimax, Sora, etc.) to actually produce the video.**

This positions DP v2 as indispensable ideation + asset-prep infrastructure. We ship a
filter-agnostic tool that works today, and we keep text-only Seedance 2.0 as one optional
generator for filter-safe shots.

## The Export Kit (per song segment)

For a user-selected ~15s window of a song, the user can download a bundle containing:

| File | Source | Purpose |
|------|--------|---------|
| `character-sheet.jpg` | Existing artist asset | **Who** — artist identity reference (multi-pose grid: neutral/performing/intense/etc.) |
| `contact-sheet.jpg` | **NEW recipe** | **What happens** — visual brief showing the 6-frame storyboard for these 15s |
| `audio-15s.mp4` | ffmpeg-wrapped audio | Black-screen MP4 of the 15s clip — uploadable to tools that reject raw audio |
| `kit-notes.txt` | Auto-generated | Segment label, start/end timestamps, artist name, tempo, any user notes |

Both "sheets" are deliberately named to avoid confusion: the **character sheet** answers
*"who is the artist?"* (existing app asset — the full-body + expression grid shown in artist
profiles), and the **contact sheet** answers *"what should happen during these 15 seconds?"*
(the new recipe we're building — 6-frame visual storyboard specific to the segment). The
external video generator needs both: identity + scene direction.

Master-level ZIP for the whole song that bundles the song MP3 + character sheet + every
segment ZIP + `coverage-report.txt` (see Export tracking below).

## User flow

1. User opens artist page → Music Lab tab → "Export Kit" sub-tab.
2. Song loads with waveform (same interaction pattern as the Seedance playground —
   `docs/playgrounds/seedance-2-panel.html`).
3. User scrubs and drags to drop segment markers on the waveform. Max 15s each. Can create
   multiple segments that cover different parts of the song.
4. For each segment, user clicks **"Generate contact sheet"** → opens a contact-sheet editor
   modal where they describe what the segment should show visually (location, props, camera,
   mood). The recipe runs, produces a JPG grid.
5. User clicks **"Download kit"** on any segment → ZIP downloads with the 4 files above.
6. Optional: **"Download everything"** button at song level → master ZIP.

## The Contact Sheet Recipe (new subsystem)

Lives at `src/features/recipes/contact-sheet/` so it's reusable outside Music Lab (Storyboard,
Shot Creator, etc. can also call it).

### Input schema

```ts
type ContactSheetInput = {
  // Required
  frames: number;                     // how many stills (default 6)
  layout: '2x3' | '3x2' | '2x2' | '3x3';
  segmentDuration: number;            // seconds — shown in header
  segmentLabel: string;               // e.g., "Verse 1", "Hook", user-chosen

  // Per-frame content
  beats: Array<{
    timecode: string;                 // "0–2.5s"
    description: string;              // "Wide establishing: Texas roadside, golden hour"
    // The recipe renders a still from this description
  }>;

  // Identity + style context
  artistContext?: {
    lookDescription: string;          // from artist DNA (look.physicalAppearance, filtered through bannedWords)
    signatureStyle: string;           // from artist DNA (look.signatureStyle)
  };
  directorFingerprint?: string;       // optional, injected into every per-frame prompt
  bannedWords?: string[];             // global filter applied to every prompt
};
```

### Output

- One JPG, composited server-side (sharp, not browser canvas, so it works from API calls too).
- Layout: header band (artist name + segment label + timecode range), grid of stills, caption band under each still with its beat description + timecode.
- Stored in Supabase `directors-palette` bucket under `contact-sheets/{artistId}/{timestamp}_{segmentId}.jpg`.

### Engine

- Stills generated via `gemini-2.5-flash-image` (nano-banana — the app's default image generator).
- Per-frame prompt = `[directorFingerprint] + [artistContext.lookDescription] + [beat.description]` with `bannedWords` stripped.
- Compositing: `sharp` (already in deps) — N image buffers + text overlay via SVG.
- Cost estimate: 6 frames × $0.004/frame = ~$0.024 per contact sheet (before compositing).

### Why a recipe, not an ad-hoc feature

The user explicitly called out wanting a "contact sheet recipe." Making it a recipe means:
- It shows up in the Recipes catalog and admin dashboard like other recipes (AIOBR, etc.).
- Reusable from Storyboard, Shot Creator, or as a v2 public API endpoint later.
- Other features can cheaply add "generate a contact sheet for this" as a one-liner.

## Audio-to-MP4 wrapping

The simplest tech that ships.

### Input
- Song MP3 URL (Supabase)
- Start/end seconds
- Artist name + segment label (for file metadata)

### Output
- MP4: single solid black frame @ 480p @ the segment's duration, song's clipped audio as the audio track
- Stored in Supabase `directors-palette` under `audio-kits/{artistId}/{segmentId}.mp4`

### Implementation
Server-side `ffmpeg` on Vercel (via `ffmpeg-static` npm package or Edge runtime). One command:

```
ffmpeg -f lavfi -i color=c=black:s=640x360:d=${duration} \
       -ss ${start} -t ${duration} -i ${songUrl} \
       -map 0:v -map 1:a -c:v libx264 -c:a aac \
       -shortest output.mp4
```

Non-blocking — fire-and-forget API job, progress surfaced in UI. Same pattern as existing generation jobs.

## ZIP bundling

Use `jszip` (or `archiver` if we need streaming) in `/api/music-lab/export-kit/[segmentId]/zip`.
Pulls the 4 files from Supabase, streams a zip response. Filename: `${artistName}_${segmentLabel}_kit.zip`.

Master zip: `/api/music-lab/export-kit/song/[songId]/zip` — bundles every segment's kit plus the
master song MP3 + top-level character sheet.

## Export tracking

The user needs to know which parts of the song they've already exported so they don't lose track
across sessions or accidentally leave gaps.

### Persistence

New Supabase table `music_lab_exports`:

```sql
create table music_lab_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  artist_id uuid not null references artist_profiles(id),
  song_id text not null,              -- or song URL hash if songs aren't rows
  segment_id text not null,           -- client-generated uuid
  segment_label text,                 -- e.g., "Hook 1", user-chosen
  start_s numeric not null,
  end_s numeric not null,
  duration_s numeric generated always as (end_s - start_s) stored,
  contact_sheet_url text,             -- stored sheet in Supabase
  audio_clip_url text,                -- stored mp4 in Supabase
  exported_at timestamptz not null default now(),
  download_count int not null default 1
);

create index music_lab_exports_user_song_idx on music_lab_exports (user_id, song_id, start_s);
```

Every time the user hits "Download kit" we upsert a row (bumping `download_count` if the same
segment is re-downloaded). The contact sheet and audio clip stay in Supabase storage so
re-downloads don't re-generate (unless the user regenerates the contact sheet).

### UI affordances

1. **Per-segment status badge** in the segment table:
   - `● never exported` (muted dot)
   - `✓ exported 2x · Apr 18` (green check)
2. **Song coverage strip** above the segment table: a thin horizontal bar matching the waveform
   width. Green bands over exported ranges, muted over unexported. At-a-glance gap detection.
3. **Coverage report** in the master ZIP: `coverage-report.txt` lists every exported range:
   ```
   Dusty Exit 9 — Country Fat
   Total song: 0:00 - 3:24 (204s)

   Exported segments (3 of 3 used):
     0:12 - 0:27  (15s) · Hook 1     · exported 2x on 2026-04-19
     1:08 - 1:23  (15s) · Verse 1    · exported 1x on 2026-04-19
     3:09 - 3:24  (15s) · Outro      · exported 1x on 2026-04-20

   Uncovered ranges:
     0:00 - 0:12  (12s)
     0:27 - 1:08  (41s)
     1:23 - 3:09  (106s)
   ```
4. **"My exports" view** at the Music Lab top level: flat list of every export across all
   songs/artists the user has worked on, newest first. Re-download any kit with one click.

## UI skeleton

```
┌─────────────────────────────────────────────────────────────┐
│  Music Lab · Export Kit                                     │
├─────────────────────────────────────────────────────────────┤
│  Song: "Dusty Exit 9" — 3:24 · 92 BPM                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ [waveform with segment markers — drag to edit]       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Segments (3)                     [+ Add segment]           │
│  Song coverage: ████░░░░██░░░░░░░░░░░░░░░████          │
│                                                             │
│  ┌──────────┬────────┬──────────────┬───────────┬─────────┐│
│  │ Hook 1   │ 0:12 - │ Contact Sheet│ Exports   │         ││
│  │          │ 0:27   │ ✓ generated  │ ✓ 2x      │ [ZIP]   ││
│  ├──────────┼────────┼──────────────┼───────────┼─────────┤│
│  │ Verse 1  │ 0:30 - │ [Generate] ←─│ ● never   │ [_]     ││
│  │          │ 0:45   │              │           │         ││
│  ├──────────┼────────┼──────────────┼───────────┼─────────┤│
│  │ Outro    │ 3:09 - │ ✓ generated  │ ✓ 1x      │ [ZIP]   ││
│  │          │ 3:24   │              │           │         ││
│  └──────────┴────────┴──────────────┴───────────┴─────────┘│
│                                                             │
│  [Download everything as master ZIP]                        │
└─────────────────────────────────────────────────────────────┘
```

## File map (planned)

### New files

```
src/features/music-lab/
  components/
    ExportKitTab.tsx                   # top-level tab component
    SegmentPicker.tsx                  # waveform + segment drag/drop
    SegmentRow.tsx                     # one row in the segment table
    ContactSheetModal.tsx              # edit beats, then trigger recipe
  hooks/
    useSegments.ts                     # zustand slice for segment state
    useExportKit.ts                    # orchestrates kit download
  services/
    export-kit.service.ts              # wraps API calls
  types/
    export-kit.ts

src/features/recipes/contact-sheet/
  recipe.ts                            # recipe definition
  composer.ts                          # sharp-based image compositing
  prompt-builder.ts                    # per-frame prompt synthesis with DNA + bannedWords

src/app/api/music-lab/export-kit/
  [segmentId]/
    zip/route.ts                       # per-segment zip — writes music_lab_exports row
    audio/route.ts                     # audio-to-mp4 wrap
  song/[songId]/
    zip/route.ts                       # master zip — includes coverage-report.txt
    history/route.ts                   # GET: list of exports for this song
  history/route.ts                     # GET: "My exports" — all exports for the user

supabase/migrations/
  2026-04-20-music-lab-exports.sql     # music_lab_exports table

src/app/api/recipes/contact-sheet/
  generate/route.ts                    # recipe execution
  [id]/route.ts                        # fetch stored sheet
```

### Modified files

- `src/features/music-lab/components/MusicLabPanel.tsx` — add Export Kit tab
- `src/features/recipes/services/recipes.service.ts` — register contact-sheet recipe
- `package.json` — add `jszip`, `ffmpeg-static` (verify `sharp` is already there)

## Open questions (non-blocking)

1. **Contact sheet cost to user** — should this be free or priced like other recipes? Suggest 30 pts (6 frames × 5 pts).
2. **Max segments per song** — cap at 20? Or unlimited? Affects master ZIP size.
3. **Segment regeneration** — if the user edits the beats and regenerates the contact sheet, do we keep the old one or overwrite? Suggest keep versioned.

## Out of scope (deliberately)

- Animated waveform wrappers — user rejected
- Lyric videos — user rejected
- Static-image audio wrappers (cover art + audio) — user rejected black screen only
- Written prompt as kit output — user explicitly said "the prompt won't matter" because the contact sheet communicates visually
- Seedance 2.0 integration for face refs — blocked by E005, revisit later

## Next step

Sign-off on this design. Then I'll produce the implementation plan with ordered tasks and
explicit file-by-file changes (following the `writing-plans` skill pattern used in prior Music
Lab work).
