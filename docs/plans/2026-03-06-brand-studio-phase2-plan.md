# Brand Studio Phase 2: Content Generation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 4 brand-aware content generators (Image, Video, Voice, Music) in the Brand Studio Create tab.

**Architecture:** Direct API calls from Next.js routes, Zustand store for generation state, brand boost prompt enrichment, reuses existing StorageService/creditsService/gallery patterns.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Zustand, Replicate API, ElevenLabs API, Supabase Storage

---

### Task 1: Brand Boost Service — Prompt Enrichment

**Files:**
- Create: `src/features/brand-studio/services/brand-boost.service.ts`

**Step 1: Create the brand boost service**

```typescript
import type { Brand } from '../types'

export class BrandBoostService {
  static enrichImagePrompt(prompt: string, brand: Brand): string {
    const parts = [prompt]
    const colors = brand.visual_identity_json?.colors
    if (colors?.length) {
      parts.push(`Color palette: ${colors.map(c => `${c.name} (${c.hex})`).join(', ')}`)
    }
    const style = brand.visual_style_json
    if (style) {
      if (style.photography_tone) parts.push(`Photography tone: ${style.photography_tone}`)
      if (style.subjects?.length) parts.push(`Visual style: ${style.subjects.join(', ')}`)
      if (style.composition) parts.push(`Composition: ${style.composition}`)
    }
    return parts.join('. ')
  }

  static enrichVideoPrompt(prompt: string, brand: Brand): string {
    // Same as image enrichment — video models use similar prompt format
    return BrandBoostService.enrichImagePrompt(prompt, brand)
  }

  static enrichMusicPrompt(prompt: string, brand: Brand): string {
    const parts = [prompt]
    const music = brand.music_json
    if (music) {
      if (music.genres?.length) parts.push(`Genre: ${music.genres.join(', ')}`)
      if (music.moods?.length) parts.push(`Mood: ${music.moods.join(', ')}`)
      if (music.bpm_range) parts.push(`BPM: ${music.bpm_range.min}-${music.bpm_range.max}`)
    }
    return parts.join('. ')
  }

  static getVoiceSettings(brand: Brand): { stability: number; similarity_boost: number } {
    const voice = brand.voice_json
    if (!voice) return { stability: 0.5, similarity_boost: 0.75 }
    // Map brand tone to voice settings
    const tones = voice.tone.map(t => t.toLowerCase())
    const isCalm = tones.some(t => ['calm', 'professional', 'warm', 'gentle'].includes(t))
    const isEnergetic = tones.some(t => ['energetic', 'bold', 'dynamic', 'exciting'].includes(t))
    return {
      stability: isCalm ? 0.7 : isEnergetic ? 0.3 : 0.5,
      similarity_boost: 0.75,
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to brand-boost.service.ts

**Step 3: Commit**

```bash
git add src/features/brand-studio/services/brand-boost.service.ts
git commit -m "feat(brand-studio): add BrandBoostService for prompt enrichment"
git push origin main
```

---

### Task 2: Image Generation API Route

**Files:**
- Create: `src/app/api/brand-studio/generate/image/route.ts`

**Step 1: Create the image generation route**

This route follows the same pattern as `src/app/api/generation/image/route.ts` but simplified — no anchor transforms, no reference images. Just prompt → image with optional brand boost.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import type { Brand } from '@/features/brand-studio/types'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
const CREDIT_COST = 10

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    const body = await request.json()
    const { prompt, brandId, brandBoost, aspectRatio = '1:1' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Check credits
    const balance = await creditsService.getBalance(user.id)
    if (balance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance }, { status: 402 })
    }

    // Brand boost enrichment
    let finalPrompt = prompt.trim()
    if (brandBoost && brandId) {
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) {
        finalPrompt = BrandBoostService.enrichImagePrompt(finalPrompt, brand as Brand)
      }
    }

    // Generate via Replicate
    const model = 'fofr/nano-banana-2'
    const prediction = await replicate.predictions.create({
      model,
      input: {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        num_outputs: 1,
        output_format: 'jpg',
        output_quality: 90,
      },
    })

    // Poll for completion (nano-banana is fast, ~10-30s)
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 2000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      return NextResponse.json({ error: 'Image generation failed', details: result.error }, { status: 500 })
    }

    // Get output URL
    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return NextResponse.json({ error: 'No output from model' }, { status: 500 })
    }

    // Download and persist to Supabase storage
    const { buffer } = await StorageService.downloadAsset(outputUrl)
    const { ext, mimeType } = StorageService.getMimeType(outputUrl, 'jpg')
    const { publicUrl } = await StorageService.uploadToStorage(buffer, user.id, result.id, ext, mimeType)

    // Create gallery entry
    await supabase.from('gallery').insert({
      user_id: user.id,
      prediction_id: result.id,
      generation_type: 'image',
      status: 'completed',
      public_url: publicUrl,
      mime_type: mimeType,
      metadata: {
        prompt: finalPrompt,
        original_prompt: prompt.trim(),
        model,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        aspect_ratio: aspectRatio,
        source: 'brand-studio',
      },
    })

    // Deduct credits
    await creditsService.deductCredits(user.id, model, {
      generationType: 'image',
      predictionId: result.id,
      description: `Brand Studio image generation`,
      overrideAmount: CREDIT_COST,
      user_email: user.email,
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId: result.id,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Test with cURL**

```bash
curl -X POST http://localhost:3002/api/brand-studio/generate/image \
  -H "Content-Type: application/json" \
  -H "Cookie: <auth-cookie>" \
  -d '{"prompt":"A vibrant abstract logo","aspectRatio":"1:1"}'
```

**Step 4: Commit**

```bash
git add src/app/api/brand-studio/generate/image/route.ts
git commit -m "feat(brand-studio): add image generation API route"
git push origin main
```

---

### Task 3: Video Generation API Route

**Files:**
- Create: `src/app/api/brand-studio/generate/video/route.ts`

**Step 1: Create the video generation route**

Follow the existing video route pattern but simplified. Uses webhook for async completion.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import type { Brand } from '@/features/brand-studio/types'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

const COSTS = { 'seedance-lite': 25, 'seedance-pro': 40 } as const
type VideoModel = keyof typeof COSTS

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    const body = await request.json()
    const { prompt, brandId, brandBoost, model = 'seedance-lite', duration = 5, imageUrl } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const creditCost = COSTS[model as VideoModel] || 25
    const balance = await creditsService.getBalance(user.id)
    if (balance < creditCost) {
      return NextResponse.json({ error: 'Insufficient credits', required: creditCost, balance }, { status: 402 })
    }

    let finalPrompt = prompt.trim()
    if (brandBoost && brandId) {
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) finalPrompt = BrandBoostService.enrichVideoPrompt(finalPrompt, brand as Brand)
    }

    const modelId = model === 'seedance-pro'
      ? 'seedance-community/seedance:latest'
      : 'seedance-community/seedance-lite:latest'

    const input: Record<string, unknown> = {
      prompt: finalPrompt,
      duration,
    }
    if (imageUrl) input.image = imageUrl

    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : undefined

    const prediction = await replicate.predictions.create({
      model: modelId,
      input,
      ...(webhookUrl ? { webhook: webhookUrl, webhook_events_filter: ['completed'] } : {}),
    })

    // Create gallery entry (pending — webhook will finalize)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('gallery').insert({
      user_id: user.id,
      prediction_id: prediction.id,
      generation_type: 'video',
      status: 'pending',
      expires_at: expiresAt,
      metadata: {
        prompt: finalPrompt,
        original_prompt: prompt.trim(),
        model: modelId,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        duration,
        source: 'brand-studio',
      },
    })

    // Log generation event
    await supabase.from('generation_events').insert({
      user_id: user.id,
      prediction_id: prediction.id,
      generation_type: 'video',
      model_id: modelId,
      credits_cost: creditCost,
      prompt: finalPrompt,
    })

    // Deduct credits immediately for video (webhook handles storage)
    await creditsService.deductCredits(user.id, modelId, {
      generationType: 'video',
      predictionId: prediction.id,
      description: `Brand Studio video generation (${model})`,
      overrideAmount: creditCost,
      user_email: user.email,
    })

    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: 'pending',
      creditsUsed: creditCost,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Verify & Commit**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
git add src/app/api/brand-studio/generate/video/route.ts
git commit -m "feat(brand-studio): add video generation API route"
git push origin main
```

---

### Task 4: Voice Generation API Route

**Files:**
- Create: `src/app/api/brand-studio/generate/voice/route.ts`

**Step 1: Create the voice generation route**

Uses ElevenLabs TTS API directly (not Replicate).

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import type { Brand } from '@/features/brand-studio/types'
import { createClient } from '@supabase/supabase-js'

const CREDIT_COST = 5
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB' // Adam

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    const body = await request.json()
    const { text, brandId, brandBoost, voiceId = DEFAULT_VOICE_ID, modelId = 'eleven_multilingual_v2' } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const balance = await creditsService.getBalance(user.id)
    if (balance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance }, { status: 402 })
    }

    // Get brand voice settings if brand boost is on
    let voiceSettings = { stability: 0.5, similarity_boost: 0.75 }
    if (brandBoost && brandId) {
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) voiceSettings = BrandBoostService.getVoiceSettings(brand as Brand)
    }

    // Call ElevenLabs TTS
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: modelId,
        voice_settings: voiceSettings,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json({ error: 'Voice generation failed', details: errText }, { status: 500 })
    }

    // Get audio buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer())
    const predictionId = `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Upload to Supabase storage
    const { publicUrl } = await StorageService.uploadToStorage(
      audioBuffer, user.id, predictionId, 'mp3', 'audio/mpeg'
    )

    // Gallery entry
    await supabase.from('gallery').insert({
      user_id: user.id,
      prediction_id: predictionId,
      generation_type: 'audio',
      status: 'completed',
      public_url: publicUrl,
      mime_type: 'audio/mpeg',
      metadata: {
        text: text.trim(),
        voice_id: voiceId,
        model_id: modelId,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        voice_settings: voiceSettings,
        source: 'brand-studio',
      },
    })

    // Deduct credits
    await creditsService.deductCredits(user.id, 'elevenlabs-tts', {
      generationType: 'audio',
      predictionId,
      description: 'Brand Studio voice generation',
      overrideAmount: CREDIT_COST,
      user_email: user.email,
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Verify & Commit**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
git add src/app/api/brand-studio/generate/voice/route.ts
git commit -m "feat(brand-studio): add voice generation API route"
git push origin main
```

---

### Task 5: Music Generation API Route

**Files:**
- Create: `src/app/api/brand-studio/generate/music/route.ts`

**Step 1: Create the music generation route**

Uses Replicate's MiniMax Music model.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getAuthenticatedUser } from '@/lib/auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { BrandBoostService } from '@/features/brand-studio/services/brand-boost.service'
import type { Brand } from '@/features/brand-studio/types'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
const CREDIT_COST = 15
const MODEL = 'minimax/music-01'

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request)
    const body = await request.json()
    const { prompt, brandId, brandBoost, duration = 30, instrumental = true } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const balance = await creditsService.getBalance(user.id)
    if (balance < CREDIT_COST) {
      return NextResponse.json({ error: 'Insufficient credits', required: CREDIT_COST, balance }, { status: 402 })
    }

    let finalPrompt = prompt.trim()
    if (brandBoost && brandId) {
      const { data: brand } = await supabase.from('brands').select('*').eq('id', brandId).single()
      if (brand) finalPrompt = BrandBoostService.enrichMusicPrompt(finalPrompt, brand as Brand)
    }

    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt: finalPrompt,
        duration,
        instrumental,
      },
    })

    // Poll for completion
    let result = prediction
    while (result.status !== 'succeeded' && result.status !== 'failed') {
      await new Promise(r => setTimeout(r, 3000))
      result = await replicate.predictions.get(result.id)
    }

    if (result.status === 'failed') {
      return NextResponse.json({ error: 'Music generation failed', details: result.error }, { status: 500 })
    }

    const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
    if (!outputUrl) {
      return NextResponse.json({ error: 'No output from model' }, { status: 500 })
    }

    // Download and persist
    const { buffer } = await StorageService.downloadAsset(outputUrl)
    const { publicUrl } = await StorageService.uploadToStorage(
      buffer, user.id, result.id, 'mp3', 'audio/mpeg'
    )

    // Gallery entry
    await supabase.from('gallery').insert({
      user_id: user.id,
      prediction_id: result.id,
      generation_type: 'audio',
      status: 'completed',
      public_url: publicUrl,
      mime_type: 'audio/mpeg',
      metadata: {
        prompt: finalPrompt,
        original_prompt: prompt.trim(),
        model: MODEL,
        brand_id: brandId || null,
        brand_boost: !!brandBoost,
        duration,
        instrumental,
        source: 'brand-studio',
      },
    })

    // Deduct credits
    await creditsService.deductCredits(user.id, MODEL, {
      generationType: 'audio',
      predictionId: result.id,
      description: 'Brand Studio music generation',
      overrideAmount: CREDIT_COST,
      user_email: user.email,
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      predictionId: result.id,
      creditsUsed: CREDIT_COST,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**Step 2: Verify & Commit**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
git add src/app/api/brand-studio/generate/music/route.ts
git commit -m "feat(brand-studio): add music generation API route"
git push origin main
```

---

### Task 6: Generation Store (Zustand)

**Files:**
- Create: `src/features/brand-studio/hooks/useGenerationStore.ts`

**Step 1: Create the generation store**

```typescript
import { create } from 'zustand'

export type GeneratorType = 'image' | 'video' | 'voice' | 'music'

interface GenerationResult {
  type: GeneratorType
  url: string
  predictionId: string
  creditsUsed: number
  timestamp: number
}

interface GenerationStoreState {
  activeGenerator: GeneratorType | null
  isGenerating: boolean
  error: string | null
  lastResult: GenerationResult | null
  recentResults: GenerationResult[]

  setActiveGenerator: (type: GeneratorType | null) => void
  generateImage: (params: { prompt: string; brandId?: string; brandBoost?: boolean; aspectRatio?: string }) => Promise<void>
  generateVideo: (params: { prompt: string; brandId?: string; brandBoost?: boolean; model?: string; duration?: number; imageUrl?: string }) => Promise<void>
  generateVoice: (params: { text: string; brandId?: string; brandBoost?: boolean; voiceId?: string }) => Promise<void>
  generateMusic: (params: { prompt: string; brandId?: string; brandBoost?: boolean; duration?: number; instrumental?: boolean }) => Promise<void>
  clearError: () => void
}

export const useGenerationStore = create<GenerationStoreState>((set, get) => ({
  activeGenerator: null,
  isGenerating: false,
  error: null,
  lastResult: null,
  recentResults: [],

  setActiveGenerator: (type) => set({ activeGenerator: type, error: null, lastResult: null }),

  generateImage: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const res = await fetch('/api/brand-studio/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      const result: GenerationResult = {
        type: 'image',
        url: data.url,
        predictionId: data.predictionId,
        creditsUsed: data.creditsUsed,
        timestamp: Date.now(),
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  generateVideo: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const res = await fetch('/api/brand-studio/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      const result: GenerationResult = {
        type: 'video',
        url: '', // Video is async — no URL yet
        predictionId: data.predictionId,
        creditsUsed: data.creditsUsed,
        timestamp: Date.now(),
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  generateVoice: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const res = await fetch('/api/brand-studio/generate/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      const result: GenerationResult = {
        type: 'voice',
        url: data.url,
        predictionId: data.predictionId,
        creditsUsed: data.creditsUsed,
        timestamp: Date.now(),
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  generateMusic: async (params) => {
    set({ isGenerating: true, error: null, lastResult: null })
    try {
      const res = await fetch('/api/brand-studio/generate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      const result: GenerationResult = {
        type: 'music',
        url: data.url,
        predictionId: data.predictionId,
        creditsUsed: data.creditsUsed,
        timestamp: Date.now(),
      }
      set(s => ({ lastResult: result, recentResults: [result, ...s.recentResults].slice(0, 12) }))
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      set({ isGenerating: false })
    }
  },

  clearError: () => set({ error: null }),
}))
```

**Step 2: Verify & Commit**

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
git add src/features/brand-studio/hooks/useGenerationStore.ts
git commit -m "feat(brand-studio): add useGenerationStore for content generation state"
git push origin main
```

---

### Task 7: Create Tab UI — Generator Picker + Generator Panels

**Files:**
- Rewrite: `src/features/brand-studio/components/tabs/CreateTab.tsx`
- Create: `src/features/brand-studio/components/tabs/generators/ImageGenerator.tsx`
- Create: `src/features/brand-studio/components/tabs/generators/VideoGenerator.tsx`
- Create: `src/features/brand-studio/components/tabs/generators/VoiceGenerator.tsx`
- Create: `src/features/brand-studio/components/tabs/generators/MusicGenerator.tsx`

**Step 1: Create ImageGenerator component**

A panel with: prompt textarea, aspect ratio selector, brand boost toggle, generate button, result display.

**Step 2: Create VideoGenerator component**

A panel with: prompt textarea, model selector (lite/pro), duration selector, optional image URL input, brand boost toggle, generate button, pending status display.

**Step 3: Create VoiceGenerator component**

A panel with: text textarea, voice selector, brand boost toggle, generate button, audio player result.

**Step 4: Create MusicGenerator component**

A panel with: prompt textarea, duration selector, instrumental toggle, brand boost toggle, generate button, audio player result.

**Step 5: Rewrite CreateTab**

Replace the placeholder with:
- Generator picker: 2x2 grid of active generators + 2 locked cards
- When a generator is selected, show its panel with AnimatePresence transition
- Back button to return to picker

**Step 6: Unlock the Create tab in BrandStudioLayout**

In `BrandStudioLayout.tsx`, change the Create tab from `disabled: true` to `disabled: false`.

**Step 7: Clean build**

```bash
rm -rf .next && npm run build
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(brand-studio): build Create tab with Image, Video, Voice, Music generators"
git push origin main
```

---

### Task 8: Final Build Verification + Visual Test

**Step 1: Clean build**

```bash
rm -rf .next && npm run build
```
Expected: Build succeeds with no errors.

**Step 2: Start dev server and verify**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002
```
Expected: 200

**Step 3: Commit any final fixes**

If build revealed issues, fix and commit.
