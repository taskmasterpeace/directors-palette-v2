# Artist Vibe Beat — Design Spec

## Goal

Generate an instrumental "theme beat" from an artist's DNA that auto-plays at low volume when entering their workspace. One button, no configuration — the prompt builds automatically from the artist's sound profile.

## Architecture

Uses the existing MuAPI generation pipeline (`/api/music/generate` with `mode: 'instrumental'`). A new utility function `buildVibePrompt(dna)` maps Artist DNA fields to a Suno style prompt. The generated audio downloads from MuAPI's temp URL, uploads to R2 for permanent storage, and persists the R2 URL in the artist's DNA object in Supabase.

**Save flow:** After the user picks a variation from GenerationDrawer, a new `saveVibeBeat()` store action handles the full pipeline:
1. Downloads audio from MuAPI temp URL via `/api/music/download-to-r2` (new API route)
2. Patches `dna.vibeBeat` with the R2 URL, duration, and metadata
3. Calls `artistDnaService.updateArtist()` to persist the updated DNA to Supabase

This is separate from `saveTrack()` which saves to the catalog — vibe beats are NOT catalog entries.

## Data Model

Add `VibeBeat` interface AND add `vibeBeat?: VibeBeat` field to the existing `ArtistDNA` interface in `artist-dna.types.ts`:

```typescript
interface VibeBeat {
  audioUrl: string      // R2 public URL (permanent)
  duration: number      // seconds
  title: string         // "Vibe Beat" or auto-generated
  volume: number        // 0-1, user's last volume setting (default 0.2)
  createdAt: string     // ISO timestamp
}

// Add to existing ArtistDNA interface:
interface ArtistDNA {
  // ...existing fields...
  vibeBeat?: VibeBeat   // <-- add this optional field
}
```

Stored at `dna.vibeBeat`. No schema migration needed — JSONB field.

## Prompt Building

`buildVibePrompt(dna: ArtistDna) → { style: string, negativeTags: string }`

Maps DNA fields to Suno style prompt:

| DNA Field | Prompt Usage |
|-----------|-------------|
| `sound.genres` | Primary genre tags |
| `sound.subgenres` | Sub-genre tags |
| `sound.microgenres` | Micro-genre tags |
| `sound.instruments` | Instrumentation list |
| `sound.productionPreferences` | Production style tags |
| `sound.soundDescription` | Extra flavor (truncated to 200 chars) |

Always instrumental. Negative tags always include: `"no vocals, no singing, no humming, no choir, no spoken words"`.

**Tempo from catalog:** `CatalogEntry.tempo` is a `string` field (e.g. `"120"`, `"fast"`, `"85 BPM"`). `buildVibePrompt` should attempt to parse numeric BPM via regex (`/\d+/`). If a number is found, include it as `"<N> BPM"` in the style prompt. If the value is non-numeric (e.g. `"fast"`, `"slow"`), include it as-is as a tempo descriptor. If no catalog entries have tempo data, omit tempo entirely.

**Character limit:** 1000 chars for style prompt (Suno limit). Truncate least-important fields first: soundDescription, then productionPreferences, then microgenres. After truncation, log a warning with the original and truncated lengths.

**Negative tags:** The `negativeTags` output maps to `excludePrompt` on the `GenerateRequest` type, which becomes `negative_tags` in the MuAPI request body. No character limit on negative tags.

## UI Components

### 1. Generate Vibe Beat Button (`GenerateVibeButton.tsx`)

- **Location:** Inside `ConstellationWidget` (real component at `src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx`, re-exported via barrel at `src/features/music-lab/components/artist-dna/ConstellationWidget.tsx`). Rendered below the artist name/portrait area.
- **Visibility:** Only when `dna.vibeBeat` does not exist
- **Appearance:** Small music note icon + "Generate Vibe Beat — 12 pts" text
- **Behavior:** Calls `/api/music/generate` with auto-built prompt, opens GenerationDrawer with 2 variations. User picks one → `saveVibeBeat()` handles download-to-R2 + DNA persistence (see Save Flow above).
- **Disabled state:** When artist has no genres set (insufficient DNA to build a meaningful prompt). Tooltip: "Add genres to your artist profile first"

### 2. Vibe Beat Player (`VibeBeatPlayer.tsx`)

Props:
```typescript
interface VibeBeatPlayerProps {
  vibeBeat: VibeBeat
  audioRef: React.RefObject<HTMLAudioElement | null>
  onRegenerate: () => void
}
```

- **Location:** Inside `ConstellationWidget`, replaces the generate button after vibe beat exists
- **Appearance:** Small speaker/volume icon (16px)
- **Interaction:** Click/tap reveals a small horizontal volume slider (0-100%)
- **Volume persistence:** Volume saves to `dna.vibeBeat.volume` via a dedicated `updateVibeBeatVolume(volume: number)` store action (NOT `saveVibeBeat()`). This action patches only the volume field in the DNA and calls `artistDnaService.updateArtist()`. **Debounced at 500ms** to avoid excessive writes while dragging.
- **Mute:** Setting volume to 0 mutes. Speaker icon changes to muted state (VolumeX icon).
- **Regenerate:** Small refresh icon (14px) next to speaker. Clicking opens generation flow again (12 pts). New beat replaces old one after user picks a variation. Old R2 file is NOT deleted (cost negligible, avoids complexity).

### 3. Audio Element Placement

- The `<audio>` element lives in `ArtistEditor` (`src/features/music-lab/components/artist-dna/ArtistEditor.tsx`), NOT inside VibeBeatPlayer
- This ensures audio persists across tab navigation (Identity, Sound, Persona, etc.) within the artist workspace
- `ArtistEditor` creates `audioRef = useRef<HTMLAudioElement>(null)` and passes it to `VibeBeatPlayer` and `ConstellationWidget`
- Audio pauses when `ArtistEditor` unmounts (cleanup in useEffect return)

### 4. Auto-Play Behavior

- When `ArtistEditor` mounts with a `dna.vibeBeat`, audio starts at saved volume (default 20%)
- **Browser auto-play policy:** Call `audioRef.current.play()` in a useEffect. Catch the promise rejection silently. Register a **one-time click handler on the ArtistEditor container div** (`onClick` with a `hasAttemptedPlay` ref). On first click, if audio is paused, call `play()`. Remove the handler after successful play by setting the ref.
- Audio loops continuously (`loop` attribute)
- Audio pauses on `ArtistEditor` unmount (cleanup in useEffect)

### 5. Mobile

Same layout — speaker icon in ConstellationWidget header, volume slider appears on tap. Auto-play works the same. GenerationDrawer goes full-width on mobile (existing behavior).

## Generation Flow

### GenerationDrawer Integration

The existing `GenerationDrawer` calls `saveTrack()` when the user picks a variation. For vibe beats, we need a different pick handler. **Add an optional `onPickOverride` prop to GenerationDrawer:**

```typescript
interface GenerationDrawerProps {
  // ...existing props...
  onPickOverride?: (variationUrl: string, duration: number) => Promise<void>
}
```

When `onPickOverride` is provided, the drawer calls it instead of `saveTrack()`. The `GenerateVibeButton` passes a callback that calls `saveVibeBeat()`.

### Flow Steps

1. User clicks "Generate Vibe Beat — 12 pts"
2. `buildVibePrompt(dna)` creates `{ style, negativeTags }` from DNA
3. Calls existing `useGenerateMusic().generate()` with `mode: 'instrumental'`, `stylePrompt: style`, `excludePrompt: negativeTags`
4. GenerationDrawer opens, shows progress, then 2 variations
5. User plays/compares variations, picks one
6. Drawer calls `onPickOverride(variationUrl, duration)` → `saveVibeBeat(variationUrl, duration)` downloads audio from MuAPI temp URL → uploads to R2 → saves R2 URL + metadata to `dna.vibeBeat`
7. Generate button disappears, VibeBeatPlayer appears
8. Audio starts playing at 20% volume

### Store Action Signature

```typescript
saveVibeBeat: (tempAudioUrl: string, duration: number) => Promise<void>
```

Accepts the MuAPI temp URL and duration of the chosen variation. Handles R2 upload + DNA patch internally.

## Download-to-R2 API Route

**Route:** `POST /api/music/download-to-r2`

```typescript
// Request
interface DownloadToR2Request {
  audioUrl: string    // MuAPI temp URL to download from
  artistId: string    // for R2 path organization: vibe-beats/{artistId}/{timestamp}.mp3
}

// Response
interface DownloadToR2Response {
  r2Url: string       // permanent R2 public URL
  duration: number    // audio duration in seconds (from Content-Length or ffprobe if needed)
}
```

Auth required. Downloads the audio file from the temp URL, uploads to R2 at `vibe-beats/{artistId}/{timestamp}.mp3`, returns the permanent R2 URL. Duration can be passed through from the client (already known from MuAPI poll response) rather than re-computed server-side.

## Error Handling

- Insufficient credits: Show insufficient credits modal (existing pattern)
- MuAPI failure: Credits refunded (existing pattern), error shown in drawer
- No DNA data: Generate button disabled with tooltip "Add genres to your artist profile first"
- R2 upload failure: Show error toast, don't save to DNA. User can retry from drawer.
- Auto-play blocked: Silent — user clicks speaker icon to play manually
- Drawer closed without picking: No action needed — MuAPI temp URLs expire naturally. GenerationDrawer already handles this case (user can reopen from history).
- **Loading state:** Store exposes `isSavingVibeBeat: boolean` so the UI can show a spinner on the "Pick" button while the R2 upload + DNA save is in progress.

## Cost

12 pts per generation (same as all music generation). 2 variations returned. User can regenerate unlimited times (12 pts each).

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/features/music-lab/utils/vibe-prompt-builder.ts` | Create — `buildVibePrompt()` function |
| `src/features/music-lab/types/artist-dna.types.ts` | Modify — add `VibeBeat` interface + add `vibeBeat?: VibeBeat` to `ArtistDNA` interface |
| `src/features/music-lab/components/artist-dna/VibeBeatPlayer.tsx` | Create — speaker icon + volume slider component |
| `src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx` | Create — generate button component |
| `src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx` | Modify — render VibeBeatPlayer or GenerateVibeButton (this is the real component; barrel re-export at `../ConstellationWidget.tsx` needs no changes) |
| `src/features/music-lab/components/artist-dna/ArtistEditor.tsx` | Modify — add `<audio>` element + ref, auto-play logic, pass audioRef to ConstellationWidget |
| `src/features/music-lab/components/generation/GenerationDrawer.tsx` | Modify — add optional `onPickOverride` prop |
| `src/features/music-lab/store/artist-dna.store.ts` | Modify — add `saveVibeBeat()`, `updateVibeBeatVolume()`, `isSavingVibeBeat` |
| `src/app/api/music/download-to-r2/route.ts` | Create — downloads audio from temp URL, uploads to R2, returns R2 URL |
