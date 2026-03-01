# Brand Studio - Design Document

**Date:** 2026-03-01
**Status:** Approved

## Overview

Merge Asset Hub and Ad Lab into a unified **Brand Studio** feature inside Directors Palette. One place to manage brands, browse assets, generate content (images, video, voice, music), and build campaigns.

**What gets retired:** Asset Hub (D:/git/asset-hub) as a separate Express server.
**What stays:** Ad Lab scripts (D:/git/mkm/ad-lab/scripts/) as the generation engine, called via API routes.

## Architecture

### Feature Module

```
src/features/brand-studio/
├── components/
│   ├── BrandStudioLayout.tsx       # Hub layout: sidebar + main area
│   ├── BrandSelector.tsx           # Brand picker dropdown
│   ├── tabs/
│   │   ├── BrandTab.tsx            # Brand identity & style guide
│   │   ├── LibraryTab.tsx          # Asset library (browse, tag, search)
│   │   ├── CreateTab.tsx           # Content generation hub
│   │   └── CampaignsTab.tsx        # Campaign builder
│   └── generators/
│       ├── ImageGenerator.tsx      # Image gen UI (Nano Banana Pro/Qwen)
│       ├── VideoGenerator.tsx      # Video gen UI (WAN/Kling/Veo)
│       ├── VoiceGenerator.tsx      # Voice/TTS UI (ElevenLabs)
│       └── MusicGenerator.tsx      # Music gen UI (MiniMax)
├── hooks/
│   └── useBrandStore.ts            # Zustand store: active brand, generation state
├── services/
│   └── brand-studio-api.ts         # API client for all endpoints
└── types/
    └── index.ts                    # Brand, Asset, Generation, Campaign types
```

### API Routes

```
src/app/api/brand-studio/
├── brands/route.ts                 # CRUD brands + brand profiles
├── generate-brand-guide/route.ts   # Logo analysis + guide image
├── generate-image/route.ts         # Image generation
├── generate-video/route.ts         # Video generation
├── generate-voice/route.ts         # Voice/TTS generation
├── generate-music/route.ts         # Music generation
├── assets/route.ts                 # Asset management (CRUD, search, tag)
└── campaigns/route.ts              # Campaign orchestration
```

### Data Flow

```
React UI → Next.js API Routes → Ad Lab Scripts (child_process.spawn)
                               → Replicate / ElevenLabs / OpenRouter
                               → Supabase (store brands, assets, generations)
```

API routes are thin wrappers that:
1. Accept request from React UI
2. Spawn the appropriate Ad Lab script with arguments
3. Stream progress back to the UI
4. Store results in Supabase
5. Return the generated asset URL/data

### Page Route

```
src/app/brand-studio/page.tsx       # /brand-studio
```

## UI Design

### Layout

Sidebar (left) + Main Content (right).

**Sidebar:**
- Brand selector dropdown at top (switch between brands)
- "+ New Brand" button (triggers logo upload → brand guide generation)
- Tab navigation: Brand, Library, Create, Campaigns
- Active brand logo displayed

### Tab: Brand

The brand's identity home. Shows:
- Generated brand guide image (full visual identity sheet)
- Editable sections below:
  - **Colors:** Primary + secondary with color pickers and hex inputs
  - **Typography:** Font family, weights, heading sizes
  - **Voice & Tone:** Tone adjectives, what to avoid, persona description
  - **Audience:** Primary, secondary, psychographics
  - **Visual Style:** Photography tone, subjects, composition
  - **Music Preferences:** Genres, moods, BPM range
- "Regenerate Guide" button to re-run brand guide generation
- Collapsible raw JSON view for power users

**New Brand Flow:**
1. Click "+ New Brand"
2. Upload logo
3. Enter company name + description (free-form text area)
4. Click "Generate"
5. LLM analyzes logo → generates brand JSON
6. Nano Banana Pro generates visual guide image
7. Brand tab populates with all extracted data
8. User can edit any field and save

### Tab: Library

Asset library. Browse, search, tag all generated and imported assets.
- Grid view with thumbnails (default)
- Filter bar: type (image/video/audio/all), tags, date range
- Search box (full-text across filename, description, tags)
- Click to preview (images fullscreen, video/audio player inline)
- Multi-select for batch operations (tag, delete, download)
- Drag-and-drop upload area
- Each asset card shows: thumbnail, type badge, name, date, tags

### Tab: Create

Content generation hub with sub-tabs:

**Image sub-tab:**
- Prompt text area
- Model picker: Nano Banana Pro (default), Nano Banana, Qwen
- Aspect ratio: 16:9, 9:16, 1:1, 4:3
- Resolution: 1K, 2K, 4K
- Reference image upload (optional, pick from Library or upload)
- "Generate" button
- Result preview with "Save to Library" button
- Generation cost estimate shown

**Video sub-tab:**
- Prompt text area
- Start image: pick from Library or upload (optional for T2V models)
- Model picker: WAN I2V Fast (default), WAN T2V, Kling, Veo, Sora
- Duration: 5s, 10s, 15s (model-dependent)
- Aspect ratio
- "Generate" button
- Video player for result

**Voice sub-tab:**
- Script text area (or paste)
- Voice picker dropdown
- Emotion preset: professional, energetic, calm, authoritative
- Pronunciation overrides (add custom word → phoneme mappings)
- "Generate" button
- Audio player with waveform
- Download button

**Music sub-tab:**
- Genre picker (from templates: hip-hop, corporate, funk, rnb, etc.)
- Mood selector
- Instrumental toggle
- Lyrics text area (for songs/jingles)
- Duration slider
- "Generate" button
- Audio player with waveform

All generators show:
- Progress/status while generating
- Cost estimate before generation
- Generated result with preview
- "Save to Library" to store the asset
- History of recent generations

### Tab: Campaigns

Campaign builder for multi-asset production:
- Campaign brief form:
  - Name
  - Product/brand (auto-filled from active brand)
  - Target audience (auto-filled from brand)
  - Tone (auto-filled from brand)
  - Platforms: Instagram, TikTok, YouTube, Facebook, LinkedIn (multi-select)
  - Asset types: video ad (15s/30s/60s), social images, jingle, voiceover (multi-select)
- "Preview Plan" shows what will be generated with cost estimate
- "Generate Campaign" runs the full pipeline
- Progress view: real-time status of each asset being generated
- Campaign gallery: all generated assets organized by type
- Download all as ZIP

## Data Model (Supabase)

### brands table
```sql
id, name, slug, logo_url, tagline, industry,
audience_json, voice_json, visual_identity_json, music_json, visual_style_json,
brand_guide_image_url, raw_company_info,
created_at, updated_at
```

### assets table
```sql
id, brand_id, filename, file_url, file_type (image/video/audio),
file_size, width, height, duration, aspect_ratio,
title, description, tags (text[]),
source (generated/uploaded/imported), generation_type (image/video/voice/music),
generation_prompt, generation_model, generation_cost,
created_at
```

### campaigns table
```sql
id, brand_id, name, brief_json, status (draft/generating/complete/failed),
platforms (text[]), asset_types (text[]),
created_at, completed_at
```

### campaign_assets table
```sql
id, campaign_id, asset_id, asset_type, platform, format
```

## Migration from Asset Hub

1. Asset Hub brand profiles → Supabase brands table
2. Asset Hub assets → Supabase assets table (file references stay local or move to Supabase Storage)
3. Asset Hub tags → stored as text[] on assets
4. Ad copy generator → becomes part of Create tab (or a sub-feature of Campaigns)
5. Region annotation → not ported initially (low priority)

## What Stays from Ad Lab

All scripts in D:/git/mkm/ad-lab/scripts/ stay as-is:
- generate-image.js
- generate-voice.js
- generate-video.js
- generate-music.js
- generate-brand-guide.js
- merge-audio-video.js
- create-campaign.js
- music-library.js

They are the battle-tested generation engines. API routes spawn them via child_process.

## Implementation Phases

### Phase 1: Foundation
- Brand Studio page + layout + routing
- Brand tab: display brand data, edit brand profile
- New Brand flow: logo upload → brand guide generation
- Supabase schema + migrations

### Phase 2: Content Generation
- Create tab with Image, Video, Voice, Music sub-tabs
- API routes that spawn Ad Lab scripts
- Generation progress streaming
- Save to Library flow

### Phase 3: Asset Library
- Library tab with grid view, search, filter, tags
- Asset upload (drag and drop)
- Asset preview (image, video player, audio player)
- Batch operations

### Phase 4: Campaigns
- Campaign builder form
- Campaign orchestration (calls create-campaign.js)
- Progress tracking
- Campaign gallery + download

## Design Notes

- Use frontend-design skill for all UI implementation
- Follow existing Directors Palette design system (OKLCH colors, Inter font, 0.625rem radius)
- Dark theme consistent with rest of app
- Use Zustand for state management (active brand, generation status, etc.)
- Use react-hook-form for all forms
