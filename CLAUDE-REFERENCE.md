# CLAUDE-REFERENCE.md

Detailed reference material for Directors Palette. Only read this file when working on the relevant feature.

---

# DATABASE ACCESS (Supabase)

Credentials in `.env.local`: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

**Project ID**: `tarohelkwuurakbxjyxm` | **URL**: `https://tarohelkwuurakbxjyxm.supabase.co`

Run SQL via Management API:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/tarohelkwuurakbxjyxm/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL HERE"}'
```

Key tables: `auth.users`, `user_credits`, `generation_events`, `admin_users`, `api_keys`, `coupons`, `community_items`

---

# IMAGE/VIDEO GENERATION (Replicate API)

Token in `.env.local` as `REPLICATE_API_TOKEN`.

Image models: `google/nano-banana` (fast, 8pts), `google/nano-banana-pro` (quality, 20pts), `prunaai/z-image-turbo` (5pts), `bytedance/seedream-5-lite` (cheapest, 4pts), `bytedance/riverflow-2-pro` (design, 27pts)

Video models: `bytedance/seedance-1-lite`, `bytedance/seedance-1-pro-fast`, `wan-video/wan-2.2-i2v-fast`, `kwaivgi/kling-v2.5-turbo-pro`

---

# RECIPE SYSTEM

Field syntax: `<<FIELD_NAME:type>>` (optional), `<<FIELD_NAME:type!>>` (required). Types: `name`, `text`, `select(A,B,C)`

API: `POST /api/recipes/{recipeName}/execute` with `fieldValues`, `referenceImages`, `modelSettings`

Key files: `src/features/shot-creator/types/recipe.types.ts`, `src/features/shot-creator/services/recipe.service.ts`, `src/features/shared/services/recipe-execution.service.ts`

---

# DIRECTOR SYSTEM

5 AI Directors (Music Lab / Storyboard):
- **Ryan Cooler**: Emotion-forward, intimate framing, warm lighting
- **Clint Westwood**: Economical, restrained, cool tones
- **David Pincher**: Precision, symmetric, psychological
- **Wes Sanderson**: Whimsy, center-framed, curated
- **Hype Millions**: Glossy, heroic angles, spectacle

Directors add visual modifiers across 10 categories (framing, distance, tone, lighting, movement, POV, VFX, actor direction, complexity, pacing).

Key service: `src/features/storyboard/services/story-director.service.ts`

---

# CHARACTER TAGGING & NANO-BANANA

Use `@underscore_names` (e.g., `@marcus_jones`). Use comma-separated visual attributes, not narrative descriptions.

Nano-banana rules:
- DO: @name tags, style guide appended, shot type included, 2-3 sentence prompts, reference images
- DON'T: video terms (dolly/pan/tilt), narrative descriptions, overly long prompts

---

# ELEVENLABS TTS

Endpoint: `POST /api/storybook/synthesize` | Model: `eleven_turbo_v2_5`
Voices: `rachel` (warm, default), `adam` (friendly), `charlotte` (expressive), `dorothy` (pleasant)

---

# AUDIO PLAYBACK

`audio.play()` returns a Promise - always wrap in try/catch with await. Use `crossOrigin="anonymous"` and `preload="auto"` on audio elements.

---

# COMMON FIX PATTERNS

- **Supabase 0-row error**: Use `.maybeSingle()` instead of `.single()`
- **Supabase Json type casting**: Cast through `unknown` first: `(data as unknown) as YourType`
- **React exhaustive deps loops**: Use `useRef` for stable callback references
- **API HTML error response**: Check `content-type` header before calling `.json()`
- **Model settings missing**: Ensure ALL models have cases in `buildModelSettings()` switch
- **Service layer duplication**: Check if service already handles conversion before adding it in component

---

# STORYBOOK VS STORYBOARD

| | Storybook | Storyboard |
|--|-----------|------------|
| Purpose | Children's books | Cinematic shots |
| Recipes | Yes (5 system) | No (LLM direct) |
| Directors | No | Yes (5 AI) |
| Audio | ElevenLabs TTS | No |
| Location | `src/features/storybook/` | `src/features/storyboard/` |

---

# THIRD-PARTY NOTES

- `react-pageflip`: Page components must use `forwardRef`. Cover pages offset index by +1.
