# Photo Shoot Recipe System — Design

## Overview

Transform the Music Lab photo shoot feature from single-click/single-image scene cards into expandable accordion scenes with sub-scenes and recipe-style fields. Each of the 22 scenes becomes a scene group containing 3-6 sub-scenes, each with selectable/editable fields and its own generate button showing point cost.

## Goals

1. Each scene expands accordion-style to reveal sub-scenes (e.g. "Press Cover" → Waiting Room, Signing Fans, Wardrobe Room, Selfies)
2. Sub-scenes have recipe fields: multiple-choice (lighting, POV, setting), free-text (custom details), pre-filled (from DNA)
3. Points displayed on every generate button (6 pts for nano-banana-2)
4. Recent shots grid uses smaller thumbnails (4-col)
5. Prompts enhanced with authentic details (iPhone camera, detailed posters, fan perspective angles)
6. DNA fields (skin, tattoos, fashion, genre aesthetic) injected automatically — never user-editable

## Data Model

```typescript
interface PhotoShootField {
  id: string
  label: string
  type: 'select' | 'text' | 'prefilled'
  options?: string[]
  defaultValue?: string
  placeholder?: string
  dnaPath?: string
}

interface PhotoShootSubScene {
  id: string
  label: string
  description: string
  aspectRatio: '16:9' | '9:16' | '1:1'
  fields: PhotoShootField[]
  buildPrompt: (dna: ArtistDNA, fieldValues: Record<string, string>) => string
}

interface PhotoShootScene {
  id: string
  label: string
  description: string
  category: PhotoShootCategory
  subScenes: PhotoShootSubScene[]
}
```

## UI — Accordion Photo Shoots

- Scene cards become accordion headers (click to expand/collapse)
- Expanded scene shows sub-scene cards in a vertical list
- Each sub-scene card has:
  - Title + description + aspect ratio badge
  - Recipe fields (selects as dropdowns, text as inputs)
  - Generate button with point cost: "Generate · 6 pts"
  - Loading state when generating
- Only one scene expanded at a time
- Recent shots grid: 4 columns, smaller thumbnails

## Sub-Scenes Per Scene (All 22)

### WARDROBE
**Streetwear Look** → Street Editorial, Sneaker Close-up, Full Outfit Turnaround, Against the Wall
**Stage Outfit** → Under the Lights, Backstage Mirror, Outfit Detail Shot, Walking to Stage
**Studio Casual** → At the Console, Headphones On, Coffee Break, Writing Session
**Press / Cover Shot** → Magazine Cover, Waiting Room, Signing for Fans, Wardrobe Room, Selfie with Posters

### LOCATIONS
**The Block** → Walking the Street, Corner Store Front, Stoop Sitting, Car Leaning
**Rooftop at Sunset** → Skyline Portrait, Edge Shot, Looking Down, Golden Silhouette
**Recording Studio** → At the Board, Through the Glass, Monitor Glow, Session Break
**City at Night** → Neon Walk, Wet Street Reflection, Under the Sign, Taxi Shot

### SOCIAL MEDIA
**Mirror Selfie** → Bedroom Mirror, Bathroom Mirror, Dressing Room, Gym Mirror
**Car Selfie** → Driver Seat, Passenger Lean, Parked Up, Through Windshield
**Celebrating with Friends** → VIP Section, Toast Shot, Dance Floor, Group Outside
**At the Food Spot** → Table Shot, Counter Seat, Takeout Walk, Kitchen Peek

### EVERYDAY LIFE
**At the Barbershop** → In the Chair, Fresh Cut Reveal, Waiting Area, Mirror Check
**Corner Store Run** → Walking Out, Inside Browsing, At the Counter, Outside Leaning
**Morning Coffee** → Window Seat, Kitchen Counter, Balcony Morning, Still Waking Up
**Working Out** → Mid-Set, Post-Workout, Locker Room, Jump Rope
**Writing Lyrics** → Notebook Close-up, Couch Session, Studio Floor, Late Night Desk
**Just Hanging Out** → Activity from Likes, Porch/Stoop, Park Bench, Phone Scroll

### PERFORMANCE
**Live on Stage** → Crowd Shot, Close-up Mic, Side Stage, Hands Raised
**In the Booth** → Through Glass, Eyes Closed, Headphones Adjust, Lyrics Sheet
**Festival Shot** → Main Stage Wide, Crowd Surf, Backstage Tent, Artist Tent
**Music Video Moment** → Hero Shot, Walking Scene, Car Scene, Dramatic Close-up

## Common Recipe Fields

### POV / Camera Perspective (select)
- Professional editorial
- Fan photo from across the room
- Paparazzi long lens
- Candid friend's phone
- iPhone selfie (front camera, 12MP)
- Security camera angle

### Lighting (select)
- Natural daylight
- Golden hour
- Studio flash
- Dramatic single source
- Neon/LED accent
- Overhead fluorescent
- Candlelight/warm ambient

### Mood (select)
- Confident and powerful
- Relaxed and candid
- Intense and focused
- Playful and energetic
- Moody and contemplative

## Points System

- Uses existing `generation-cost.service.ts` infrastructure
- nano-banana-2 = 6 pts per image ($0.06)
- Points shown on generate button: "Generate · 6 pts"
- Cost tracked in gallery item metadata

## Recent Shots

- 4-column grid (down from 3)
- Smaller aspect-square thumbnails
- Click still opens fullscreen modal

## Files Modified

1. `src/features/music-lab/services/photo-shoot.service.ts` — Complete rewrite with sub-scenes + fields
2. `src/features/music-lab/components/artist-dna/tabs/look/PhotoShootSubTab.tsx` — Accordion UI + recipe fields
3. No API changes needed — prompt is still built client-side and sent to same endpoint
