# Brand Studio — Technical Documentation

## What It Does

Brand Studio is an AI-powered brand identity and content generation platform. Users describe their company, and AI analyzes it to produce a complete brand guide — colors, typography, voice, audience, visual style, and music direction. Once a brand exists, users generate on-brand images, videos, voiceovers, and music with a single toggle called **Brand Boost**.

---

## User Flow

### 1. Create a Brand

1. Click **+ New Brand** in the sidebar
2. Upload a logo (optional) and enter a company description
3. Click **Generate Brand Guide**
4. AI analyzes the description (and logo colors if provided) and fills in:
   - Tagline & industry classification
   - Color palette (5+ colors with roles: primary, secondary, accent, background, text)
   - Typography (heading font, body font, weights, size hierarchy)
   - Brand voice (tone keywords, things to avoid, persona description)
   - Target audience (primary, secondary, psychographics)
   - Visual style (photography tone, subjects, composition guidelines)
   - Music direction (genres, moods, BPM range)
5. AI also generates a visual brand guide sheet image

### 2. Edit Brand Properties

Select the **Brand** tab, then use sub-tabs to edit any section:
- **Visual Identity** — Colors and typography
- **Voice & Messaging** — Tone, persona, audience
- **Audio** — Music genres, moods, BPM
- **Brand Guide** — View/regenerate the visual guide image

All edits save to the database immediately.

### 3. Generate Content

Select the **Create** tab, choose a generator, write a prompt, and hit Generate.

| Generator | What It Makes | Credit Cost | API | Speed |
|-----------|--------------|-------------|-----|-------|
| Image | Brand-styled images | 10 | Replicate (nano-banana-2) | ~10-30s (sync) |
| Video | Brand videos | 25 (lite) / 40 (pro) | Replicate (Seedance) | ~2-5min (async) |
| Voice | Text-to-speech audio | 5 | ElevenLabs | ~5-15s (sync) |
| Music | Background music | 15 | Replicate (minimax/music-01) | ~30-90s (sync) |

**Brand Boost** enriches your prompt with brand context before sending it to the AI. It's on by default when a brand has data.

---

## How Brand Boost Works

When Brand Boost is enabled, the user's prompt is enriched before hitting the generation API.

### Image & Video Enrichment

The user's prompt gets brand context appended:

```
{userPrompt}. Color palette: Brand Primary #1A1A2E, Electric Cyan #00F0FF, Accent Gold #FFD700.
Photography tone: raw, authentic street photography. Visual style: people, urban environments,
creative workspaces. Composition: dynamic angles, shallow depth of field.
```

### Music Enrichment

Genre, mood, and tempo are appended:

```
{userPrompt}. Genre: electronic, hip-hop. Mood: upbeat, energetic, confident. BPM: 90-140.
```

### Voice Enrichment

Brand voice tone keywords map to ElevenLabs voice parameters:

| Brand Tone | ElevenLabs Stability | Effect |
|-----------|---------------------|--------|
| "calm", "professional", "warm", "gentle" | 0.7 | Steady, controlled delivery |
| "energetic", "bold", "dynamic", "exciting" | 0.3 | Expressive, varied delivery |
| Other/mixed | 0.5 | Balanced |

Similarity boost is always 0.75.

**Source:** `src/features/brand-studio/services/brand-boost.service.ts`

---

## AI Prompts Behind the Scenes

### Brand Analysis Prompt

**Model:** OpenRouter → `google/gemini-2.0-flash-001` (temperature 0.3)
**Location:** `src/app/api/brand-studio/generate-brand-guide/route.ts`

```
System: You are a brand identity analyst. Given a company description (and optionally
a logo image), analyze the brand and produce a structured brand configuration.

Return ONLY valid JSON (no markdown fences, no commentary). The JSON must follow
this EXACT schema:

{
  "tagline": "A short brand tagline",
  "industry": "Primary industry",
  "audience": {
    "primary": "Primary target audience description",
    "secondary": "Secondary audience description",
    "psychographics": "Key psychographic traits of the audience as a paragraph"
  },
  "voice": {
    "tone": ["tone1", "tone2", "tone3", "tone4", "tone5"],
    "avoid": ["thing to avoid 1", "thing to avoid 2", "thing to avoid 3"],
    "persona": "A 1-2 sentence description of the brand's speaking personality"
  },
  "visual_identity": {
    "colors": [
      { "name": "Brand Primary", "hex": "#hex1", "role": "primary" },
      { "name": "Brand Secondary", "hex": "#hex2", "role": "secondary" },
      { "name": "Accent", "hex": "#hex3", "role": "accent" },
      { "name": "Background", "hex": "#hex4", "role": "background" },
      { "name": "Text", "hex": "#hex5", "role": "text" }
    ],
    "typography": {
      "heading_font": "Suggested heading font family",
      "body_font": "Suggested body font family",
      "weights": ["Regular", "Medium", "SemiBold", "Bold"],
      "heading_sizes": "h1: 36pt, h2: 24pt, h3: 16pt, body: 14pt"
    }
  },
  "music": {
    "genres": ["genre1", "genre2", "genre3"],
    "moods": ["mood1", "mood2", "mood3"],
    "bpm_range": { "min": 80, "max": 120 }
  },
  "visual_style": {
    "photography_tone": "Description of the photography mood and tone",
    "subjects": ["subject1", "subject2", "subject3"],
    "composition": "Composition and framing guidelines"
  }
}

If a logo image is provided, extract colors from it. Otherwise infer appropriate
colors from the brand description. Be specific and detailed in every field.
Return 5 colors minimum.
```

**User message:** The company description text. If a logo was uploaded, it's included as an image content block so the model can extract colors from it.

---

### Brand Guide Image Prompt

**Model:** Replicate → `fofr/nano-banana-2`
**Location:** `src/app/api/brand-studio/generate-brand-guide/route.ts`
**Cost:** 15 credits

The prompt is dynamically built from the brand analysis results:

```
BRAND VISUAL IDENTITY GUIDE for "{brandName}"

LAYOUT: Professional brand style guide sheet organized in 6 labeled sections
on a clean white/light background.

SECTION 1 - LOGO USAGE:
- Display the brand name "{brandName}" in large, bold typography
- Show logo placement rules: full color, reversed, monochrome variants
- Clear space and minimum size guidelines

SECTION 2 - COLOR PALETTE:
- Large color swatches with hex codes: {each color name + hex listed}
- Primary and secondary color groupings clearly labeled

SECTION 3 - TYPOGRAPHY:
- Heading: {heading_font}, Body: {body_font}
- Show font hierarchy: H1 largest, H2 medium, H3 smaller, Body text
- Weight examples: {weights joined}

SECTION 4 - PHOTOGRAPHY STYLE:
- Mood: {photography_tone}
- Subjects: {subjects joined}

SECTION 5 - ICONOGRAPHY:
- Clean, minimal icon style examples
- Consistent stroke weight and rounded corners

SECTION 6 - GRAPHIC ELEMENTS:
- Patterns and textures using brand colors
- {composition}

STYLE: Professional brand identity document, clean corporate design,
organized grid layout, print-ready quality, crisp typography, high
production value. NOT a website mockup. This is a static visual reference sheet.
```

---

### Image Generation

**Model:** Replicate → `fofr/nano-banana-2`
**Location:** `src/app/api/brand-studio/generate/image/route.ts`
**Cost:** 10 credits

User prompt passed directly (with Brand Boost enrichment if enabled). Supports aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4.

### Video Generation

**Models:** Replicate → `seedance-community/seedance-lite:latest` (25 credits) or `seedance-community/seedance:latest` (40 credits)
**Location:** `src/app/api/brand-studio/generate/video/route.ts`

Supports text-to-video and image-to-video (pass `imageUrl`). Duration: 2-10 seconds. Video generation is **async** — returns a prediction ID immediately and completes via webhook.

### Voice Generation

**Model:** ElevenLabs → `eleven_multilingual_v2`
**Location:** `src/app/api/brand-studio/generate/voice/route.ts`
**Cost:** 5 credits

Available voices:
- **Adam** (`pNInz6obpgDQGcFmaJgB`) — Deep, warm male
- **Rachel** (`21m00Tcm4TlvDq8ikWAM`) — Clear female
- **Antoni** (`ErXwobaYiN019PkySvjV`) — Well-rounded male
- **Bella** (`EXAVITQu4vr4xnSDxMaL`) — Soft female

### Music Generation

**Model:** Replicate → `minimax/music-01`
**Location:** `src/app/api/brand-studio/generate/music/route.ts`
**Cost:** 15 credits

Supports duration (10-120s) and instrumental toggle. With Brand Boost, appends brand genres/moods/BPM range to the prompt.

---

## Architecture

### File Structure

```
src/features/brand-studio/
├── components/
│   ├── BrandStudioLayout.tsx       # Main hub (sidebar + content)
│   ├── NewBrandDialog.tsx          # Create brand modal
│   ├── tabs/
│   │   ├── BrandTab.tsx            # Brand identity editor (4 sub-tabs)
│   │   ├── CreateTab.tsx           # Content generation hub
│   │   ├── LibraryTab.tsx          # Asset browser (phase 4)
│   │   └── CampaignsTab.tsx        # Campaign builder (phase 6)
│   ├── generators/
│   │   ├── ImageGenerator.tsx
│   │   ├── VideoGenerator.tsx
│   │   ├── VoiceGenerator.tsx
│   │   └── MusicGenerator.tsx
│   └── sections/
│       ├── BrandGuideHero.tsx      # Logo, name, tagline display
│       ├── ColorsSection.tsx       # Color palette editor
│       ├── TypographySection.tsx   # Font hierarchy editor
│       ├── VoiceSection.tsx        # Tone & persona editor
│       ├── AudienceSection.tsx     # Target audience editor
│       ├── VisualStyleSection.tsx  # Photography style editor
│       ├── MusicSection.tsx        # Genre/mood/BPM editor
│       ├── BrandScoreRing.tsx      # Completeness indicator
│       └── SectionCard.tsx         # Reusable card wrapper
├── hooks/
│   ├── useBrandStore.ts            # Zustand store (brands, active brand)
│   └── useGenerationStore.ts       # Zustand store (generation state)
├── services/
│   ├── brand-studio-api.ts         # API client functions
│   └── brand-boost.service.ts      # Prompt enrichment logic
└── types/
    └── index.ts                    # Brand interface & sub-types

src/app/api/brand-studio/
├── brands/route.ts                 # GET/POST/PUT brand CRUD
├── generate-brand-guide/route.ts   # LLM analysis + guide image
└── generate/
    ├── image/route.ts
    ├── video/route.ts
    ├── voice/route.ts
    └── music/route.ts
```

### Database

Brands are stored in the `brands` Supabase table. Key columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (from auth) |
| `name` | text | Brand name |
| `slug` | text | URL-safe identifier |
| `logo_url` | text | Logo image URL |
| `tagline` | text | AI-generated tagline |
| `industry` | text | Industry classification |
| `audience_json` | jsonb | Primary/secondary audience + psychographics |
| `voice_json` | jsonb | Tone keywords, avoid list, persona |
| `visual_identity_json` | jsonb | Colors array + typography object |
| `music_json` | jsonb | Genres, moods, BPM range |
| `visual_style_json` | jsonb | Photography tone, subjects, composition |
| `brand_guide_image_url` | text | Generated visual guide sheet |
| `raw_company_info` | text | Original description input |

### State Management

**`useBrandStore`** (persisted to localStorage):
- `brands[]` — All user brands (reloaded from DB on mount)
- `activeBrandId` — Currently selected brand
- `activeTab` — Current tab (brand / create / library / campaigns)
- Actions: `loadBrands()`, `createBrand()`, `updateBrand()`, `generateBrandGuide()`

**`useGenerationStore`** (not persisted):
- `activeGenerator` — Which generator is open
- `isGenerating` — Loading state
- `lastResult` / `recentResults[]` — Generation history (last 12)
- Actions: `generateImage()`, `generateVideo()`, `generateVoice()`, `generateMusic()`

### Brand Score

The completeness ring (`BrandScoreRing.tsx`) tracks 7 items:
1. Logo uploaded
2. Colors defined
3. Typography set (heading + body font)
4. Voice defined (tone + persona)
5. Audience defined (primary)
6. Visual style defined (photography tone)
7. Music defined (genres)

Quality grades: A+ (90%+), A (80%+), B+ (70%+), B (60%+), C+ (50%+), C (40%+), D (<40%).

---

## External APIs

| Service | Used For | Auth Env Var |
|---------|----------|-------------|
| OpenRouter (Gemini 2.0 Flash) | Brand analysis from description | `OPENROUTER_API_KEY` |
| Replicate (nano-banana-2) | Image generation | `REPLICATE_API_TOKEN` |
| Replicate (Seedance) | Video generation | `REPLICATE_API_TOKEN` |
| Replicate (minimax/music-01) | Music generation | `REPLICATE_API_TOKEN` |
| ElevenLabs | Voice/TTS generation | `ELEVENLABS_API_KEY` |
| Supabase Storage | Asset storage | `SUPABASE_SERVICE_ROLE_KEY` |

---

## Upcoming Phases

- **Library Tab (Phase 4)** — Browse, search, and manage all generated brand assets
- **Campaigns Tab (Phase 6)** — Multi-platform campaign builder with ad copy, scheduling, and export
