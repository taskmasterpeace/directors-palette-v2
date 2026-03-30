# Suno Music Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable in-app music generation via MuAPI's Suno proxy — full songs from Writing Studio, instrumentals from Sound Studio, with audio playback and catalog saving.

**Architecture:** Three API routes (generate, poll status, save audio) backed by MuAPI. A Zustand store manages generation state. A slide-out drawer shows progress and 2 variations with audio players. Picked tracks upload to R2 and save to the artist's catalog.

**Tech Stack:** Next.js 15 API routes, MuAPI REST API, Cloudflare R2 (existing), Zustand with persist, HTML5 audio

**Spec:** `docs/superpowers/specs/2026-03-30-suno-music-generation-design.md`

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `src/features/music-lab/types/generation.types.ts` | Types for generation jobs, results, audio tracks |
| `src/features/music-lab/services/muapi.service.ts` | MuAPI client — generate + poll |
| `src/features/music-lab/store/generation.store.ts` | Zustand store for generation state + history |
| `src/app/api/music/generate/route.ts` | POST — submit generation to MuAPI, charge 12 pts |
| `src/app/api/music/status/[id]/route.ts` | GET — poll MuAPI for job status |
| `src/app/api/music/save/route.ts` | POST — download audio from MuAPI URL, upload to R2, update catalog |
| `src/features/music-lab/components/generation/GenerationDrawer.tsx` | Slide-out drawer shell |
| `src/features/music-lab/components/generation/GenerationStatus.tsx` | Progress indicator during generation |
| `src/features/music-lab/components/generation/VariationCard.tsx` | Audio player card with pick/download |
| `src/features/music-lab/components/generation/GenerationHistory.tsx` | Past generations list |
| `src/features/music-lab/hooks/useGenerateMusic.ts` | Hook wiring generate button → API → poll → drawer |

### Modified Files
| File | Change |
|------|--------|
| `src/features/music-lab/types/artist-dna.types.ts` | Add `audioUrl?: string` and `audioVariations?: { url: string; duration: number }[]` to `CatalogEntry` |
| `src/features/music-lab/store/artist-dna.store.ts` | Add `saveCatalogAudio` action |
| `src/features/generation/services/r2-storage.service.ts` | Add `uploadAudio()` static method |
| `src/features/music-lab/components/writing-studio/SunoExportPanel.tsx` | Add "Generate Song" button + drawer trigger |
| `src/features/music-lab/components/sound-studio/SunoPromptPreview.tsx` | Add "Generate Beat" button + drawer trigger |

---

## Task 1: Types & Interfaces

**Files:**
- Create: `src/features/music-lab/types/generation.types.ts`
- Modify: `src/features/music-lab/types/artist-dna.types.ts`

- [ ] **Step 1: Create generation types**

```typescript
// src/features/music-lab/types/generation.types.ts

export type GenerationMode = 'song' | 'instrumental'

export type GenerationJobStatus = 'submitting' | 'pending' | 'processing' | 'completed' | 'failed'

export interface GenerationVariation {
  url: string
  duration: number
}

export interface GenerationJob {
  id: string                      // MuAPI request_id
  mode: GenerationMode
  status: GenerationJobStatus
  artistId: string
  title: string
  stylePrompt: string
  lyricsPrompt: string            // empty for instrumentals
  excludePrompt: string
  variations: GenerationVariation[]
  error?: string
  createdAt: string
}

export interface GenerationHistoryEntry {
  id: string
  mode: GenerationMode
  artistId: string
  title: string
  variations: GenerationVariation[]
  pickedIndex?: number            // which variation was saved
  createdAt: string
}

export interface GenerateRequest {
  mode: GenerationMode
  artistId: string
  title: string
  stylePrompt: string
  lyricsPrompt: string
  excludePrompt: string
  vocalGender?: string
}

export interface SaveTrackRequest {
  artistId: string
  audioUrl: string                // MuAPI temporary URL
  title: string
  lyrics: string
  mood: string
  duration: number
  catalogEntryId?: string         // attach to existing entry, or omit to create new
}
```

- [ ] **Step 2: Add audioUrl to CatalogEntry**

In `src/features/music-lab/types/artist-dna.types.ts`, find:
```typescript
export interface CatalogEntry {
  id: string
  title: string
  lyrics: string
  mood: string
  tempo: string
  createdAt: string
  analysis?: CatalogSongAnalysis
  analysisStatus?: AnalysisStatus
}
```

Add two fields after `analysisStatus`:
```typescript
  audioUrl?: string
  audioDuration?: number
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/types/generation.types.ts src/features/music-lab/types/artist-dna.types.ts
git commit -m "feat(music): add generation types and audioUrl to CatalogEntry"
```

---

## Task 2: R2 Audio Upload Method

**Files:**
- Modify: `src/features/generation/services/r2-storage.service.ts`

- [ ] **Step 1: Add uploadAudio method to R2StorageService**

After the existing `uploadVideo` method (line ~69), add:

```typescript
  /**
   * Upload audio (music) to R2
   */
  static async uploadAudio(
    buffer: ArrayBuffer,
    userId: string,
    artistId: string,
    trackId: string,
    fileExtension: string = 'mp3',
    mimeType: string = 'audio/mpeg'
  ): Promise<{
    publicUrl: string;
    storagePath: string;
    fileSize: number;
  }> {
    const storagePath = `music/${userId}/${artistId}/${trackId}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      Body: new Uint8Array(buffer),
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await getR2Client().send(command);
    logger.generation.info('[R2] Uploaded audio', { storagePath, size: buffer.byteLength });

    const publicUrl = `${R2_PUBLIC_BASE}/${storagePath}`;

    return {
      publicUrl,
      storagePath,
      fileSize: buffer.byteLength,
    };
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/features/generation/services/r2-storage.service.ts
git commit -m "feat(r2): add uploadAudio method for music storage"
```

---

## Task 3: MuAPI Service

**Files:**
- Create: `src/features/music-lab/services/muapi.service.ts`

- [ ] **Step 1: Create MuAPI service**

```typescript
// src/features/music-lab/services/muapi.service.ts

import { createLogger } from '@/lib/logger'
import type { GenerateRequest } from '../types/generation.types'

const log = createLogger('MuAPI')

const MUAPI_BASE = 'https://muapi.ai/api/v1'

function getApiKey(): string {
  const key = process.env.MUAPI_KEY
  if (!key) throw new Error('MUAPI_KEY env var is not set')
  return key
}

interface MuAPIGenerateResponse {
  id: string
  status: string
}

interface MuAPIPollResponse {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  audio?: Array<{ url: string; duration?: number }>
  error?: string
}

/**
 * Submit a music generation request to MuAPI (Suno proxy)
 */
export async function submitGeneration(req: GenerateRequest): Promise<{ requestId: string }> {
  const body: Record<string, unknown> = {
    style: req.stylePrompt,
    custom_mode: true,
    title: req.title,
    model: 'v4',
  }

  if (req.mode === 'song') {
    body.prompt = req.lyricsPrompt
    body.instrumental = false
    if (req.vocalGender) body.vocal_gender = req.vocalGender
  } else {
    body.prompt = ''
    body.instrumental = true
  }

  if (req.excludePrompt) {
    body.negative_tags = req.excludePrompt
  }

  log.info('Submitting generation', { mode: req.mode, title: req.title })

  const response = await fetch(`${MUAPI_BASE}/suno-create-music`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    log.error('MuAPI generate failed', { status: response.status, error: errText })
    throw new Error(`MuAPI generation failed: ${response.status} - ${errText}`)
  }

  const data: MuAPIGenerateResponse = await response.json()
  log.info('Generation submitted', { requestId: data.id })

  return { requestId: data.id }
}

/**
 * Poll MuAPI for generation status
 */
export async function pollGenerationStatus(requestId: string): Promise<MuAPIPollResponse> {
  const response = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    method: 'GET',
    headers: {
      'x-api-key': getApiKey(),
    },
  })

  if (!response.ok) {
    const errText = await response.text()
    log.error('MuAPI poll failed', { requestId, status: response.status, error: errText })
    throw new Error(`MuAPI poll failed: ${response.status}`)
  }

  return response.json()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/services/muapi.service.ts
git commit -m "feat(music): add MuAPI service for Suno generation + polling"
```

---

## Task 4: API Route — Generate

**Files:**
- Create: `src/app/api/music/generate/route.ts`

- [ ] **Step 1: Create generate API route**

```typescript
// src/app/api/music/generate/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { submitGeneration } from '@/features/music-lab/services/muapi.service'
import { createLogger } from '@/lib/logger'
import type { GenerateRequest } from '@/features/music-lab/types/generation.types'

export const maxDuration = 30

const log = createLogger('MusicGenerate')
const GENERATION_COST = 12

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email || '')

    const body: GenerateRequest = await request.json()

    // Validate required fields
    if (!body.mode || !body.artistId || !body.stylePrompt) {
      return NextResponse.json({ error: 'Missing required fields: mode, artistId, stylePrompt' }, { status: 400 })
    }

    if (body.mode === 'song' && (!body.lyricsPrompt || body.lyricsPrompt.trim().length === 0)) {
      return NextResponse.json({ error: 'Lyrics are required for song mode' }, { status: 400 })
    }

    // Validate field lengths
    if (body.stylePrompt.length > 1000) {
      return NextResponse.json({ error: 'Style prompt exceeds 1000 character limit' }, { status: 400 })
    }
    if (body.lyricsPrompt && body.lyricsPrompt.length > 3000) {
      return NextResponse.json({ error: 'Lyrics exceed 3000 character limit' }, { status: 400 })
    }

    // Validate negative_tags length
    if (body.excludePrompt && body.excludePrompt.length > 200) {
      return NextResponse.json({ error: 'Negative tags exceed 200 character limit' }, { status: 400 })
    }

    // Check and deduct credits BEFORE calling MuAPI
    let deductedCredits = false
    if (!userIsAdmin) {
      const balance = await creditsService.getBalance(user.id)
      const currentBalance = balance?.balance ?? 0
      if (currentBalance < GENERATION_COST) {
        return NextResponse.json(
          { error: 'Insufficient credits', required: GENERATION_COST, balance: currentBalance },
          { status: 402 }
        )
      }

      await creditsService.deductCredits(user.id, 'suno-music', {
        generationType: 'audio',
        description: body.mode === 'song' ? 'Music generation (full song)' : 'Music generation (instrumental)',
        overrideAmount: GENERATION_COST,
        user_email: user.email,
      })
      deductedCredits = true
    }

    // Submit to MuAPI — refund on failure
    try {
      const { requestId } = await submitGeneration(body)

      log.info('Music generation started', { requestId, mode: body.mode, userId: user.id })

      return NextResponse.json({ requestId, status: 'pending' })
    } catch (apiError) {
      // Refund credits on MuAPI failure
      if (deductedCredits) {
        log.info('Refunding credits after MuAPI failure', { userId: user.id })
        await creditsService.addCredits(user.id, GENERATION_COST, {
          type: 'refund',
          description: 'Music generation failed — refund',
          metadata: { reason: 'muapi_failure' },
        })
      }
      throw apiError
    }
  } catch (error) {
    log.error('Music generate error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/music/generate/route.ts
git commit -m "feat(music): add /api/music/generate route (12 pts, MuAPI submission)"
```

---

## Task 5: API Route — Poll Status

**Files:**
- Create: `src/app/api/music/status/[id]/route.ts`

- [ ] **Step 1: Create status polling route**

```typescript
// src/app/api/music/status/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { pollGenerationStatus } from '@/features/music-lab/services/muapi.service'
import { createLogger } from '@/lib/logger'

export const maxDuration = 15

const log = createLogger('MusicStatus')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    const result = await pollGenerationStatus(id)

    return NextResponse.json({
      id: result.id,
      status: result.status,
      audio: result.audio || [],
      error: result.error,
    })
  } catch (error) {
    log.error('Music status poll error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/music/status/[id]/route.ts"
git commit -m "feat(music): add /api/music/status/[id] polling route"
```

---

## Task 6: API Route — Save Track

**Files:**
- Create: `src/app/api/music/save/route.ts`

- [ ] **Step 1: Create save route** (downloads from MuAPI URL → uploads to R2 → updates catalog)

```typescript
// src/app/api/music/save/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { R2StorageService } from '@/features/generation/services/r2-storage.service'
import { createLogger } from '@/lib/logger'
import type { SaveTrackRequest } from '@/features/music-lab/types/generation.types'

export const maxDuration = 120

const log = createLogger('MusicSave')

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body: SaveTrackRequest = await request.json()

    if (!body.audioUrl || !body.artistId || !body.title) {
      return NextResponse.json({ error: 'Missing required fields: audioUrl, artistId, title' }, { status: 400 })
    }

    // 1. Download audio from MuAPI temporary URL
    log.info('Downloading audio from MuAPI', { url: body.audioUrl.substring(0, 80) })
    const audioResponse = await fetch(body.audioUrl)
    if (!audioResponse.ok) {
      log.error('Failed to download audio', { status: audioResponse.status })
      return NextResponse.json({ error: 'Failed to download audio from source' }, { status: 502 })
    }
    const audioBuffer = await audioResponse.arrayBuffer()

    // 2. Upload to R2
    const trackId = `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const { publicUrl } = await R2StorageService.uploadAudio(
      audioBuffer, user.id, body.artistId, trackId
    )
    log.info('Audio uploaded to R2', { publicUrl, size: audioBuffer.byteLength })

    // 3. Update artist catalog in Supabase
    const supabase = await getAPIClient()
    const { data: artist } = await supabase
      .from('artist_profiles')
      .select('dna')
      .eq('id', body.artistId)
      .eq('user_id', user.id)
      .single()

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const dna = artist.dna as Record<string, unknown>
    const catalog = (dna.catalog || { entries: [] }) as { entries: Array<Record<string, unknown>> }

    if (body.catalogEntryId) {
      // Attach audio to existing catalog entry
      const entry = catalog.entries.find((e) => e.id === body.catalogEntryId)
      if (entry) {
        entry.audioUrl = publicUrl
        entry.audioDuration = body.duration
      }
    } else {
      // Create new catalog entry (for instrumentals or new songs)
      catalog.entries.push({
        id: trackId,
        title: body.title,
        lyrics: body.lyrics || '',
        mood: body.mood || 'instrumental',
        tempo: '',
        createdAt: new Date().toISOString(),
        audioUrl: publicUrl,
        audioDuration: body.duration,
      })
    }

    // Save updated DNA
    const { error: updateError } = await supabase
      .from('artist_profiles')
      .update({ dna: { ...dna, catalog } })
      .eq('id', body.artistId)
      .eq('user_id', user.id)

    if (updateError) {
      log.error('Failed to update catalog', { error: updateError.message })
      return NextResponse.json({ error: 'Failed to save to catalog' }, { status: 500 })
    }

    log.info('Track saved to catalog', { trackId, artistId: body.artistId })

    return NextResponse.json({ publicUrl, trackId })
  } catch (error) {
    log.error('Music save error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to save track' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/music/save/route.ts
git commit -m "feat(music): add /api/music/save route (download → R2 → catalog)"
```

---

## Task 7: Generation Store (Zustand)

**Files:**
- Create: `src/features/music-lab/store/generation.store.ts`

- [ ] **Step 1: Create generation store**

```typescript
// src/features/music-lab/store/generation.store.ts
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GenerationJob,
  GenerationJobStatus,
  GenerationVariation,
  GenerationHistoryEntry,
  GenerationMode,
} from '../types/generation.types'

const MAX_HISTORY = 20

interface GenerationState {
  // Current job
  currentJob: GenerationJob | null
  drawerOpen: boolean
  pollCount: number

  // History (persisted)
  history: GenerationHistoryEntry[]
}

interface GenerationActions {
  // Job lifecycle
  startJob: (job: Omit<GenerationJob, 'status' | 'variations' | 'createdAt'>) => void
  updateJobStatus: (status: GenerationJobStatus, variations?: GenerationVariation[], error?: string) => void
  clearJob: () => void

  // Drawer
  openDrawer: () => void
  closeDrawer: () => void

  // Polling
  incrementPoll: () => void
  resetPoll: () => void

  // History
  addToHistory: (entry: Omit<GenerationHistoryEntry, 'createdAt'>) => void
  markPicked: (historyId: string, index: number) => void
  clearHistory: () => void
}

export const useGenerationStore = create<GenerationState & GenerationActions>()(
  persist(
    (set, get) => ({
      // State
      currentJob: null,
      drawerOpen: false,
      pollCount: 0,
      history: [],

      // Job lifecycle
      startJob: (job) =>
        set({
          currentJob: {
            ...job,
            status: 'submitting',
            variations: [],
            createdAt: new Date().toISOString(),
          },
          drawerOpen: true,
          pollCount: 0,
        }),

      updateJobStatus: (status, variations, error) =>
        set((state) => ({
          currentJob: state.currentJob
            ? {
                ...state.currentJob,
                status,
                variations: variations || state.currentJob.variations,
                error: error || state.currentJob.error,
              }
            : null,
        })),

      clearJob: () => set({ currentJob: null, pollCount: 0 }),

      // Drawer
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      // Polling
      incrementPoll: () => set((s) => ({ pollCount: s.pollCount + 1 })),
      resetPoll: () => set({ pollCount: 0 }),

      // History
      addToHistory: (entry) =>
        set((state) => ({
          history: [
            { ...entry, createdAt: new Date().toISOString() },
            ...state.history,
          ].slice(0, MAX_HISTORY),
        })),

      markPicked: (historyId, index) =>
        set((state) => ({
          history: state.history.map((h) =>
            h.id === historyId ? { ...h, pickedIndex: index } : h
          ),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'music-generation-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
)
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/store/generation.store.ts
git commit -m "feat(music): add generation Zustand store with persisted history"
```

---

## Task 8: useGenerateMusic Hook

**Files:**
- Create: `src/features/music-lab/hooks/useGenerateMusic.ts`

- [ ] **Step 1: Create the generation hook** (handles submit → poll → results)

```typescript
// src/features/music-lab/hooks/useGenerateMusic.ts
'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useGenerationStore } from '../store/generation.store'
import type { GenerateRequest, GenerationMode } from '../types/generation.types'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 40

export function useGenerateMusic() {
  const {
    currentJob,
    drawerOpen,
    pollCount,
    startJob,
    updateJobStatus,
    clearJob,
    openDrawer,
    closeDrawer,
    incrementPoll,
    resetPoll,
    addToHistory,
  } = useGenerationStore()

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Poll for status
  const pollStatus = useCallback(
    async (requestId: string) => {
      const { pollCount: currentPollCount } = useGenerationStore.getState()
      if (currentPollCount >= MAX_POLL_ATTEMPTS) {
        updateJobStatus('failed', undefined, 'Generation timed out after 2 minutes')
        return
      }

      try {
        incrementPoll()
        const res = await fetch(`/api/music/status/${requestId}`)
        const data = await res.json()

        if (data.status === 'completed' && data.audio?.length) {
          const variations = data.audio.map((a: { url: string; duration?: number }) => ({
            url: a.url,
            duration: a.duration || 0,
          }))
          updateJobStatus('completed', variations)

          // Add to history
          const job = useGenerationStore.getState().currentJob
          if (job) {
            addToHistory({
              id: job.id,
              mode: job.mode,
              artistId: job.artistId,
              title: job.title,
              variations,
            })
          }
        } else if (data.status === 'failed') {
          updateJobStatus('failed', undefined, data.error || 'Generation failed')
        } else {
          // Still processing — poll again
          updateJobStatus(data.status === 'processing' ? 'processing' : 'pending')
          pollTimerRef.current = setTimeout(() => pollStatus(requestId), POLL_INTERVAL_MS)
        }
      } catch (err) {
        // Network error — retry a few times
        if (currentPollCount < MAX_POLL_ATTEMPTS) {
          pollTimerRef.current = setTimeout(() => pollStatus(requestId), POLL_INTERVAL_MS)
        } else {
          updateJobStatus('failed', undefined, 'Network error during polling')
        }
      }
    },
    [incrementPoll, updateJobStatus, addToHistory]
  )

  // Submit generation
  const generate = useCallback(
    async (req: GenerateRequest) => {
      // Abort any existing poll
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      if (abortRef.current) abortRef.current.abort()

      startJob({
        id: '',
        mode: req.mode,
        artistId: req.artistId,
        title: req.title,
        stylePrompt: req.stylePrompt,
        lyricsPrompt: req.lyricsPrompt,
        excludePrompt: req.excludePrompt,
      })

      try {
        const res = await fetch('/api/music/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        })

        if (!res.ok) {
          const data = await res.json()
          if (res.status === 402) {
            updateJobStatus('failed', undefined, 'insufficient_credits')
            return { error: 'insufficient_credits', ...data }
          }
          updateJobStatus('failed', undefined, data.error || 'Generation failed')
          return { error: data.error }
        }

        const { requestId } = await res.json()

        // Update job with real ID and start polling
        updateJobStatus('pending')
        useGenerationStore.setState((s) => ({
          currentJob: s.currentJob ? { ...s.currentJob, id: requestId } : null,
        }))

        // Start polling
        pollTimerRef.current = setTimeout(() => pollStatus(requestId), POLL_INTERVAL_MS)

        return { requestId }
      } catch (err) {
        updateJobStatus('failed', undefined, 'Network error')
        return { error: 'Network error' }
      }
    },
    [startJob, updateJobStatus, pollStatus]
  )

  // Save picked track
  const saveTrack = useCallback(
    async (variationIndex: number, catalogEntryId?: string) => {
      const job = useGenerationStore.getState().currentJob
      if (!job || !job.variations[variationIndex]) return { error: 'No variation to save' }

      const variation = job.variations[variationIndex]

      try {
        const res = await fetch('/api/music/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId: job.artistId,
            audioUrl: variation.url,
            title: job.title,
            lyrics: job.lyricsPrompt,
            mood: job.mode === 'instrumental' ? 'instrumental' : '',
            duration: variation.duration,
            catalogEntryId,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          return { error: data.error }
        }

        const { publicUrl, trackId } = await res.json()

        // Mark in history
        const { history } = useGenerationStore.getState()
        const historyEntry = history.find((h) => h.id === job.id)
        if (historyEntry) {
          useGenerationStore.getState().markPicked(job.id, variationIndex)
        }

        return { publicUrl, trackId }
      } catch {
        return { error: 'Failed to save track' }
      }
    },
    []
  )

  const isGenerating = !!currentJob && ['submitting', 'pending', 'processing'].includes(currentJob.status)

  return {
    currentJob,
    drawerOpen,
    isGenerating,
    generate,
    saveTrack,
    clearJob,
    openDrawer,
    closeDrawer,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/hooks/useGenerateMusic.ts
git commit -m "feat(music): add useGenerateMusic hook (submit → poll → save)"
```

---

## Task 9: VariationCard Component (Audio Player)

**Files:**
- Create: `src/features/music-lab/components/generation/VariationCard.tsx`

- [ ] **Step 1: Create the variation card with audio player**

```typescript
// src/features/music-lab/components/generation/VariationCard.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Download, Check, Disc3 } from 'lucide-react'
import type { GenerationVariation } from '../../types/generation.types'

interface VariationCardProps {
  label: string
  variation: GenerationVariation
  onPick: () => void
  onPlay: () => void           // notify parent so other card can pause
  shouldPause: boolean          // parent says to pause
  isPicked: boolean
  isSaving: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VariationCard({
  label,
  variation,
  onPick,
  onPlay,
  shouldPause,
  isPicked,
  isSaving,
}: VariationCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(variation.duration || 0)

  // Pause when parent says to
  useEffect(() => {
    if (shouldPause && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [shouldPause, playing])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      onPlay() // tell parent to pause other card
      audioRef.current.play()
      setPlaying(true)
    }
  }, [playing, onPlay])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = variation.url
    a.download = `${label}.mp3`
    a.click()
  }, [variation.url, label])

  return (
    <div className="p-3 rounded-[0.625rem] border border-border bg-card space-y-3">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={variation.url}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || variation.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      {/* Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc3 className={`w-4 h-4 text-cyan-400 ${playing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-semibold text-foreground tracking-[-0.025em]">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Player controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-colors"
        >
          {playing ? (
            <Pause className="w-4 h-4 text-cyan-400" />
          ) : (
            <Play className="w-4 h-4 text-cyan-400 ml-0.5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPick}
          disabled={isPicked || isSaving}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
            isPicked
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
          } disabled:opacity-50`}
        >
          <Check className="w-3.5 h-3.5" />
          {isPicked ? 'Saved' : isSaving ? 'Saving...' : 'Pick & Save'}
        </button>
        <button
          onClick={handleDownload}
          className="p-2 rounded-lg border border-border hover:bg-muted/40 transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/generation/VariationCard.tsx
git commit -m "feat(music): add VariationCard with audio player and pick/download"
```

---

## Task 10: GenerationStatus Component

**Files:**
- Create: `src/features/music-lab/components/generation/GenerationStatus.tsx`

- [ ] **Step 1: Create progress indicator**

```typescript
// src/features/music-lab/components/generation/GenerationStatus.tsx
'use client'

import { Loader2, Music } from 'lucide-react'
import type { GenerationJobStatus } from '../../types/generation.types'

interface GenerationStatusProps {
  status: GenerationJobStatus
  pollCount: number
  error?: string
  onRetry?: () => void
}

const MAX_POLLS = 40
const POLL_INTERVAL_S = 3

export function GenerationStatus({ status, pollCount, error, onRetry }: GenerationStatusProps) {
  const estimatedSeconds = Math.max(0, (MAX_POLLS - pollCount) * POLL_INTERVAL_S)
  const progress = Math.min(100, (pollCount / MAX_POLLS) * 100)

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <Music className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm text-red-400">{error === 'insufficient_credits' ? 'Not enough pts' : error}</p>
        {onRetry && error !== 'insufficient_credits' && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const statusText =
    status === 'submitting' ? 'Submitting to Suno...' :
    status === 'pending' ? 'Queued — waiting for Suno...' :
    status === 'processing' ? 'Generating your music...' :
    'Preparing...'

  return (
    <div className="p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{statusText}</p>
        <p className="text-xs text-muted-foreground">~{estimatedSeconds}s remaining</p>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/generation/GenerationStatus.tsx
git commit -m "feat(music): add GenerationStatus progress component"
```

---

## Task 11: GenerationHistory Component

**Files:**
- Create: `src/features/music-lab/components/generation/GenerationHistory.tsx`

- [ ] **Step 1: Create history list**

```typescript
// src/features/music-lab/components/generation/GenerationHistory.tsx
'use client'

import { Clock, Music, Mic } from 'lucide-react'
import { useGenerationStore } from '../../store/generation.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'

export function GenerationHistory() {
  const allHistory = useGenerationStore((s) => s.history)
  const activeArtist = useArtistDnaStore((s) => s.activeArtist)

  // Filter by active artist
  const history = activeArtist
    ? allHistory.filter((h) => h.artistId === activeArtist)
    : allHistory

  if (history.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recent Generations
        </span>
      </div>
      <div className="space-y-1">
        {history.map((entry) => (
          <div
            key={entry.id + entry.createdAt}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-muted/20 transition-colors"
          >
            {entry.mode === 'instrumental' ? (
              <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span className="flex-1 truncate text-foreground/80">{entry.title || 'Untitled'}</span>
            {entry.pickedIndex !== undefined && (
              <span className="text-[10px] text-emerald-400 font-mono">saved</span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/generation/GenerationHistory.tsx
git commit -m "feat(music): add GenerationHistory component"
```

---

## Task 12: GenerationDrawer (Main Shell)

**Files:**
- Create: `src/features/music-lab/components/generation/GenerationDrawer.tsx`

- [ ] **Step 1: Create the drawer shell** (assembles Status, VariationCards, History)

```typescript
// src/features/music-lab/components/generation/GenerationDrawer.tsx
'use client'

import { useCallback, useState } from 'react'
import { X, RefreshCw, Coins } from 'lucide-react'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { useGenerationStore } from '../../store/generation.store'
import { GenerationStatus } from './GenerationStatus'
import { VariationCard } from './VariationCard'
import { GenerationHistory } from './GenerationHistory'

interface GenerationDrawerProps {
  onRegenerate: () => void       // parent re-triggers generation with current studio state
}

export function GenerationDrawer({ onRegenerate }: GenerationDrawerProps) {
  const { currentJob, drawerOpen, isGenerating, saveTrack, closeDrawer, clearJob } = useGenerateMusic()
  const pollCount = useGenerationStore((s) => s.pollCount)

  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set())

  const handlePick = useCallback(async (index: number) => {
    setSavingIndex(index)
    const result = await saveTrack(index)
    setSavingIndex(null)
    if (!result.error) {
      setSavedIndices((prev) => new Set(prev).add(index))
    }
  }, [saveTrack])

  const handleClose = useCallback(() => {
    closeDrawer()
    if (currentJob?.status === 'completed' || currentJob?.status === 'failed') {
      clearJob()
      setSavedIndices(new Set())
      setPlayingIndex(null)
    }
  }, [closeDrawer, clearJob, currentJob])

  const handleRegenerate = useCallback(() => {
    clearJob()
    setSavedIndices(new Set())
    setPlayingIndex(null)
    onRegenerate()
  }, [clearJob, onRegenerate])

  if (!drawerOpen) return null

  const isCompleted = currentJob?.status === 'completed'
  const isFailed = currentJob?.status === 'failed'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:bg-transparent"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
              {currentJob?.mode === 'instrumental' ? 'Generate Beat' : 'Generate Song'}
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <Coins className="w-3 h-3" /> 12 pts
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status / Progress */}
          {(isGenerating || isFailed) && (
            <GenerationStatus
              status={currentJob!.status}
              pollCount={pollCount}
              error={currentJob?.error}
              onRetry={handleRegenerate}
            />
          )}

          {/* Variations */}
          {isCompleted && currentJob?.variations && currentJob.variations.length > 0 && (
            <div className="space-y-3">
              {currentJob.variations.map((v, i) => (
                <VariationCard
                  key={i}
                  label={`Variation ${String.fromCharCode(65 + i)}`}
                  variation={v}
                  onPick={() => handlePick(i)}
                  onPlay={() => setPlayingIndex(i)}
                  shouldPause={playingIndex !== null && playingIndex !== i}
                  isPicked={savedIndices.has(i)}
                  isSaving={savingIndex === i}
                />
              ))}
            </div>
          )}

          {/* Regenerate */}
          {(isCompleted || isFailed) && currentJob?.error !== 'insufficient_credits' && (
            <button
              onClick={handleRegenerate}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate (12 pts)
            </button>
          )}

          {/* History */}
          <GenerationHistory />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/components/generation/GenerationDrawer.tsx
git commit -m "feat(music): add GenerationDrawer shell component"
```

---

## Task 13: Wire Up Writing Studio (SunoExportPanel)

**Files:**
- Modify: `src/features/music-lab/components/writing-studio/SunoExportPanel.tsx`

- [ ] **Step 1: Add Generate Song button and drawer to SunoExportPanel**

Add imports at top of file:
```typescript
import { Sparkles } from 'lucide-react'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { GenerationDrawer } from '../generation/GenerationDrawer'
```

Inside the `SunoExportPanel` component, after existing hooks, add:
```typescript
  const { generate, isGenerating, drawerOpen } = useGenerateMusic()
  const activeArtist = useArtistDnaStore((s) => s.activeArtist)
  const draft = useArtistDnaStore((s) => s.draft)

  const handleGenerate = useCallback(() => {
    if (!activeArtist) return

    generate({
      mode: 'song',
      artistId: activeArtist,
      title: sections[0]?.type === 'intro' ? 'Song' : (draft.identity?.stageName || 'Song'),
      stylePrompt: styleText,
      lyricsPrompt: lyricsText,
      excludePrompt: excludeText,
      vocalGender: undefined, // deferred to persona v2
    })
  }, [activeArtist, draft, styleText, lyricsText, excludeText, sections, generate])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])
```

Replace the existing "Copy All" button (the last `<button>` before the closing `</div>` of the expanded panel) with two buttons:

```typescript
          {/* Generate + Copy All */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!activeArtist || isGenerating || !lyricsText.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating ? 'Generating...' : 'Generate Song — 12 pts'}
            </button>
            <button
              onClick={onCopyAll}
              className="shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-zinc-500/30 text-xs font-medium text-zinc-400 hover:bg-zinc-500/10 transition-colors"
              title="Copy all to clipboard"
            >
              {copiedAll ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Generation Drawer */}
          <GenerationDrawer onRegenerate={handleRegenerate} />
```

- [ ] **Step 2: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/writing-studio/SunoExportPanel.tsx
git commit -m "feat(music): add Generate Song button to Writing Studio SunoExportPanel"
```

---

## Task 14: Wire Up Sound Studio (SunoPromptPreview)

**Files:**
- Modify: `src/features/music-lab/components/sound-studio/SunoPromptPreview.tsx`

- [ ] **Step 1: Add Generate Beat button and drawer to SunoPromptPreview**

Add imports at top of file:
```typescript
import { useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { GenerationDrawer } from '../generation/GenerationDrawer'
```

Inside the `SunoPromptPreview` component, after existing hooks, add:
```typescript
  const { generate, isGenerating } = useGenerateMusic()
  const activeArtist = useArtistDnaStore((s) => s.activeArtist)
  const [beatTitle, setBeatTitle] = useState('')

  const handleGenerate = useCallback(() => {
    if (!activeArtist || !sunoPrompt) return

    generate({
      mode: 'instrumental',
      artistId: activeArtist,
      title: beatTitle || 'Untitled Beat',
      stylePrompt: sunoPrompt,
      lyricsPrompt: '',
      excludePrompt: settings.negativeTags.join(', '),
    })
  }, [activeArtist, sunoPrompt, beatTitle, settings.negativeTags, generate])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])
```

After the existing negative tags section and before the closing `</div>` of the component, add:

```typescript
      {/* Beat title input */}
      <div>
        <input
          type="text"
          value={beatTitle}
          onChange={(e) => setBeatTitle(e.target.value)}
          placeholder="Beat title (optional)"
          className="w-full rounded-[0.625rem] border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        />
      </div>

      {/* Generate Beat button */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={!activeArtist || isGenerating || !sunoPrompt}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[0.625rem] bg-cyan-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isGenerating ? 'Generating...' : 'Generate Beat — 12 pts'}
        </button>
        <button
          onClick={handleCopy}
          disabled={!sunoPrompt}
          className="shrink-0 p-2 rounded-[0.625rem] border border-border hover:bg-muted/40 transition-colors disabled:opacity-30"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Generation Drawer */}
      <GenerationDrawer onRegenerate={handleRegenerate} />
```

- [ ] **Step 2: Build and verify**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/music-lab/components/sound-studio/SunoPromptPreview.tsx
git commit -m "feat(music): add Generate Beat button to Sound Studio SunoPromptPreview"
```

---

## Task 15: Add saveCatalogAudio to Artist DNA Store

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

- [ ] **Step 1: Add saveCatalogAudio action**

Find the store's action definitions and add:

```typescript
  saveCatalogAudio: (entryId: string, audioUrl: string, audioDuration: number) => void
```

In the implementation section, add:

```typescript
      saveCatalogAudio: (entryId, audioUrl, audioDuration) =>
        set((state) => {
          const catalog = state.draft.catalog || { entries: [] }
          const updatedEntries = catalog.entries.map((entry) =>
            entry.id === entryId
              ? { ...entry, audioUrl, audioDuration }
              : entry
          )
          return {
            draft: {
              ...state.draft,
              catalog: { ...catalog, entries: updatedEntries },
            },
          }
        }),
```

- [ ] **Step 2: Commit**

```bash
git add src/features/music-lab/store/artist-dna.store.ts
git commit -m "feat(music): add saveCatalogAudio action to artist DNA store"
```

---

## Task 16: Add MUAPI_KEY to Environment

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Add MUAPI_KEY**

Add to `.env.local`:
```
MUAPI_KEY=<get from https://muapi.ai dashboard>
```

- [ ] **Step 2: Verify the key works**

```bash
curl -s -X POST https://muapi.ai/api/v1/suno-create-music \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY_HERE" \
  -d '{"prompt":"test","style":"pop","custom_mode":false}' | head -c 200
```

Check the response shape — this confirms the endpoint URL, auth header, and response format before full integration.

- [ ] **Step 3: No commit** (`.env.local` is gitignored)

---

## Task 17: Full Build + Manual Smoke Test

- [ ] **Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

Fix any TypeScript or ESLint errors.

- [ ] **Step 2: Start dev server and test**

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

Manual test checklist:
1. Open Music Lab → select an artist
2. Go to Writing Studio → write a section → expand Suno Export → click "Generate Song"
3. Verify drawer opens, progress shows, polling works
4. After completion, verify 2 variations appear with working audio players
5. Pick a variation → verify it saves to catalog
6. Go to Sound Studio → configure settings → click "Generate Beat"
7. Verify same flow works for instrumentals
8. Test with insufficient credits → verify 402 handling
9. Test on mobile viewport → verify full-screen drawer

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix(music): build fixes for Suno generation integration"
git push origin main
```
