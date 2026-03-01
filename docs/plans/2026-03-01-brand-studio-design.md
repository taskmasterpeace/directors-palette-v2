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
│   ├── generators/
│   │   ├── ImageGenerator.tsx      # Image gen UI (Nano Banana Pro/Qwen)
│   │   ├── VideoGenerator.tsx      # Video gen UI (WAN/Kling/Veo)
│   │   ├── VoiceGenerator.tsx      # Voice/TTS UI (ElevenLabs)
│   │   ├── MusicGenerator.tsx      # Music gen UI (MiniMax)
│   │   ├── ScriptGenerator.tsx     # Ad copy / script generator (LLM)
│   │   └── AssemblePanel.tsx       # Mix video + voice + music
│   ├── wizards/
│   │   └── VideoAdWizard.tsx       # Guided video ad creation (multi-step)
│   └── shared/
│       ├── PromptEnricher.tsx      # Brand-aware prompt preview/editor
│       └── PlatformPresets.tsx     # Platform format selector
├── hooks/
│   ├── useBrandStore.ts            # Zustand store: active brand, generation state
│   └── usePromptEnrichment.ts      # Hook: auto-inject brand context into prompts
├── services/
│   ├── brand-studio-api.ts         # API client for all endpoints
│   └── prompt-enrichment.ts        # Brand context → prompt injection logic
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
├── generate-script/route.ts        # Ad copy / script generation (LLM)
├── assemble/route.ts               # Merge video + voice + music (merge-audio-video.js)
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

### Brand-Aware Prompt Enrichment

Every generator in the Create tab automatically enriches user prompts with brand context. This is the key differentiator - you write short prompts, the system makes them on-brand.

**How it works:**
1. User types: "Battle rap event poster, two emcees facing off"
2. System reads active brand's visual_identity, voice, audience data
3. System builds enriched prompt: "Battle rap event poster, two emcees facing off. Color palette: cream #E8E1C6, dark #282828, crimson #A73030. Style: gritty, urban, documentary-style. Composition: dynamic angles, close-ups. Font style: bold, striking Bebas Neue. Photography tone: raw, authentic."
4. User sees **both** their original prompt and the enriched version in a preview panel
5. User can edit the enriched prompt before generating, or just hit Generate
6. The enriched prompt is what gets sent to the AI model

**The PromptEnricher component** shows:
- User's raw prompt (editable)
- "Brand boost" toggle (on by default)
- Enriched prompt preview (editable, collapsed by default)
- Which brand fields were injected (color-coded tags)

### Platform Presets

When generating content, users can optionally select a target platform. This auto-applies the right specs:

| Platform | Format | Aspect | Duration | Notes |
|----------|--------|--------|----------|-------|
| Instagram Feed | Square | 1:1 | 60s max | |
| Instagram Story | Vertical | 9:16 | 15s max | Hook in first 2s |
| Instagram Reel | Vertical | 9:16 | 90s max | |
| TikTok | Vertical | 9:16 | 60s max | |
| YouTube | Landscape | 16:9 | 10min max | |
| YouTube Short | Vertical | 9:16 | 60s max | |
| Facebook Feed | Landscape | 16:9 | 240s max | |
| LinkedIn | Landscape | 16:9 | 600s max | |

Selecting a platform auto-sets aspect ratio and max duration in the generator UI. The PlatformPresets component is a dropdown that appears above the aspect ratio picker.

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

**Script sub-tab:**
- Script type picker: ad copy (15s/30s/60s), social caption, tagline, jingle lyrics
- Brief text area (what's the product, what's the message)
- Tone override (defaults to brand voice tone)
- Platform target (optional — adjusts length/style)
- "Generate" button
- Result: editable text with copy-to-clipboard
- "Send to Voice" button → pre-fills Voice sub-tab with generated script
- "Send to Music" button → pre-fills Music sub-tab lyrics field (for jingles)
- History of recent scripts

**Assemble sub-tab:**
- Pick from Library: video clip, voiceover audio, background music
- Or drag from recent generations (each generator has a "Use in Assembly" action)
- Timeline preview: shows video with voice + music layered
- Mix controls:
  - Voice volume (0-100%)
  - Music volume (0-100%)
  - Duck music under voice toggle (on by default, uses sidechain compression)
  - Fade in/out on music (on by default)
- "Assemble" button → calls merge-audio-video.js
- Video player for final result
- "Save to Library" button

### Video Ad Wizard

Guided multi-step workflow for creating a complete video ad from scratch. This is the "easy mode" that walks users through the entire pipeline.

**Step 1 — Brief:**
- What's the product/service?
- What's the key message? (one sentence)
- Target platform (auto-sets aspect ratio, duration via Platform Presets)
- Duration: 15s, 30s, or 60s

**Step 2 — Script:**
- Auto-generates ad script using LLM (brand-aware)
- User reviews and edits the script
- Shows estimated timing per line

**Step 3 — Visuals:**
- For each scene/line in the script, generate or select an image
- "Auto-generate all" button creates images for every scene
- User can swap any image from Library or regenerate individually
- Preview: storyboard grid showing all scenes

**Step 4 — Video:**
- Each scene image → video clip (using WAN I2V or selected model)
- "Generate all clips" button
- Preview each clip inline
- Reorder or regenerate as needed

**Step 5 — Audio:**
- Generate voiceover from script (Voice sub-tab engine)
- Pick or generate background music (Music sub-tab engine)
- Preview voice + music together

**Step 6 — Assemble & Export:**
- Auto-merges all video clips + voice + music
- Preview final video
- Adjust mix levels if needed
- "Save to Library" + "Download"
- Option to generate variants for other platforms (e.g., made a YouTube ad → also make Instagram Reel version)

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

### Phase 1: Foundation ✅
- [x] Brand Studio page + layout + routing
- [x] Brand tab: display brand data, edit brand profile
- [x] New Brand flow: logo upload → brand guide generation
- [x] Supabase schema + migrations
- [x] Brand selector + sidebar navigation

### Phase 2: Content Generation
- Create tab with Image, Video, Voice, Music sub-tabs
- API routes that spawn Ad Lab scripts
- Generation progress streaming
- Save to Library flow
- Brand-aware prompt enrichment (PromptEnricher component + usePromptEnrichment hook)
- Platform presets (PlatformPresets component)

### Phase 3: Script + Assemble
- Script sub-tab: LLM-powered ad copy / script generation
- generate-script API route
- "Send to Voice" / "Send to Music" cross-tab flows
- Assemble sub-tab: merge video + voice + music
- assemble API route (calls merge-audio-video.js)
- Mix controls (volume, ducking, fade)

### Phase 4: Asset Library
- Library tab with grid view, search, filter, tags
- Asset upload (drag and drop)
- Asset preview (image, video player, audio player)
- Batch operations

### Phase 5: Video Ad Wizard
- VideoAdWizard component (6-step guided flow)
- Step-by-step pipeline: Brief → Script → Visuals → Video → Audio → Assemble
- Multi-platform variant generation

### Phase 6: Campaigns
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
