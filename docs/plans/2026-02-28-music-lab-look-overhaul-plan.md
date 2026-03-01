# Music Lab Look Tab Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 4 sub-tabs (Profile, Character Sheet, Photo Shoot, Gallery) to the Music Lab Look tab, with dynamic AI-powered photo shoot generation using the character sheet as an identity anchor.

**Architecture:** The existing `LookTab.tsx` becomes a sub-tab router. Profile keeps existing fields. Character Sheet gets full-width display. Photo Shoot generates lifestyle images using artist DNA to build prompts dynamically (city, neighborhood, ethnicity, fashion, personality). Gallery stores all generated images with fullscreen/delete/download actions. All photo shoot generation uses nano-banana-2 with the character sheet as `image_input` reference.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Tailwind CSS, Replicate (nano-banana-2), Supabase storage

---

### Task 1: Add gallery types to ArtistDNA

**Files:**
- Modify: `src/features/music-lab/types/artist-dna.types.ts`

**Step 1: Add gallery item types after ArtistLook interface (line 66)**

```typescript
// After ArtistLook interface, add:

export type GalleryItemType = 'character-sheet' | 'portrait' | 'photo-shoot'
export type PhotoShootCategory = 'wardrobe' | 'location' | 'social' | 'performance'

export interface ArtistGalleryItem {
  id: string
  url: string
  type: GalleryItemType
  category?: PhotoShootCategory
  prompt?: string
  aspectRatio: string
  createdAt: string
}
```

**Step 2: Add gallery field to ArtistLook interface**

Add `gallery: ArtistGalleryItem[]` to the `ArtistLook` interface after `characterSheetUrl`.

**Step 3: Update createEmptyDNA**

Add `gallery: []` to the look section in `createEmptyDNA()`.

**Step 4: Run build to verify types**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds (gallery field is empty array, no breakage)

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add gallery item types to ArtistDNA"
```

---

### Task 2: Create the Photo Shoot prompt builder service

**Files:**
- Create: `src/features/music-lab/services/photo-shoot.service.ts`

**Step 1: Create the prompt builder**

This is the core — builds rich, dynamic prompts from artist DNA fields. Each category has 4-5 scene templates that pull from the artist's identity, look, persona, and sound.

```typescript
import type { ArtistDNA } from '../types/artist-dna.types'
import type { PhotoShootCategory } from '../types/artist-dna.types'

interface PhotoShootScene {
  id: string
  label: string
  category: PhotoShootCategory
  aspectRatio: '16:9' | '9:16' | '1:1'
  buildPrompt: (dna: ArtistDNA) => string
}

function getArtistName(dna: ArtistDNA): string {
  return dna.identity.stageName || dna.identity.realName || 'the artist'
}

function getLocationContext(dna: ArtistDNA): string {
  const parts: string[] = []
  if (dna.identity.neighborhood) parts.push(dna.identity.neighborhood)
  if (dna.identity.city) parts.push(dna.identity.city)
  if (dna.identity.state) parts.push(dna.identity.state)
  return parts.join(', ') || 'an urban neighborhood'
}

function getEthnicityContext(dna: ArtistDNA): string {
  return dna.identity.ethnicity ? `${dna.identity.ethnicity} ` : ''
}

function getAppearanceBlock(dna: ArtistDNA): string {
  const parts: string[] = []
  if (dna.look.skinTone) parts.push(`${dna.look.skinTone} skin`)
  if (dna.look.hairStyle) parts.push(`${dna.look.hairStyle} hair`)
  if (dna.look.fashionStyle) parts.push(`wearing ${dna.look.fashionStyle}`)
  if (dna.look.jewelry) parts.push(`${dna.look.jewelry} jewelry`)
  if (dna.look.tattoos) parts.push(`${dna.look.tattoos} tattoos`)
  return parts.join(', ')
}

function getGenreAesthetic(dna: ArtistDNA): string {
  const genres = dna.sound.genres?.slice(0, 2).join('/') || ''
  return genres ? `${genres} music aesthetic` : 'music artist aesthetic'
}

function getPersonalityVibe(dna: ArtistDNA): string {
  const traits = dna.persona.traits?.slice(0, 3).join(', ')
  const attitude = dna.persona.attitude
  if (traits && attitude) return `${traits}, ${attitude} energy`
  return traits || attitude || 'confident energy'
}

export const PHOTO_SHOOT_SCENES: PhotoShootScene[] = [
  // === WARDROBE ===
  {
    id: 'wardrobe-streetwear',
    label: 'Streetwear Look',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}${getGenreAesthetic(dna)} artist standing on a street corner in ${getLocationContext(dna)}, full-body fashion editorial shot. ${getAppearanceBlock(dna)}. Streetwear outfit, urban backdrop with graffiti walls and parked cars. Natural afternoon sunlight, 35mm lens, candid editorial photography style, sharp focus, vibrant colors. The subject has ${getPersonalityVibe(dna)}. Realistic photograph, NOT illustration, NOT cartoon.`
  },
  {
    id: 'wardrobe-stage',
    label: 'Stage Outfit',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}${getGenreAesthetic(dna)} artist in a bold stage performance outfit, full-body shot under dramatic concert lighting. ${getAppearanceBlock(dna)}. Standing on a dark stage with colored spotlights (purple, blue, amber) creating rim lighting and lens flares. Smoke machine haze in the background. Dynamic confident pose. 50mm lens, concert photography, high detail, sharp focus. Realistic photograph.`
  },
  {
    id: 'wardrobe-studio-casual',
    label: 'Studio Casual',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist in casual studio attire, leaning against a recording studio wall. ${getAppearanceBlock(dna)}. Relaxed pose, headphones around neck, warm interior lighting from studio monitors. Soundproofing foam panels visible in background. 35mm lens, shallow depth of field, warm color temperature, candid portrait photography. Realistic photograph.`
  },
  {
    id: 'wardrobe-press',
    label: 'Press / Red Carpet',
    category: 'wardrobe',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}${getGenreAesthetic(dna)} artist posing at a press event, three-quarter body shot. ${getAppearanceBlock(dna)}. Dressed sharp for an industry event. Clean backdrop with subtle branding, professional flash photography lighting, red carpet atmosphere. Confident pose, looking directly at camera. 85mm portrait lens, editorial style, crisp focus. Realistic photograph.`
  },

  // === LOCATIONS ===
  {
    id: 'location-neighborhood',
    label: 'The Block',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist walking through ${dna.identity.neighborhood || 'their neighborhood'} in ${dna.identity.city || 'the city'}, wide environmental portrait. ${getAppearanceBlock(dna)}. Authentic street scene with local shops, corner stores, residential buildings in background. Golden hour sunlight casting long shadows. 28mm wide angle lens, street photography style, documentary feel, natural colors. The subject looks comfortable and at home. Realistic photograph.`
  },
  {
    id: 'location-rooftop',
    label: 'Rooftop Golden Hour',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist standing on a city rooftop at golden hour, ${getLocationContext(dna)} skyline in the background. ${getAppearanceBlock(dna)}. Warm golden sunlight backlighting the subject, city buildings silhouetted. Confident stance leaning on rooftop railing. 35mm lens, shallow depth of field, warm color grading, editorial portrait. Realistic photograph.`
  },
  {
    id: 'location-studio',
    label: 'Recording Studio',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist in a professional recording studio, seated at the mixing console. ${getAppearanceBlock(dna)}. Studio monitors glowing, microphone visible in the vocal booth through glass. Warm low lighting with LED accent strips. Focused expression reviewing a mix. 35mm lens, shallow DOF, warm amber tones, music industry documentary photography. Realistic photograph.`
  },
  {
    id: 'location-night-street',
    label: 'Night Street',
    category: 'location',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist standing under neon signs on a busy street at night in ${dna.identity.city || 'the city'}. ${getAppearanceBlock(dna)}. Neon reflections on wet pavement, bokeh city lights in background, car headlights streaking past. Moody cinematic lighting with teal and orange color grading. 50mm lens, f/1.8, cinematic night photography. Realistic photograph.`
  },

  // === SOCIAL MEDIA ===
  {
    id: 'social-mirror-selfie',
    label: 'Mirror Selfie',
    category: 'social',
    aspectRatio: '9:16',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist taking a mirror selfie in a stylish bedroom, smartphone held up covering part of face. ${getAppearanceBlock(dna)}. Modern bedroom with LED strip lights, posters on wall, organized but lived-in. Smartphone rear camera shooting via mirror, natural deep depth of field, 26mm equivalent focal length. Casual confident pose. Instagram-style candid photo, natural lighting from window. Realistic photograph, NOT illustration.`
  },
  {
    id: 'social-car',
    label: 'Car Selfie',
    category: 'social',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist in the driver seat of a car, candid selfie angle from slightly above. ${getAppearanceBlock(dna)}. Car interior visible, sunglasses on or pushed up on forehead. Natural sunlight through windshield. ${getPersonalityVibe(dna)}. Smartphone front camera, 24mm equivalent, natural perspective, casual expression. Social media candid style. Realistic photograph.`
  },
  {
    id: 'social-with-friends',
    label: 'Celebrating with Friends',
    category: 'social',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist celebrating with a group of friends at a lounge in ${dna.identity.city || 'the city'}, candid group photo. The artist in center focus, ${getAppearanceBlock(dna)}. Friends laughing and toasting drinks. VIP lounge setting with ambient lighting, bottle service table. Flash photography, candid nightlife shot, slightly overexposed flash giving authentic party feel. Realistic photograph.`
  },
  {
    id: 'social-food-spot',
    label: 'At the Food Spot',
    category: 'social',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist sitting at a table in a local restaurant in ${dna.identity.neighborhood || dna.identity.city || 'the city'}, candid dining photo. ${getAppearanceBlock(dna)}. Food on the table, casual relaxed expression looking at camera. Warm interior restaurant lighting, bokeh background with other diners. 35mm lens, shallow DOF, warm tones, candid social media style. Realistic photograph.`
  },

  // === PERFORMANCE ===
  {
    id: 'performance-stage',
    label: 'Live on Stage',
    category: 'performance',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}${getGenreAesthetic(dna)} artist performing live on a large concert stage, crowd visible in foreground silhouette. ${getAppearanceBlock(dna)}. Holding microphone, dynamic mid-performance pose. Dramatic stage lighting with colored spotlights cutting through haze. Massive crowd energy, hands raised. 70-200mm telephoto lens, concert photography, fast shutter speed freezing motion, high ISO grain. Realistic photograph.`
  },
  {
    id: 'performance-booth',
    label: 'In the Booth',
    category: 'performance',
    aspectRatio: '1:1',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist recording vocals in an isolated vocal booth, close-up through the studio glass. ${getAppearanceBlock(dna)}. Professional condenser microphone, pop filter, closed-back headphones on. Eyes closed, emotionally invested in the performance. Warm booth lighting, soundproofing visible. 85mm portrait lens shot through studio window, shallow DOF. Realistic photograph.`
  },
  {
    id: 'performance-festival',
    label: 'Festival Crowd Shot',
    category: 'performance',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}music artist at an outdoor music festival, wide shot from the crowd perspective. ${getAppearanceBlock(dna)}. On a large outdoor stage with festival branding, massive crowd with hands up, water cannons spraying mist catching colorful stage lights. Palm trees and sunset sky in background. Energetic pose commanding the crowd. 35mm wide angle, festival photography, vibrant saturated colors, high energy. Realistic photograph.`
  },
  {
    id: 'performance-music-video',
    label: 'Music Video Pose',
    category: 'performance',
    aspectRatio: '16:9',
    buildPrompt: (dna) => `A ${getEthnicityContext(dna)}${getGenreAesthetic(dna)} artist in a cinematic music video shot, stylized pose against a dramatic backdrop. ${getAppearanceBlock(dna)}. Cinematic 2.39:1 framing feel, anamorphic lens with horizontal flare from a practical light source. Moody atmospheric lighting with smoke and colored gels. Art-directed environment matching their ${getGenreAesthetic(dna)}. 40mm anamorphic lens, shallow DOF, film grain, music video production photography. Realistic photograph.`
  },
]

/**
 * Get scenes filtered by category
 */
export function getScenesByCategory(category: PhotoShootCategory): PhotoShootScene[] {
  return PHOTO_SHOOT_SCENES.filter(s => s.category === category)
}

/**
 * Build a prompt for a specific scene with the artist's DNA
 */
export function buildPhotoShootPrompt(sceneId: string, dna: ArtistDNA): { prompt: string; aspectRatio: string } | null {
  const scene = PHOTO_SHOOT_SCENES.find(s => s.id === sceneId)
  if (!scene) return null
  return {
    prompt: scene.buildPrompt(dna),
    aspectRatio: scene.aspectRatio,
  }
}

/**
 * Get all available categories with their scene counts
 */
export function getPhotoShootCategories(): { id: PhotoShootCategory; label: string; count: number }[] {
  return [
    { id: 'wardrobe', label: 'Wardrobe / Outfits', count: getScenesByCategory('wardrobe').length },
    { id: 'location', label: 'Locations', count: getScenesByCategory('location').length },
    { id: 'social', label: 'Social Media', count: getScenesByCategory('social').length },
    { id: 'performance', label: 'Performance', count: getScenesByCategory('performance').length },
  ]
}
```

**Step 2: Run build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(music-lab): add photo shoot prompt builder service with dynamic DNA-based prompts"
```

---

### Task 3: Create the Photo Shoot API endpoint

**Files:**
- Create: `src/app/api/artist-dna/generate-photo-shoot/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import Replicate from 'replicate'
import { logger } from '@/lib/logger'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface PhotoShootRequest {
  prompt: string
  aspectRatio: string  // '16:9' | '9:16' | '1:1'
  characterSheetUrl: string  // Used as image_input reference
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json() as PhotoShootRequest

    if (!body.prompt || !body.characterSheetUrl) {
      return NextResponse.json(
        { error: 'prompt and characterSheetUrl are required' },
        { status: 400 }
      )
    }

    const prediction = await replicate.predictions.create({
      model: 'google/nano-banana-2',
      input: {
        prompt: body.prompt,
        aspect_ratio: body.aspectRatio || '16:9',
        image_input: body.characterSheetUrl,
        output_format: 'jpg',
      },
    })

    const completed = await replicate.wait(prediction, { interval: 1000 })

    if (completed.status === 'succeeded' && completed.output) {
      const url = Array.isArray(completed.output)
        ? completed.output[0]
        : completed.output
      return NextResponse.json({ url })
    }

    return NextResponse.json(
      { error: 'Photo shoot generation failed' },
      { status: 500 }
    )
  } catch (error) {
    logger.api.error('Photo shoot generation error', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Step 2: Build and commit**

```bash
rm -rf .next && npm run build 2>&1 | tail -5
git add -A && git commit -m "feat(music-lab): add photo shoot generation API endpoint"
```

---

### Task 4: Create the 4 sub-tab components

**Files:**
- Create: `src/features/music-lab/components/artist-dna/tabs/look/ProfileSubTab.tsx`
- Create: `src/features/music-lab/components/artist-dna/tabs/look/CharacterSheetSubTab.tsx`
- Create: `src/features/music-lab/components/artist-dna/tabs/look/PhotoShootSubTab.tsx`
- Create: `src/features/music-lab/components/artist-dna/tabs/look/GallerySubTab.tsx`
- Modify: `src/features/music-lab/components/artist-dna/tabs/LookTab.tsx` — becomes sub-tab router

**Step 1: Create `look/` directory**

```bash
mkdir -p src/features/music-lab/components/artist-dna/tabs/look
```

**Step 2: Create ProfileSubTab.tsx**

Extract the existing look form fields (skin tone, hair, fashion, jewelry, tattoos, visual description, portrait section) from the current `LookTab.tsx` into `ProfileSubTab.tsx`. This is a straight extraction — no new logic.

**Step 3: Create CharacterSheetSubTab.tsx**

- Full-width character sheet image display at the top
- "Visualize Artist" / "Regenerate" button
- Loading state with spinner
- When generated, auto-add to gallery via store action
- Download button on the character sheet

**Step 4: Create PhotoShootSubTab.tsx**

- Category selector: Wardrobe, Locations, Social Media, Performance
- Grid of scene cards per category (from `PHOTO_SHOOT_SCENES`)
- Each card shows: scene label + aspect ratio badge
- Click a card → generates the image using the character sheet as reference
- Requires character sheet to exist first (show message if not)
- Loading state per card while generating
- Generated image replaces the card placeholder
- Auto-saves to gallery

**Step 5: Create GallerySubTab.tsx**

- Grid of all images from `draft.look.gallery`
- Filter tabs: All | Character Sheet | Portrait | Photo Shoot
- Each image: thumbnail, type badge, timestamp
- Click → fullscreen modal (reuse `FullscreenImageModal` from shot-creator)
- Delete button with confirmation
- Download button

**Step 6: Rewrite LookTab.tsx as sub-tab router**

Replace entire file with a Tabs component containing the 4 sub-tabs:

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Palette, User, Camera, Image, Grid3x3 } from 'lucide-react'
import { ProfileSubTab } from './look/ProfileSubTab'
import { CharacterSheetSubTab } from './look/CharacterSheetSubTab'
import { PhotoShootSubTab } from './look/PhotoShootSubTab'
import { GallerySubTab } from './look/GallerySubTab'

export function LookTab() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5" />
          Look
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="text-xs">
              <User className="w-3 h-3 mr-1" />Profile
            </TabsTrigger>
            <TabsTrigger value="character-sheet" className="text-xs">
              <Grid3x3 className="w-3 h-3 mr-1" />Sheet
            </TabsTrigger>
            <TabsTrigger value="photo-shoot" className="text-xs">
              <Camera className="w-3 h-3 mr-1" />Photo Shoot
            </TabsTrigger>
            <TabsTrigger value="gallery" className="text-xs">
              <Image className="w-3 h-3 mr-1" />Gallery
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile"><ProfileSubTab /></TabsContent>
          <TabsContent value="character-sheet"><CharacterSheetSubTab /></TabsContent>
          <TabsContent value="photo-shoot"><PhotoShootSubTab /></TabsContent>
          <TabsContent value="gallery"><GallerySubTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

**Step 7: Build and commit**

```bash
rm -rf .next && npm run build 2>&1 | tail -5
git add -A && git commit -m "feat(music-lab): add Look sub-tabs — Profile, Character Sheet, Photo Shoot, Gallery"
```

---

### Task 5: Add gallery actions to the store

**Files:**
- Modify: `src/features/music-lab/store/artist-dna.store.ts`

**Step 1: Add gallery actions to the store interface and implementation**

Add these actions:
- `addGalleryItem(item: Omit<ArtistGalleryItem, 'id' | 'createdAt'>)` — generates ID, adds to `draft.look.gallery`
- `removeGalleryItem(itemId: string)` — removes from gallery array
- `getGalleryItems(filter?: GalleryItemType)` — returns filtered gallery

These operate on `draft.look.gallery` via `updateDraft('look', { gallery: [...] })`.

**Step 2: Build and commit**

```bash
rm -rf .next && npm run build 2>&1 | tail -5
git add -A && git commit -m "feat(music-lab): add gallery CRUD actions to artist-dna store"
```

---

### Task 6: Wire up auto-save to gallery

**Files:**
- Modify: `src/features/music-lab/components/artist-dna/tabs/look/CharacterSheetSubTab.tsx`
- Modify: `src/features/music-lab/components/artist-dna/tabs/look/PhotoShootSubTab.tsx`

**Step 1: Auto-save character sheet to gallery on generation**

In CharacterSheetSubTab, after successful generation, call `addGalleryItem({ url, type: 'character-sheet', aspectRatio: '16:9' })`.

**Step 2: Auto-save portrait to gallery on generation**

Same pattern for portrait generation.

**Step 3: Auto-save photo shoot images to gallery on generation**

In PhotoShootSubTab, after successful generation, call `addGalleryItem({ url, type: 'photo-shoot', category, aspectRatio })`.

**Step 4: Build and commit**

```bash
rm -rf .next && npm run build 2>&1 | tail -5
git add -A && git commit -m "feat(music-lab): auto-save generated images to artist gallery"
```

---

### Task 7: Final integration test and push

**Step 1: Clean build**

```bash
cd D:/git/directors-palette-v2 && rm -rf .next && npm run build
```

**Step 2: Push to production**

```bash
git push origin main
```
