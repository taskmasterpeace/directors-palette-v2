# Brand Studio Phase 2: Content Generation — Design

## Goal

Replace the placeholder "Create" tab with a fully functional content generation system that wraps existing Replicate, ElevenLabs, and LLM APIs with brand-aware prompt enrichment. Every generation can be automatically infused with the active brand's colors, voice, visual style, and music preferences.

## Architecture

Direct API calls from Next.js API routes (same pattern as existing generation routes). No Ad Lab script spawning. The Create tab becomes the 2nd unlocked tab in Brand Studio's sidebar, housing 4 generators: Image, Video, Voice, Music. Script and Assemble are deferred to Phase 3.

## Key Decision: Brand Boost

The differentiator is "Brand Boost" — a toggle that auto-enriches prompts with brand context before sending to the generation API. When on:
- **Image**: Prepends brand color palette, visual style keywords, photography tone
- **Video**: Same as image + sets aspect ratio from platform preset
- **Voice**: Maps brand voice tone to ElevenLabs voice settings (stability, similarity_boost)
- **Music**: Injects brand music genres, moods, BPM range into prompt

## UI Layout

### Create Tab Structure
1. **Generator Picker** — 2x2 grid of generator cards (Image, Video, Voice, Music) + 2 locked cards (Script, Assemble) showing credit cost per type
2. **Generator Panel** — Appears when a generator is selected:
   - Back button to return to picker
   - Prompt/text textarea
   - Brand Boost toggle (on by default if brand has data)
   - Platform presets dropdown (optional): Instagram, YouTube Shorts, TikTok, Landscape
   - Generate button with credit cost
   - Result display area (image preview, video player, audio player)
3. **Recent Generations** — Bottom strip showing last 6 brand-related generations

### Generator-Specific UI
- **Image**: Prompt textarea, aspect ratio selector (1:1, 9:16, 16:9), model selector (nano-banana-2)
- **Video**: Prompt textarea, image input (optional, for img2vid), duration selector (5s/10s), model selector (seedance-lite/pro)
- **Voice**: Text textarea, voice selector dropdown (ElevenLabs voices), speed/stability sliders
- **Music**: Prompt textarea, duration selector (15s/30s/60s), instrumental toggle

## API Routes

All under `/api/brand-studio/generate/`:
- `POST /api/brand-studio/generate/image` — 10 credits
- `POST /api/brand-studio/generate/video` — 25 credits
- `POST /api/brand-studio/generate/voice` — 5 credits
- `POST /api/brand-studio/generate/music` — 15 credits

Each follows: auth → validate → enrich prompt (if brand boost) → call generation API → store result → deduct credits → return result.

## Brand Boost Enrichment

```typescript
function enrichImagePrompt(prompt: string, brand: Brand): string {
  const parts = [prompt]
  const colors = brand.visual_identity_json?.colors
  if (colors?.length) {
    parts.push(`Color palette: ${colors.map(c => `${c.name} (${c.hex})`).join(', ')}`)
  }
  const style = brand.visual_style_json
  if (style) {
    parts.push(`Photography tone: ${style.photography_tone}`)
    if (style.subjects?.length) parts.push(`Style: ${style.subjects.join(', ')}`)
  }
  return parts.join('. ')
}
```

## Credit Costs
| Generator | Credits | Rationale |
|-----------|---------|-----------|
| Image | 10 | Standard nano-banana-2 cost |
| Video (lite) | 25 | Seedance lite |
| Video (pro) | 40 | Seedance pro, longer/higher res |
| Voice | 5 | ElevenLabs TTS is cheap |
| Music | 15 | MiniMax Music 1.5 |

## What's NOT in Phase 2
- Script generation (Phase 3)
- Assemble/merge (Phase 3)
- Asset library browsing (Phase 4)
- Campaign builder (Phase 6)
- Gallery/history view within Brand Studio (Phase 4)
