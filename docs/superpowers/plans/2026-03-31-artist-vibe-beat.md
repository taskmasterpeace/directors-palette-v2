# Artist Vibe Beat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate an instrumental theme beat from an artist's DNA that auto-plays at low volume in the artist workspace.

**Architecture:** New `buildVibePrompt()` utility maps DNA fields to a Suno style prompt. A new API route downloads generated audio to R2 for permanent storage. The vibe beat metadata persists in `dna.vibeBeat` (JSONB). UI components in the ConstellationWidget header show a generate button (no beat) or speaker+slider (beat exists). The `<audio>` element lives in ArtistEditor for tab-persistence.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Supabase (JSONB), Cloudflare R2 (S3-compatible), MuAPI (Suno proxy)

**Spec:** `docs/superpowers/specs/2026-03-31-artist-vibe-beat-design.md`

---

## File Structure

| File | Purpose |
|------|---------|
| `src/features/music-lab/types/artist-dna.types.ts` | Add `VibeBeat` interface + `vibeBeat?` field to `ArtistDNA` |
| `src/features/music-lab/utils/vibe-prompt-builder.ts` | `buildVibePrompt(dna)` — maps DNA to Suno style prompt |
| `src/app/api/music/download-to-r2/route.ts` | Downloads audio from temp URL → R2, returns permanent URL |
| `src/features/music-lab/store/artist-dna.store.ts` | Add `saveVibeBeat()`, `updateVibeBeatVolume()`, `isSavingVibeBeat` |
| `src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx` | Generate button (music note icon + "12 pts") |
| `src/features/music-lab/components/artist-dna/VibeBeatPlayer.tsx` | Speaker icon + volume slider + regenerate |
| `src/features/music-lab/components/generation/GenerationDrawer.tsx` | Add `onPickOverride` prop |
| `src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx` | Render GenerateVibeButton or VibeBeatPlayer |
| `src/features/music-lab/components/artist-dna/ArtistEditor.tsx` | Add `<audio>` element + ref + auto-play logic |

---

### Task 1: Add VibeBeat type and update ArtistDNA

**Files:**
- Modify: `src/features/music-lab/types/artist-dna.types.ts`

- [ ] **Step 1: Add VibeBeat interface after ArtistVoice (around line 86)**

Add this after the `ArtistVoice` interface:

```typescript
export interface VibeBeat {
  audioUrl: string      // R2 public URL (permanent)
  duration: number      // seconds
  title: string         // "Vibe Beat" or auto-generated
  volume: number        // 0-1, user's last volume setting (default 0.2)
  createdAt: string     // ISO timestamp
}
```

- [ ] **Step 2: Add vibeBeat field to ArtistDNA interface (line ~205)**

Add `vibeBeat?: VibeBeat` to the `ArtistDNA` interface, after `lowConfidenceFields`:

```typescript
export interface ArtistDNA {
  // ...existing fields...
  lowConfidenceFields: string[]
  vibeBeat?: VibeBeat  // instrumental theme beat
}
```

- [ ] **Step 3: Update loadArtistIntoDraft merge in store**

In `src/features/music-lab/store/artist-dna.store.ts`, in the `loadArtistIntoDraft` function (around line 249-261), add `vibeBeat` to the merged object:

```typescript
const merged: ArtistDNA = {
  identity,
  sound,
  persona: { ...defaults.persona, ...dna.persona },
  lexicon: { ...defaults.lexicon, ...dna.lexicon },
  look: lookMerged,
  catalog: { ...defaults.catalog, ...dna.catalog },
  voices: Array.isArray(dna.voices) ? dna.voices : [],
  socialCircle: dna.socialCircle || defaults.socialCircle,
  phone: dna.phone,
  headerBackgroundUrl: dna.headerBackgroundUrl || '',
  lowConfidenceFields: Array.isArray(dna.lowConfidenceFields) ? dna.lowConfidenceFields : [],
  vibeBeat: dna.vibeBeat,  // <-- add this
}
```

Also update the `persist.merge` function (around line 854-866). Find the existing line:

```typescript
            lowConfidenceFields: Array.isArray(p.draft.lowConfidenceFields) ? p.draft.lowConfidenceFields : [],
```

And add this line immediately after it (inside the same `draft = { ... }` object):

```typescript
            vibeBeat: p.draft.vibeBeat,
```

Do NOT replace the entire draft object — only add this single line. The existing `identity`, `sound`, `persona`, `lexicon`, `look` (with gallery guard), `catalog`, `voices`, `socialCircle`, `phone`, `headerBackgroundUrl`, and `lowConfidenceFields` fields must remain untouched.

- [ ] **Step 4: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds (vibeBeat is optional, so no consumers break)

- [ ] **Step 5: Commit**

```bash
git add src/features/music-lab/types/artist-dna.types.ts src/features/music-lab/store/artist-dna.store.ts
git commit -m "feat(vibe-beat): add VibeBeat type and vibeBeat field to ArtistDNA"
```

---

### Task 2: Create buildVibePrompt utility

**Files:**
- Create: `src/features/music-lab/utils/vibe-prompt-builder.ts`

- [ ] **Step 1: Create the vibe-prompt-builder.ts file**

```typescript
import type { ArtistDNA } from '../types/artist-dna.types'

const SUNO_STYLE_LIMIT = 1000
const SOUND_DESC_LIMIT = 200
const NEGATIVE_TAGS = 'no vocals, no singing, no humming, no choir, no spoken words'

interface VibePromptResult {
  style: string
  negativeTags: string
}

/**
 * Build an instrumental Suno style prompt from an artist's DNA.
 * Concatenates genre/instrument/production tags, truncating
 * least-important fields first if over the 1000-char Suno limit.
 */
export function buildVibePrompt(dna: ArtistDNA): VibePromptResult {
  const parts: { label: string; value: string; priority: number }[] = []

  // Priority 1 (highest) — genres
  const genres = dna.sound.genres
  if (genres.length) parts.push({ label: 'genres', value: genres.join(', '), priority: 1 })

  // Priority 2 — subgenres
  const subgenres = dna.sound.subgenres
  if (subgenres.length) parts.push({ label: 'subgenres', value: subgenres.join(', '), priority: 2 })

  // Priority 3 — instruments
  const instruments = dna.sound.instruments
  if (instruments.length) parts.push({ label: 'instruments', value: instruments.join(', '), priority: 3 })

  // Priority 5 — microgenres (lower priority, truncated before production)
  const microgenres = dna.sound.microgenres
  if (microgenres.length) parts.push({ label: 'microgenres', value: microgenres.join(', '), priority: 5 })

  // Priority 4 — production preferences
  const production = dna.sound.productionPreferences
  if (production.length) parts.push({ label: 'production', value: production.join(', '), priority: 4 })

  // Priority 6 (lowest) — sound description (truncated to 200 chars)
  const desc = dna.sound.soundDescription
  if (desc) {
    const truncated = desc.length > SOUND_DESC_LIMIT ? desc.slice(0, SOUND_DESC_LIMIT) : desc
    parts.push({ label: 'description', value: truncated, priority: 6 })
  }

  // Tempo from catalog entries
  const tempoTag = extractDominantTempo(dna)
  if (tempoTag) parts.push({ label: 'tempo', value: tempoTag, priority: 3 })

  // Always instrumental
  parts.push({ label: 'mode', value: 'instrumental', priority: 0 })

  // Build style string, truncating lowest-priority parts if over limit
  // Sort by priority ascending (highest priority = lowest number = kept first)
  parts.sort((a, b) => a.priority - b.priority)

  let style = parts.map((p) => p.value).join(', ')

  // Truncate from the end (lowest priority) if over limit
  while (style.length > SUNO_STYLE_LIMIT && parts.length > 1) {
    const removed = parts.pop()!
    console.warn(
      `[buildVibePrompt] Truncating "${removed.label}" (${removed.value.length} chars) — style was ${style.length}/${SUNO_STYLE_LIMIT}`
    )
    style = parts.map((p) => p.value).join(', ')
  }

  return { style, negativeTags: NEGATIVE_TAGS }
}

/**
 * Extract dominant BPM from catalog entries.
 * CatalogEntry.tempo is a string — could be "120", "fast", "85 BPM", etc.
 */
function extractDominantTempo(dna: ArtistDNA): string | null {
  const entries = dna.catalog?.entries || []
  const tempos = entries
    .map((e) => e.tempo)
    .filter((t): t is string => !!t)

  if (tempos.length === 0) return null

  // Try to extract numeric BPM values
  const numericBpms: number[] = []
  const descriptors: string[] = []

  for (const t of tempos) {
    const match = t.match(/\d+/)
    if (match) {
      numericBpms.push(parseInt(match[0], 10))
    } else {
      descriptors.push(t.toLowerCase())
    }
  }

  // Prefer numeric — average and round
  if (numericBpms.length > 0) {
    const avg = Math.round(numericBpms.reduce((sum, v) => sum + v, 0) / numericBpms.length)
    return `${avg} BPM`
  }

  // Fall back to most common descriptor
  if (descriptors.length > 0) {
    const counts = new Map<string, number>()
    for (const d of descriptors) counts.set(d, (counts.get(d) || 0) + 1)
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return sorted[0][0]
  }

  return null
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/utils/vibe-prompt-builder.ts
git commit -m "feat(vibe-beat): add buildVibePrompt utility for DNA-to-Suno prompt mapping"
```

---

### Task 3: Create download-to-r2 API route

**Files:**
- Create: `src/app/api/music/download-to-r2/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { R2StorageService } from '@/features/generation/services/r2-storage.service'
import { createLogger } from '@/lib/logger'

export const maxDuration = 120

const log = createLogger('MusicDownloadToR2')

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { audioUrl, artistId } = await request.json()

    if (!audioUrl || !artistId) {
      return NextResponse.json(
        { error: 'Missing required fields: audioUrl, artistId' },
        { status: 400 }
      )
    }

    // 1. Download audio from MuAPI temporary URL
    log.info('Downloading audio for vibe beat', { url: audioUrl.substring(0, 80) })
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      log.error('Failed to download audio', { status: audioResponse.status })
      return NextResponse.json(
        { error: 'Failed to download audio from source' },
        { status: 502 }
      )
    }
    const audioBuffer = await audioResponse.arrayBuffer()

    // 2. Upload to R2 under vibe-beats path
    // Note: R2StorageService.uploadAudio stores at music/{userId}/{artistId}/{trackId}.mp3
    // We use a "vibe-" prefix on trackId to distinguish from catalog tracks
    const trackId = `vibe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { publicUrl } = await R2StorageService.uploadAudio(
      audioBuffer,
      user.id,
      artistId,
      trackId
    )
    log.info('Vibe beat uploaded to R2', { publicUrl, size: audioBuffer.byteLength })

    return NextResponse.json({ r2Url: publicUrl })
  } catch (error) {
    log.error('Download-to-R2 error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Failed to download and upload audio' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Test with cURL**

Run: `curl -s http://localhost:3002/api/music/download-to-r2 -X POST -H "Content-Type: application/json" -d '{}' | head -5`
Expected: 401 unauthorized (auth required — confirms route exists)

- [ ] **Step 3: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/music/download-to-r2/route.ts
git commit -m "feat(vibe-beat): add download-to-r2 API route for permanent audio storage"
```

---

### Task 4: Add store actions (saveVibeBeat, updateVibeBeatVolume)

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

- [ ] **Step 1: Add VibeBeat import**

At the top of the file (line ~8), add `VibeBeat` to the import:

```typescript
import type {
  ArtistDNA,
  ArtistDnaTab,
  ArtistGalleryItem,
  ArtistVoice,
  CatalogEntry,
  CatalogSongAnalysis,
  GalleryItemType,
  SuggestionBatch,
  SunoPromptOutput,
  UserArtistProfile,
  VibeBeat,  // <-- add
} from '../types/artist-dna.types'
```

- [ ] **Step 2: Add state and action types to interface**

In the `ArtistDnaState` interface (around line 32-118), add after the `isGeneratingHeaderBg` field:

```typescript
  // Vibe Beat
  isSavingVibeBeat: boolean
  saveVibeBeat: (tempAudioUrl: string, duration: number) => Promise<void>
  updateVibeBeatVolume: (volume: number) => void
```

- [ ] **Step 3: Add initial state**

In the `create` initializer (around line 143), add after `isGeneratingHeaderBg: false`:

```typescript
      isSavingVibeBeat: false,
```

- [ ] **Step 4: Add saveVibeBeat action**

Add after the `generateHeaderBg` action (around line 678), before `generateMix`:

```typescript
      saveVibeBeat: async (tempAudioUrl: string, duration: number) => {
        const { activeArtistId, currentUserId, draft } = get()
        if (!activeArtistId || !currentUserId) return

        set({ isSavingVibeBeat: true })
        try {
          // Download from MuAPI temp URL → upload to R2
          const res = await fetch('/api/music/download-to-r2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl: tempAudioUrl, artistId: activeArtistId }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to upload to R2')
          }

          const { r2Url } = await res.json()

          const vibeBeat: VibeBeat = {
            audioUrl: r2Url,
            duration,
            title: 'Vibe Beat',
            volume: 0.2,
            createdAt: new Date().toISOString(),
          }

          // Update draft
          set((state) => ({
            draft: { ...state.draft, vibeBeat },
            isDirty: true,
          }))

          // Persist to Supabase
          const name = draft.identity.stageName || draft.identity.realName || 'Untitled Artist'
          await artistDnaService.updateArtist(activeArtistId, currentUserId, name, { ...draft, vibeBeat })

          // Update the artists list so it reflects the change
          set((state) => ({
            artists: state.artists.map((a) =>
              a.id === activeArtistId ? { ...a, dna: { ...a.dna, vibeBeat } } : a
            ),
            isDirty: false,
          }))
        } catch (error) {
          logger.musicLab.error('Failed to save vibe beat', {
            error: error instanceof Error ? error.message : String(error),
          })
          throw error // Let caller handle toast
        } finally {
          set({ isSavingVibeBeat: false })
        }
      },

      updateVibeBeatVolume: (() => {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null
        return (volume: number) => {
          // Update draft immediately for responsive UI
          set((state) => {
            if (!state.draft.vibeBeat) return state
            return {
              draft: {
                ...state.draft,
                vibeBeat: { ...state.draft.vibeBeat, volume },
              },
            }
          })

          // Debounced persist to Supabase
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(async () => {
            const { activeArtistId, currentUserId, draft } = get()
            if (!activeArtistId || !currentUserId || !draft.vibeBeat) return
            const name = draft.identity.stageName || draft.identity.realName || 'Untitled Artist'
            await artistDnaService.updateArtist(activeArtistId, currentUserId, name, draft)
          }, 500)
        }
      })(),
```

- [ ] **Step 5: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts
git commit -m "feat(vibe-beat): add saveVibeBeat and updateVibeBeatVolume store actions"
```

---

### Task 5: Add onPickOverride to GenerationDrawer

**Files:**
- Modify: `src/features/music-lab/components/generation/GenerationDrawer.tsx`

- [ ] **Step 1: Update GenerationDrawerProps interface (line 11-13)**

```typescript
interface GenerationDrawerProps {
  onRegenerate: () => void
  onPickOverride?: (variationUrl: string, duration: number) => Promise<void>
}
```

- [ ] **Step 2: Destructure the new prop (line 15)**

```typescript
export function GenerationDrawer({ onRegenerate, onPickOverride }: GenerationDrawerProps) {
```

- [ ] **Step 3: Update handlePick to use override when provided (line 23-30)**

Replace the existing `handlePick` callback. Note: `currentJob` is already destructured from `useGenerateMusic()` at line 16, and `useGenerationStore` is already imported at line 6. The variations have type `{ url: string, duration: number }` (set in `useGenerateMusic.ts` lines 51-54).

```typescript
  const handlePick = useCallback(async (index: number) => {
    if (!currentJob?.variations[index]) return
    const variation = currentJob.variations[index]

    setSavingIndex(index)
    if (onPickOverride) {
      try {
        await onPickOverride(variation.url, variation.duration)
        setSavedIndices((prev) => new Set(prev).add(index))
      } catch {
        // Error handled by caller (toast)
      }
    } else {
      const result = await saveTrack(index)
      if (!result.error) {
        setSavedIndices((prev) => new Set(prev).add(index))
      }
    }
    setSavingIndex(null)
  }, [saveTrack, onPickOverride, currentJob])
```

- [ ] **Step 4: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/music-lab/components/generation/GenerationDrawer.tsx
git commit -m "feat(vibe-beat): add onPickOverride prop to GenerationDrawer"
```

---

### Task 6: Create GenerateVibeButton component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useCallback } from 'react'
import { Music, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { buildVibePrompt } from '../../utils/vibe-prompt-builder'
import { GenerationDrawer } from '../generation/GenerationDrawer'

export function GenerateVibeButton() {
  const { draft, activeArtistId, saveVibeBeat, isSavingVibeBeat } = useArtistDnaStore()
  const { generate, isGenerating, drawerOpen } = useGenerateMusic()

  const hasGenres = draft.sound.genres.length > 0
  const hasVibeBeat = !!draft.vibeBeat

  const handleGenerate = useCallback(async () => {
    if (!activeArtistId || !hasGenres) return

    const { style, negativeTags } = buildVibePrompt(draft)

    await generate({
      mode: 'instrumental',
      artistId: activeArtistId,
      title: 'Vibe Beat',
      stylePrompt: style,
      lyricsPrompt: '',
      excludePrompt: negativeTags,
    })
  }, [activeArtistId, hasGenres, draft, generate])

  const handlePickOverride = useCallback(async (variationUrl: string, duration: number) => {
    await saveVibeBeat(variationUrl, duration)
  }, [saveVibeBeat])

  if (hasVibeBeat) return null

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={!hasGenres || isGenerating || isSavingVibeBeat}
        title={!hasGenres ? 'Add genres to your artist profile first' : 'Generate Vibe Beat'}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white/90 hover:bg-black/70 transition-colors text-xs disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isGenerating || isSavingVibeBeat ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Music className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Vibe Beat</span>
        <span className="text-amber-400 text-[10px] font-mono">12 pts</span>
      </button>

      {drawerOpen && (
        <GenerationDrawer
          onRegenerate={handleGenerate}
          onPickOverride={handlePickOverride}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx
git commit -m "feat(vibe-beat): create GenerateVibeButton component"
```

---

### Task 7: Create VibeBeatPlayer component

**Files:**
- Create: `src/features/music-lab/components/artist-dna/VibeBeatPlayer.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { Volume2, VolumeX, RefreshCw } from 'lucide-react'
import type { VibeBeat } from '../../types/artist-dna.types'
import { useArtistDnaStore } from '../../store/artist-dna.store'

interface VibeBeatPlayerProps {
  vibeBeat: VibeBeat
  audioRef: React.RefObject<HTMLAudioElement | null>
  onRegenerate: () => void
}

export function VibeBeatPlayer({ vibeBeat, audioRef, onRegenerate }: VibeBeatPlayerProps) {
  const [showSlider, setShowSlider] = useState(false)
  const updateVibeBeatVolume = useArtistDnaStore((s) => s.updateVibeBeatVolume)

  const volume = vibeBeat.volume ?? 0.2
  const isMuted = volume === 0

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    updateVibeBeatVolume(newVolume)
  }, [audioRef, updateVibeBeatVolume])

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute to 20%
      if (audioRef.current) {
        audioRef.current.volume = 0.2
        audioRef.current.play().catch(() => {})
      }
      updateVibeBeatVolume(0.2)
    } else {
      // Mute
      if (audioRef.current) {
        audioRef.current.volume = 0
      }
      updateVibeBeatVolume(0)
    }
  }, [isMuted, audioRef, updateVibeBeatVolume])

  const handleSpeakerClick = useCallback(() => {
    // If audio is paused (auto-play was blocked), try to play
    if (audioRef.current?.paused && !isMuted) {
      audioRef.current.play().catch(() => {})
    }
    setShowSlider((prev) => !prev)
  }, [audioRef, isMuted])

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleSpeakerClick}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        title={isMuted ? 'Unmute vibe beat' : 'Adjust volume'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-white/60" />
        ) : (
          <Volume2 className="w-4 h-4 text-amber-400" />
        )}
      </button>

      {showSlider && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
          <button
            onClick={handleToggleMute}
            className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
          >
            {isMuted ? 'unmute' : 'mute'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-[10px] text-white/50 tabular-nums w-7 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      <button
        onClick={onRegenerate}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        title="Regenerate vibe beat (12 pts)"
      >
        <RefreshCw className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/artist-dna/VibeBeatPlayer.tsx
git commit -m "feat(vibe-beat): create VibeBeatPlayer with volume slider and mute"
```

---

### Task 8: Integrate into ConstellationWidget

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx`

- [ ] **Step 1: Update the component props to accept audioRef**

Update the function signature (line 19) to accept `audioRef`:

```typescript
interface ConstellationWidgetProps {
  onDeleteRequest?: () => void
  audioRef?: React.RefObject<HTMLAudioElement | null>
}

export function ConstellationWidget({ onDeleteRequest, audioRef }: ConstellationWidgetProps) {
```

- [ ] **Step 2: Add imports**

Add at the top of the file, after existing imports:

```typescript
import { GenerateVibeButton } from '../GenerateVibeButton'
import { VibeBeatPlayer } from '../VibeBeatPlayer'
```

- [ ] **Step 3: Add regeneration state and vibe beat UI**

Add a `showRegenerateFlow` state at the top of the function (after line 20):

```typescript
  const [showRegenerateFlow, setShowRegenerateFlow] = useState(false)
```

Add a useEffect to auto-reset the regeneration flow when a new vibe beat is saved:

```typescript
  // Reset regeneration flow when new vibe beat is saved
  useEffect(() => {
    if (draft.vibeBeat && showRegenerateFlow) {
      setShowRegenerateFlow(false)
    }
  }, [draft.vibeBeat, showRegenerateFlow])
```

Now replace the entire `{/* Overlay: Top-right — Generate Vibe + Save */}` div (lines 191-220) with:

```typescript
          {/* Overlay: Top-right — Vibe Beat + Header BG + Save */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {draft.vibeBeat && audioRef && !showRegenerateFlow ? (
              <VibeBeatPlayer
                vibeBeat={draft.vibeBeat}
                audioRef={audioRef}
                onRegenerate={() => setShowRegenerateFlow(true)}
              />
            ) : (
              <GenerateVibeButton />
            )}
            {totalFill > 0.3 && (
              <Button
                onClick={() => generateHeaderBg()}
                disabled={isGeneratingHeaderBg}
                size="sm"
                className="bg-black/50 hover:bg-black/70 backdrop-blur-sm h-7 px-2.5 text-xs disabled:opacity-30"
                title="Generate atmospheric background from DNA"
              >
                {isGeneratingHeaderBg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-1" />
                    Vibe
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              size="sm"
              className="bg-black/50 hover:bg-black/70 backdrop-blur-sm h-7 px-3 text-xs disabled:opacity-30"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save
            </Button>
          </div>
```

**Regeneration flow:** When user clicks regenerate in VibeBeatPlayer, `showRegenerateFlow` flips to `true`, hiding the player and showing GenerateVibeButton. The GenerateVibeButton renders regardless of `hasVibeBeat` — the conditional is handled here in ConstellationWidget. After a new vibe beat is saved (`draft.vibeBeat` changes), the useEffect resets `showRegenerateFlow` to `false`, swapping back to the player.

- [ ] **Step 4: Update GenerateVibeButton to remove the hasVibeBeat guard**

In `src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx`, **remove** the following two lines:

```typescript
  const hasVibeBeat = !!draft.vibeBeat   // DELETE this line

  if (hasVibeBeat) return null            // DELETE this line
```

The parent (ConstellationWidget) now controls visibility via `showRegenerateFlow`.

- [ ] **Step 4: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/music-lab/components/artist-dna/constellation/ConstellationWidget.tsx src/features/music-lab/components/artist-dna/GenerateVibeButton.tsx
git commit -m "feat(vibe-beat): integrate generate button and player into ConstellationWidget"
```

---

### Task 9: Add audio element and auto-play to ArtistEditor

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/ArtistEditor.tsx`

- [ ] **Step 1: Add useRef import and audioRef**

Update the React import (line 1) to include `useRef`:

```typescript
import { useEffect, useState, useCallback, useRef } from 'react'
```

- [ ] **Step 2: Create audioRef and auto-play effect**

Inside the `ArtistEditor` function (after line 70), add:

```typescript
  const audioRef = useRef<HTMLAudioElement>(null)
  const hasAttemptedPlay = useRef(false)

  // Auto-play vibe beat when editor mounts or vibeBeat changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !draft.vibeBeat) return

    audio.src = draft.vibeBeat.audioUrl
    audio.volume = draft.vibeBeat.volume ?? 0.2
    audio.loop = true

    // Try auto-play (may be blocked by browser policy)
    audio.play().catch(() => {
      // Blocked — will retry on first user interaction
      hasAttemptedPlay.current = false
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [draft.vibeBeat?.audioUrl]) // Only re-run when the audio URL changes

  // Retry play on first user interaction (browser auto-play policy)
  // Uses refs only — no reactive deps needed, empty array is correct
  const handleContainerClick = useCallback(() => {
    const audio = audioRef.current
    if (!audio || hasAttemptedPlay.current) return
    if (audio.paused && audio.src) {
      audio.play().then(() => {
        hasAttemptedPlay.current = true
      }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

- [ ] **Step 3: Add onClick to the container div and audio element**

Update the return JSX (line 134). Change the outer div to:

```typescript
    <div className="space-y-2" onClick={handleContainerClick}>
```

Add the `<audio>` element and pass `audioRef` to ConstellationWidget. Right before the closing `</div>` of the outer container (before the AlertDialog), add:

```typescript
      {/* Hidden audio element for vibe beat — lives here for tab persistence */}
      <audio ref={audioRef} />
```

Update the ConstellationWidget render (line 137) to pass audioRef. Note: `ConstellationWidget` is loaded via `dynamic()` import at line 26-29 — the dynamic wrapper will pass props through correctly, no changes needed to the dynamic import itself:

```typescript
      <ConstellationWidget onDeleteRequest={() => setShowDeleteConfirm(true)} audioRef={audioRef} />
```

- [ ] **Step 4: Verify build passes**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/music-lab/components/artist-dna/ArtistEditor.tsx
git commit -m "feat(vibe-beat): add audio element and auto-play logic to ArtistEditor"
```

---

### Task 10: End-to-end verification and push

**Files:** None (testing only)

- [ ] **Step 1: Full clean build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -30`
Expected: Build succeeds with no errors

- [ ] **Step 2: Start dev server and verify UI**

Run: `cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &`

Manual checks:
1. Open http://localhost:3002, go to Music Lab → Artist Lab
2. Open an artist with genres set → ConstellationWidget should show "Vibe Beat — 12 pts" button in top-right
3. Open an artist with NO genres → button should be disabled
4. Click "Vibe Beat — 12 pts" → GenerationDrawer should open, show progress
5. After generation completes, pick a variation → should save to R2, show VibeBeatPlayer
6. VibeBeatPlayer should show speaker icon → click to reveal volume slider
7. Volume slider changes audio volume in real-time
8. Navigating between tabs (Identity/Sound/etc.) should NOT stop audio
9. Closing editor (Back button) should stop audio
10. Re-opening same artist should show speaker icon and auto-play

- [ ] **Step 3: Push to production**

```bash
git push origin main
```

- [ ] **Step 4: Verify Vercel deployment**

Check Vercel dashboard for successful deployment. Verify MUAPI_KEY env var is set in Vercel (it should already be set from previous session).
