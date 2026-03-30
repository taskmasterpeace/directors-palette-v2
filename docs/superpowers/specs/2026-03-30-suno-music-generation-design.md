# Suno Music Generation — In-App Integration

## Summary

Bring Suno music generation directly into Directors Palette via MuAPI. Users generate full songs from Writing Studio and instrumentals from Sound Studio without leaving the app. Audio saves to the artist's catalog. 12 pts per generation, 2 variations returned.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where to generate | Writing Studio + Sound Studio | Generate where you create — no new pages |
| UI pattern | Slide-out drawer (Approach B) | Keeps creative context, gives audio room to breathe |
| Results per generation | 2 variations, user picks | Matches Suno's native behavior |
| Audio storage | Artist catalog | Artist is the hub — their discography lives with them |
| Pricing | 12 pts per generation | Premium feature, returns 2 songs |
| Persona/voice cloning | Deferred to v2 | Ship core generation loop first |
| API provider | MuAPI (Suno proxy) | Single API key, handles Suno complexity |

## API Integration

### MuAPI `suno-create-music`

**Endpoint:** `POST https://muapi.ai/api/v1/suno-create-music`
**Auth:** `x-api-key: {MUAPI_KEY}` header

**Request body (Writing Studio — full song with vocals):**
```json
{
  "prompt": "<formatted lyrics from Writing Studio>",
  "style": "<style prompt from buildSunoStylePrompt()>",
  "custom_mode": true,
  "title": "<song title>",
  "instrumental": false,
  "negative_tags": "<exclude prompt from buildSunoExcludePrompt()>",
  "vocal_gender": "<optional, from artist DNA>",
  "model": "v4"
}
```

**Request body (Sound Studio — instrumental only):**
```json
{
  "prompt": "",
  "style": "<prompt from Sound Studio store>",
  "custom_mode": true,
  "title": "<optional title>",
  "instrumental": true,
  "negative_tags": "<negative tags from Sound Studio>",
  "model": "v4"
}
```

**Response (async — poll for completion):**
```json
{
  "id": "<request_id>",
  "status": "pending" | "processing" | "completed" | "failed",
  "audio": [
    { "url": "https://...", "duration": 180 },
    { "url": "https://...", "duration": 180 }
  ]
}
```

**Polling:** `GET https://muapi.ai/api/v1/predictions/{request_id}/result` until `status === "completed"`. Expected wait: 30-60 seconds.

### Environment Variables

```
MUAPI_KEY=<api key from muapi.ai dashboard>
```

Add to `.env.local` alongside existing keys.

## Architecture

### New Files

```
src/app/api/music/generate/route.ts          — POST: submit generation request
src/app/api/music/status/[id]/route.ts       — GET: poll generation status
src/app/api/music/save/route.ts              — POST: save picked track to catalog

src/features/music-lab/components/generation/
  GenerationDrawer.tsx                        — Slide-out drawer shell
  GenerationStatus.tsx                        — Progress/spinner during generation
  VariationCard.tsx                           — Audio player + pick/discard actions
  GenerationHistory.tsx                       — Past generations for this song

src/features/music-lab/store/generation.store.ts  — Generation state (jobs, results, history)
src/features/music-lab/services/muapi.service.ts  — MuAPI client (generate, poll, etc.)
src/features/music-lab/types/generation.types.ts  — Types for jobs, results, audio tracks
```

### Modified Files

```
SunoExportPanel.tsx          — Add "Generate Song" button (opens drawer)
SunoPromptPreview.tsx        — Add "Generate Beat" button (opens drawer)
artist-dna.types.ts          — Add audioUrl field to CatalogEntry
artist-dna.store.ts          — Add saveCatalogAudio action
```

### Data Flow

```
Writing Studio / Sound Studio
  ↓ (existing prompt builders assemble style + lyrics)
"Generate" button clicked
  ↓
POST /api/music/generate
  ↓ (server-side: charge 12 pts, call MuAPI, return request_id)
Client polls GET /api/music/status/{id}
  ↓ (30-60 sec, show progress in drawer)
Status: completed → 2 audio URLs returned
  ↓
GenerationDrawer shows 2 VariationCards with audio players
  ↓
User picks favorite → POST /api/music/save
  ↓ (download audio → upload to R2 → update catalog entry)
Audio URL saved to artist's CatalogEntry.audioUrl
```

### Audio Storage

Audio files go to **Cloudflare R2** (same as video storage):
- Path: `music/{userId}/{artistId}/{trackId}.mp3`
- Public URL via existing R2 bucket: `https://pub-5db40a08df07458593b2b31de8bb6b62.r2.dev/music/...`
- Reuse existing `r2-storage.service.ts` — add a `uploadMusic()` method

### Credit Charging

- Charge **12 pts** at generation time (before calling MuAPI)
- If MuAPI fails, refund the pts
- Same pattern as image generation: check balance → deduct → call API → refund on failure

## UI Design — Generation Drawer

### Trigger
- Writing Studio: "Generate Song" button replaces/augments "Copy All" in SunoExportPanel
- Sound Studio: "Generate Beat" button below the Suno Prompt Preview

### Drawer Layout (slides in from right, ~400px wide)

```
┌─────────────────────────────────┐
│  ✕  Generate Song    12 pts     │
├─────────────────────────────────┤
│                                 │
│  [Generating...]                │
│  ████████░░░░░░  ~30s remaining │
│                                 │
├─────────────────────────────────┤
│  Variation A                    │
│  ▶ ━━━━━━━━━━━━━━━━━━━ 3:12    │
│  [Pick This]  [Download]        │
│                                 │
│  Variation B                    │
│  ▶ ━━━━━━━━━━━━━━━━━━━ 3:08    │
│  [Pick This]  [Download]        │
│                                 │
├─────────────────────────────────┤
│  [Regenerate]                   │
├─────────────────────────────────┤
│  History                        │
│  ▸ Gen #1 — Mar 30, 3:12       │
│  ▸ Gen #2 — Mar 30, 3:08       │
└─────────────────────────────────┘
```

### States
1. **Idle** — drawer closed, button shows "Generate Song" / "Generate Beat"
2. **Generating** — drawer open, progress indicator, ~30-60 sec wait
3. **Results** — two variation cards with audio players
4. **Saved** — confirmation toast, drawer can close, catalog updated

### Audio Player
- HTML5 `<audio>` element with custom styled controls
- Play/pause, seek bar, time display
- No need for waveform visualization in v1 — keep it simple

## Clarifications (from spec review)

### Catalog Save Model
- **Writing Studio:** "Pick This" attaches audio to the EXISTING catalog entry (matched by active song). If no catalog entry exists yet, one is created with the current title + lyrics + audioUrl.
- **Sound Studio:** "Pick This" creates a NEW catalog entry with `title` (from a title input in the drawer), empty lyrics, `mood: "instrumental"`, and the audioUrl.
- User can pick BOTH variations — each gets saved as a separate catalog entry (or one attached, one new).

### Artist Context Requirement
- Generate buttons are disabled when no artist is active. The drawer requires an `artistId` to save.

### Generation History
- **v1: Zustand with persist (localStorage).** Session-durable, survives refresh. No database table needed yet. History capped at 20 entries per artist, oldest pruned.

### "Tweak & Retry" — Removed for v1
- Removed from wireframe. Just "Regenerate" (re-reads current studio state with fresh prompts) and "Pick This". Keeps scope tight.

### Polling Details
- Interval: **3 seconds**
- Max attempts: **40** (= 120s ceiling)
- If user closes drawer mid-generation, polling continues in background. Reopening drawer shows results if completed.
- If user navigates away from Music Lab, generation is abandoned (no background persistence in v1).

### Audio URL Lifetime
- MuAPI/Suno URLs are assumed temporary. The save flow MUST download and re-upload to R2 immediately when user picks. Download button uses MuAPI URL directly (ephemeral — works during the session).

### Concurrent Generations
- One generation at a time. "Generate" button disabled while a job is in progress. User must wait for results or cancel before starting another.

### Mobile Behavior
- Drawer becomes a full-screen modal on screens < 640px. Same content, different container.

### Audio Playback
- Exclusive playback: playing Variation B auto-pauses Variation A.

### maxDuration for API Routes
- `/api/music/generate`: 30s (submits to MuAPI and returns request_id)
- `/api/music/status/[id]`: 15s (simple proxy poll)
- `/api/music/save`: 120s (downloads audio from MuAPI + uploads to R2)

### Lyrics Source
- Generation reads from SunoExportPanel's override values if present, otherwise computed values. Same source the user sees in the export panel.

### Suno Field Limits
- `style`: 1000 chars (already enforced by existing prompt builders)
- `prompt` (lyrics): 3000 chars (Suno's limit — add validation)
- `negative_tags`: 200 chars (add validation)

## Error Handling

| Error | Handling |
|-------|----------|
| Insufficient pts | Show modal (existing `CreditInsufficiencyModal`) |
| MuAPI timeout (>120s) | Show retry button, refund pts |
| MuAPI error/failure | Show error message in drawer, refund pts |
| Network error during poll | Auto-retry 3 times, then show retry button |
| R2 upload failure on save | Show error, keep MuAPI URLs as fallback |

## Testing

- API route: cURL tests for generate, status, save endpoints
- UI: Playwright tests for drawer open/close, generation flow with mocked API
- Integration: End-to-end generation with real MuAPI call (manual test)

## Future (v2)

- Persona creation: "Save Voice" from a generated track → create Suno persona → link to artist voice
- `suno-extend-music`: Extend tracks beyond standard length
- `suno-remix-music`: Restyle existing tracks
- `suno-add-vocals` / `suno-add-instrumental`: Layer vocals onto beats and vice versa
- `suno-generate-mashup`: Combine multiple tracks
- Waveform visualization in player
- Batch generation (generate multiple songs at once)
