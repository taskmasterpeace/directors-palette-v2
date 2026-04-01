# Artist Vibe Beat — Design Spec

## Goal

Generate an instrumental "theme beat" from an artist's DNA that auto-plays at low volume when entering their workspace. One button, no configuration — the prompt builds automatically from the artist's sound profile.

## Architecture

Uses the existing MuAPI generation pipeline (`/api/music/generate` with `mode: 'instrumental'`). A new utility function `buildVibePrompt(dna)` maps Artist DNA fields to a Suno style prompt. The generated audio saves to R2 and persists in the artist's DNA object in Supabase. No new API routes needed.

## Data Model

Add `vibeBeat` field to the artist DNA JSONB object in Supabase (`artist_profiles.dna`):

```typescript
interface VibeBeat {
  audioUrl: string      // R2 public URL (permanent)
  duration: number      // seconds
  title: string         // "Vibe Beat" or auto-generated
  volume: number        // 0-1, user's last volume setting (default 0.2)
  createdAt: string     // ISO timestamp
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

If catalog entries exist with tempo data, extract dominant BPM for the prompt. Otherwise omit and let Suno decide.

Character limit: 1000 chars for style prompt (Suno limit). Truncate least-important fields (soundDescription first, then productionPreferences) if over limit.

## UI Components

### 1. Generate Vibe Beat Button

- **Location:** Artist header area (same row as artist name/identity)
- **Visibility:** Only when `dna.vibeBeat` does not exist
- **Appearance:** Small music note icon + "Generate Vibe Beat — 12 pts" text
- **Behavior:** Calls `/api/music/generate` with auto-built prompt, opens GenerationDrawer with 2 variations. User picks one → downloads from MuAPI temp URL → uploads to R2 → saves R2 URL to `dna.vibeBeat` in Supabase.
- **Disabled state:** When artist has no genres set (insufficient DNA to build a meaningful prompt)

### 2. Speaker Icon + Volume Slider

- **Location:** Artist header area, replaces the generate button after vibe beat exists
- **Appearance:** Small speaker/volume icon
- **Interaction:** Click/tap reveals a small horizontal volume slider (0-100%)
- **Auto-play:** When entering the artist workspace (selecting an artist or navigating to their tab), audio starts playing at saved volume (default 20%)
- **Volume persistence:** Volume level saves to `dna.vibeBeat.volume` in Supabase so it persists across devices
- **Mute:** Setting volume to 0 mutes. Speaker icon changes to muted state.
- **Regenerate:** Small refresh icon next to speaker. Clicking opens generation flow again (12 pts). New beat replaces old one after user picks a variation.

### 3. Mobile

Same layout — speaker icon in header, volume slider appears on tap. Auto-play works the same. GenerationDrawer goes full-width on mobile (existing behavior).

## Generation Flow

1. User clicks "Generate Vibe Beat — 12 pts"
2. `buildVibePrompt(dna)` creates style prompt from DNA
3. Calls existing `useGenerateMusic().generate()` with `mode: 'instrumental'`, auto-built prompt
4. GenerationDrawer opens, shows progress, then 2 variations
5. User plays/compares variations, picks one
6. On pick: audio downloads from MuAPI → uploads to R2 → saves to `dna.vibeBeat`
7. Generate button disappears, speaker icon + slider appears
8. Audio starts playing at 20% volume

## Audio Playback

- Uses HTML5 `<audio>` element with `loop` enabled (theme beat loops continuously)
- Audio element lives at the artist workspace level (not per-component) so it persists across tab navigation within the artist
- Pauses when leaving the artist workspace or switching to a different artist
- Resumes when returning to the artist

## Error Handling

- Insufficient credits: Show insufficient credits modal (existing pattern)
- MuAPI failure: Credits refunded (existing pattern), error shown in drawer
- No DNA data: Generate button disabled with tooltip "Add genres to your artist profile first"
- R2 upload failure: Show error toast, don't save to DNA

## Cost

12 pts per generation (same as all music generation). 2 variations returned. User can regenerate unlimited times (12 pts each).

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/features/music-lab/utils/vibe-prompt-builder.ts` | Create — `buildVibePrompt()` function |
| `src/features/music-lab/types/artist-dna.types.ts` | Modify — add `VibeBeat` interface |
| `src/features/music-lab/components/artist-dna/VibeBeaPlayer.tsx` | Create — speaker icon + volume slider + audio element |
| `src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx` | Create — generate button component |
| Artist header component (TBD — find exact file) | Modify — add VibeBeaPlayer/GenerateVibeButton |
| `src/features/music-lab/store/artist-dna.store.ts` | Modify — add `saveVibeBeat()` action |
