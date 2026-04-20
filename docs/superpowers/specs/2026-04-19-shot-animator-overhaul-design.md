# Shot Animator Overhaul — Design

**Date:** 2026-04-19
**Branch:** `feat/shot-animator`
**Worktree:** `D:/git/dp-shot-animator`
**Dev port:** 3004

---

## Purpose

Tighten the Shot Animator feature into a focused, reliable tool by:

1. **Slimming the model catalog** from 8 models to 3 curated Seedance models (1.5 Pro, 2.0 Fast, 2.0) — the rest have been deprecated upstream or are redundant.
2. **Adding video-reference support** for Seedance 2.0 / 2.0 Fast via Replicate's native `reference_videos[]` input, with an in-browser scrub-and-crop UI that trims uploads to exactly 14.5 seconds before sending (under Replicate's 15s hard cap).
3. **Fixing 17 audit issues** uncovered while reviewing the feature — ranging from blocking batch-generation bugs (silent drops, lost settings) to UX polish (search, download filenames, empty states).

## Out of scope

- Changes to music-lab, storyboard, shot-creator, recipes, brand-studio, or any shared infrastructure outside `src/features/shot-animator/`.
- New models beyond the three Seedance variants.
- Text-to-video mode (the tool stays image-to-video + video-reference).
- Audio generation / lip-sync.

---

## Phased delivery

Three independent, shippable phases. Each commits + pushes on its own.

### Phase A — Model slimdown + Tier 1 fixes

**Model catalog change** (`src/features/shot-animator/config/models.config.ts`)

Keep only these three, in this order:

| ID | Display | Tier | Source |
|---|---|---|---|
| `seedance-1.5-pro` | Seedance 1.5 Pro | Premium | `bytedance/seedance-1.5-pro` |
| `seedance-2.0-fast` | Seedance 2.0 Fast | Balanced | `bytedance/seedance-2.0-fast` |
| `seedance-2.0` | Seedance 2.0 | Premium | `bytedance/seedance-2.0` |

Remove: `wan-2.2-5b-fast`, `wan-2.2-i2v-fast`, `seedance-pro-fast`, `seedance-lite`, `kling-2.5-turbo-pro`, `p-video`, `seedance-pro` (legacy).

Migration for persisted state: `onRehydrateStorage` in `shot-animator.store.ts` maps any removed model ID on an existing shot to `seedance-2.0-fast` and toasts once ("Some shots were migrated to Seedance 2.0 Fast — older models have been retired.").

**Tier 1 audit fixes:**

- **#1 — Highlight shots missing prompts.** Add red border + warning icon on `CompactShotCard` when `includeInBatch && !prompt.trim()`. Change `generateVideos` validation toast from generic count to listing the first 3 shot names: *"The Wide Shot, Dolly In, and 2 more are missing prompts. Fix those before generating."*
- **#2 — Preserve settings on model switch.** The two `useEffect`s in `ShotAnimatorView` that reset `lastFrameImage` / `aspectRatio` when the user changes model (lines ~263-309 of current file) silently throw away user work. Replace with a warning toast *only when the new model literally can't support the feature*, and drop the field only after explicit confirmation via a `confirm()`-style dialog. Store which settings are incompatible in the model config itself (new `supports: { lastFrame, aspectRatio[], referenceVideos }` block).
- **#4 — Search prompts.** In `AnimatorControls` search input, match against `shot.prompt` in addition to `shot.imageName`. Case-insensitive, OR semantics.
- **#6 — Smart download filenames.** `AnimatorUnifiedGallery.handleDownloadBlob` and `ShotAnimatorView` download path both produce `video_<timestamp>.mp4`. Replace with `<shot-name-slug>_<model-id>_<prompt-slug-20ch>.mp4` — e.g. `wide-shot-02_seedance-2-0-fast_neon-street-rain.mp4`. Extract a single `videoDownloadFilename(shot, model)` helper into `src/features/shot-animator/utils/filenames.ts` so both call sites use it.

### Phase B — Seedance 2.0 video-reference support + cropper

**Data model**

`ShotAnimationConfig` gets a new field:

```ts
referenceVideos?: Array<{
  url: string          // R2 URL of cropped clip
  durationSec: number  // always ≤ 14.5
  originalName: string
  token: string        // e.g. "[Video1]"
}>
```

`referenceVideos` is only populated when `model === 'seedance-2.0' || model === 'seedance-2.0-fast'`. On model switch to any other model the field is stripped (with warning toast — see #2 pattern).

**New API route: `/api/video/crop`**

- Accepts multipart upload: `file` (video, max 100MB), `startSec` (number), `endSec` (number, must be > startSec, duration must be ≤ 14.5).
- Validates constraints server-side. Rejects with 400 on violation.
- Runs `ffmpeg -ss <start> -i <input> -to <length> -c copy -avoid_negative_ts make_zero <output.mp4>` — stream copy for speed, no re-encode. Falls back to `-c:v libx264 -preset fast -crf 22` if stream-copy produces invalid output (keyframe alignment issues).
- Uploads resulting clip to R2 under `temp/shot-animator-refs/<uuid>.mp4` via existing `r2-storage.service`.
- Returns `{ url, durationSec }`.
- `maxDuration = 60` on the route (crop + upload should finish well under that).
- Orphan GC: existing R2 GC job sweeps `temp/` after 7 days (already in place per `CLAUDE.md`).

**New component: `CropVideoModal`** (`src/features/shot-animator/components/CropVideoModal.tsx`)

- Opens when user drops a video file into the shot card (or clicks a new "Add video reference" button, visible only for Seedance 2.0 models).
- Renders a `<video>` element with a custom scrub UI:
  - Two draggable handles on a timeline (start / end)
  - Live preview that plays `start → end` on loop
  - Duration readout; turns red if > 14.5s
  - Confirm button disabled until duration ≤ 14.5
- On confirm: POSTs blob slice to `/api/video/crop` (actually sends the full file + start/end — server does the crop), shows a spinner, then writes the returned `{url, durationSec}` into the shot's `referenceVideos` array with a token `[Video1]`, `[Video2]`, etc.
- Cancel discards.

**Generation wiring** (`useVideoGeneration.ts`)

In `generateSingleVideo`, when model is Seedance 2.0 / 2.0 Fast, pass `reference_videos: shot.referenceVideos.map(v => v.url)` to `/api/generation/video`. Leave other models' request shape untouched.

**Prompt-token helper**

Small UI affordance in `CompactShotCard` prompt input: when a shot has `referenceVideos`, show the tokens `[Video1] [Video2]` as clickable chips above the textarea. Clicking one inserts it at cursor position.

**Model config**

Mark Seedance 2.0 and 2.0 Fast with `supports: { referenceVideos: true, maxRefVideos: 4 }`. Keep 1.5 Pro at `supports: { referenceVideos: false }`.

### Phase C — Tier 2 + Tier 3 polish

Bundled as one commit per item so they can be reverted independently. All touch only `src/features/shot-animator/`.

- **#3 — Deduplicate `filesToShotConfigs`**: extract from `ShotAnimatorView.tsx` and `AnimatorControls.tsx` into `src/features/shot-animator/utils/file-to-config.ts`.
- **#5 — Fix download path inconsistency**: `ShotAnimatorView`'s non-blob download (lines ~490-498) gets replaced by the same `handleDownloadBlob` that `AnimatorUnifiedGallery` uses.
- **#7 — Scope the Ctrl+V handler**: global document-level paste listener in `ShotAnimatorView` (lines ~116-135) swallows pastes on the admin dashboard if the user has Shot Animator open in another tab. Attach to a ref on the animator root `<div>` and only fire when `document.activeElement` isn't an input/textarea.
- **#8 — Warn on base64 drop on refresh**: `shot-animator.store.ts` `partialize` silently drops locally-uploaded shots (no gallery URL). Add a `onRehydrateStorage` check that compares pre- and post-rehydrate shot counts and toasts once: *"3 locally-uploaded shots were dropped because they weren't saved to the gallery. Upload to the gallery first to keep them across refreshes."*
- **#9 — Empty state rework**: replace the current placeholder with a 2-column illustrated onboarding (left: "Drop images or paste from clipboard", right: "Use the gallery picker"), pulling from the existing icon set. Max 2 sentences of copy.
- **#10 — Pricing in tier labels**: `MODEL_TIER_LABELS` currently shows tier only. Append per-second cost e.g. *"Balanced · $0.08/s"*. Source from each model's pricing constant.
- **#11 — "Show only selected" empty view**: when filter hides every shot, show a "No shots match filter — clear filter" button rather than an empty panel.
- **#12 — Clear all button**: add to `AnimatorControls` overflow menu. Confirmation dialog. Calls `clearShotConfigs`.
- **#13 — Promote prompt tips**: the "Tips for better prompts" panel is buried. Move inline to the empty state of the prompt textarea when a shot is first created.
- **#14 — Lift `multiShotMode` into config**: `CompactShotCard` line 57 holds it as local `useState` — lost on unmount/reorder. Move to `ShotAnimationConfig.multiShotMode` with default `false`.
- **#15 — Cost confirmation threshold**: current hard-coded 100 pts in `ShotAnimatorView` (lines ~466-469). Move to a `CONFIRM_COST_THRESHOLD_PTS` constant at the top of the file with a comment explaining the threshold.
- **#16 — Loading state coverage**: `generationPhase` transitions are set on `generateVideos` but not `retrySingleVideo`. Fix so retry also shows phase progression.
- **#17 — Keyboard reordering**: add `Alt+↑ / Alt+↓` handlers on focused shot cards to move up/down within the list.

---

## Architecture notes

### File boundaries

New files:

- `src/features/shot-animator/utils/filenames.ts` — `videoDownloadFilename(shot, model)`
- `src/features/shot-animator/utils/file-to-config.ts` — extracted helper
- `src/features/shot-animator/components/CropVideoModal.tsx` — scrub UI
- `src/features/shot-animator/services/crop-video.service.ts` — client-side POST to `/api/video/crop`
- `src/app/api/video/crop/route.ts` — ffmpeg + R2 upload

Modified files (scoped to this feature):

- `config/models.config.ts` — catalog slimdown, `supports` block
- `hooks/useVideoGeneration.ts` — `reference_videos` wiring, retry phase fix
- `hooks/useVideoPolling.ts` — no changes expected
- `store/shot-animator.store.ts` — model migration, base64 drop warning, `multiShotMode` field
- `components/ShotAnimatorView.tsx` — Ctrl+V scoping, download path unification, settings-preservation logic
- `components/AnimatorControls.tsx` — search, clear-all, tier labels with price
- `components/CompactShotCard.tsx` — missing-prompt highlight, video-ref chips, alt+arrow keys, multi-shot from config
- `components/AnimatorUnifiedGallery.tsx` — smart download filename
- `types/index.ts` — new `referenceVideos` and `multiShotMode` fields on `ShotAnimationConfig`

### Testing

- **Playwright visual audit** of each phase in the worktree dev server on port 3004 before commit. (Known blocker: `TEST_USER_EMAIL` / `PASSWORD` in `.env.local` return "Invalid login credentials" — needs fresh creds from user or a new test account before Phase A lands.)
- **Manual crop test** for Phase B: upload a 30s sample, scrub to 10s clip, confirm it round-trips through R2 and appears in the generation request as a valid URL.
- **Unit-level sanity**: no new test infrastructure. The shot-animator feature has no existing test suite; Playwright end-to-end is the only practical verification.

### Rollout / rollback

Phases are independent commits. Rollback is `git revert <phase-commit>`.

Model migration is one-way (removed IDs → `seedance-2.0-fast`). Reverting Phase A leaves any user whose shots got migrated stuck on `seedance-2.0-fast` until they pick again — acceptable.

Phase B's `referenceVideos` field is additive on `ShotAnimationConfig`; reverting leaves `undefined` values in persisted state that are safely ignored by older code.

---

## Open issues surfaced during design

- **Test credentials are stale.** `TEST_USER_EMAIL=taskmasterpeace@gmail.com` with password `TA$K2004` returns "Invalid login credentials" on the dev server. Visual verification of phases is blocked until the user supplies working creds or a fresh test account. This is called out in the plan's Phase A prerequisites.
- **R2 temp cleanup schedule.** The existing 7-day orphan GC (per `MEMORY.md`) covers cropped clips, but a reference clip uploaded then never used will sit in R2 for 7 days. Acceptable — matches existing behavior for other reference uploads.
- **Seedance 1.5 Pro Fast does NOT exist** on Replicate (404 from the research subagent). Initial user request included it; corrected to the three models above.
