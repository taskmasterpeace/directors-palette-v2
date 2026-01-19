# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# 🚨 CRITICAL: MANDATORY GIT COMMIT PROTOCOL 🚨

**INCIDENT DATE: December 16, 2024** - 194 files (27,881 lines) were nearly lost because they were never committed. See LESSONS_LEARNED.md for details.

## AT SESSION START (MANDATORY)
```bash
git status
```
1. **ALWAYS run `git status` as your FIRST action**
2. If uncommitted changes exist, **REPORT THEM IMMEDIATELY** to the user
3. **DO NOT START NEW WORK** until existing changes are committed
4. Say: "I found uncommitted changes. Let me commit these first."

## DURING DEVELOPMENT (MANDATORY)
1. **Commit after EVERY feature completion** - no exceptions
2. **Never let more than 30 minutes of work go uncommitted**
3. **Push after every commit** - local commits are not safe
4. Use descriptive commit messages

## AT SESSION END (MANDATORY)
1. **ALWAYS run `git status`**
2. If ANY uncommitted changes exist:
   - **STOP EVERYTHING**
   - **COMMIT IMMEDIATELY**
   - **PUSH TO REMOTE**
3. Say: "Before we end, let me commit and push all changes."

## NEVER DO THESE
- ❌ Leave uncommitted changes at session end
- ❌ Start new features with pending uncommitted work
- ❌ End a session with uncommitted code
- ❌ Assume changes will persist without commits
- ❌ Let context loss cause work to be forgotten

## COMMIT COMMAND PATTERN
```bash
git add -A && git commit -m "type: description" && git push origin main
```

---

# 🚨 CRITICAL: DEV SERVER STARTUP 🚨

**INCIDENT DATE: January 18, 2026** - Dev server must be started automatically by Claude, NEVER ask user to start it manually.

## ALWAYS START DEV SERVER AUTOMATICALLY

When testing is required or user requests to see the app:

```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```

**NEVER:**
- ❌ Ask user to start the dev server
- ❌ Tell user "please start the server"
- ❌ Use `npm run dev` (doesn't work in background)
- ❌ Use port 3000 (use 3002 instead)

**ALWAYS:**
- ✅ Start server automatically when needed
- ✅ Use port 3002
- ✅ Run directly with node (not npm)
- ✅ Verify server is running with `curl http://localhost:3002`

## Server URL
- Local: `http://localhost:3002`
- NEVER use `/storybook` route - click "Storybook" in sidebar

---

# 🚨 CRITICAL: BUILD VERIFICATION BEFORE COMMIT 🚨

**INCIDENT DATE: January 6, 2026** - Unused import caused Vercel build failure. `tsc --noEmit` does NOT catch ESLint errors!

## BEFORE EVERY COMMIT (MANDATORY)
```bash
npm run build
```

**NEVER use `tsc --noEmit` alone** - it only checks TypeScript types, NOT ESLint rules.

### Why This Matters
- Vercel runs `npm run build` which includes ESLint
- ESLint treats **unused imports as ERRORS** (not warnings)
- `tsc --noEmit` does NOT run ESLint
- If you only run `tsc --noEmit`, you WILL break the Vercel build

### Common ESLint Errors That Break Builds
- ❌ Unused imports: `'getModelConfig' is defined but never used`
- ❌ Missing alt text: `Image elements must have an alt prop`
- ❌ Unused variables: `'foo' is assigned but never used`

### The Fix
Always run `npm run build` and check for **both** TypeScript errors AND ESLint errors before committing.

---

## Project Overview

**directors-palette-v2** is a Next.js 15 application using React 19, TypeScript, and Tailwind CSS v4. The project uses Turbopack for faster builds and development.

## Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production with Turbopack
npm start            # Start production server
npm run lint         # Run ESLint
```

The dev server runs on `http://localhost:3000`.

### Claude Code Automation Commands

**New workflow automation commands (requires Claude Code restart to activate):**

```bash
/build-check   # Run TypeScript build and report errors
/test          # Smart test runner (detects changed files)
/test-ui       # Launch Playwright UI mode for visual debugging
/deploy        # Full deployment: build → push → Vercel monitor
```

**Existing commands:**
```bash
/git-status    # Check git status and warn about uncommitted changes
/commit-all    # Quick commit and push workflow
/session-end   # End session safety check (commit + push)
```

**Quick Reference:** See `.claude/COMMANDS_QUICK_REFERENCE.md` for detailed usage examples.

**Full Documentation:** See `C:\Users\taskm\.claude\plans\AUTOMATION_GUIDE.md` for complete automation stack.

### Claude Code Automation Hooks (Phase 2)

**Active productivity and safety hooks:**

#### Sound Feedback:
- **Stop Hook**: Plays Windows notification sound when Claude completes a response
- **Notification Hook**: Double beep alert when Claude needs attention

#### File Protection (PreToolUse):
- Blocks edits to sensitive files: `.env*`, `credentials.json`, `*.pem`, `*.key`, `vercel.json`, CI/CD workflows
- Shows clear override instructions if you need to edit protected files manually

#### Git Auto-Backup (PreToolUse):
- Automatically creates checkpoint commits when 10+ files are modified
- Prevents data loss before major refactors
- Easy rollback: `git reset --soft HEAD~1`

**Hook Configuration**: See `.claude/settings.json`
**Hook Scripts**: `.claude/hooks/protect-files.sh`, `.claude/hooks/git-backup.sh`
**Disable Hooks**: Set `"hooks": {}` in `.claude/settings.json` or edit individual hook scripts

**Note**: Hooks require Claude Code restart to activate/deactivate.

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 with App Router
- **React**: 19.1.0 (latest)
- **Build Tool**: Turbopack (enabled via `--turbopack` flag)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **Linting**: ESLint 9 with Next.js TypeScript config

### Project Structure
- `src/app/` - App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Homepage component
  - `globals.css` - Global styles and Tailwind directives
- Path alias `@/*` maps to `./src/*`

### TypeScript Configuration
- Target: ES2017
- Strict mode: enabled
- Module resolution: bundler
- JSX: preserve (handled by Next.js)

### Styling
- Uses Geist and Geist Mono fonts from `next/font/google`
- Tailwind CSS utility classes for all styling
- CSS custom properties for font families (`--font-geist-sans`, `--font-geist-mono`)

## Notes
- All builds use Turbopack for faster compilation
- The project is a fresh Next.js setup - currently contains only the default starter template

# CRITICAL ARCHITECTURE REMINDERS

## Before ANY Code Changes:
1. ✅ **Check Feature Scope**: Does this need a new feature module in `src/features/`?
2. ✅ **Extract Business Logic**: Move logic to services, not components
3. ✅ **Use Custom Hooks**: React state management goes in hooks
4. ✅ **Keep Components Small**: <70 lines, UI-focused only

## Component Architecture Checklist:
- [ ] Types defined first with validation
- [ ] Service layer for business logic
- [ ] Custom hook for React state
- [ ] Component focuses on UI only
- [ ] Dependency injection used
- [ ] Follow `src/features/context-pack` pattern exactly

For API testing use cURL utility

## Feature Module Structure:
```
src/features/[feature-name]/
├── components/           # UI Components (clean & focused <70 lines)
├── hooks/               # Custom hooks for state management
├── services/            # Business logic & data access
└── types/               # Type definitions with validation
```

# Best Practices

1. Always use ES6+ features and syntax.
2. Use proper TypeScript throughout.
3. Use proper error handling.
4. Use proper performance optimization.
5. Use proper testing. - Use /tests folder for testing

Always write clean, readable, and maintainable code. Use new architecture described in Architecture Overview section.

# For testing
For UI testing use playwright mcp server and either use already created reusable test case from /tests folder or created new one as per your needs. Take also opportunity to improve test cases and make them more reusable for future.

---

# 🗄️ DATABASE ACCESS (Supabase)

## Direct Database Access via Management API

**IMPORTANT**: When you need to run SQL queries, migrations, or check database state, use the Supabase Management API directly. All credentials are in `.env.local`.

### Credentials Location
All database credentials are stored in `.env.local`:
- `SUPABASE_ACCESS_TOKEN` - For Management API (running SQL queries)
- `SUPABASE_SERVICE_ROLE_KEY` - For REST API with admin privileges
- `DATABASE_URL` - Direct PostgreSQL connection string

### Running SQL Queries
Use the Supabase Management API to run any SQL:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/tarohelkwuurakbxjyxm/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL HERE"}'
```

### Common Operations

**Check table contents:**
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/tarohelkwuurakbxjyxm/database/query" \
  -H "Authorization: Bearer sbp_6159d255454cc34b08921f4cec040b4d6faffa21" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM table_name LIMIT 10;"}'
```

**Check table schema:**
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/tarohelkwuurakbxjyxm/database/query" \
  -H "Authorization: Bearer sbp_6159d255454cc34b08921f4cec040b4d6faffa21" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '\''your_table'\'';"}'
```

**Run migrations/ALTER statements:**
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/tarohelkwuurakbxjyxm/database/query" \
  -H "Authorization: Bearer sbp_6159d255454cc34b08921f4cec040b4d6faffa21" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;"}'
```

### Key Tables
- `auth.users` - Supabase auth users
- `user_credits` - User credit balances
- `generation_events` - Image/video generation history
- `admin_users` - Admin access list
- `api_keys` - API keys for external access
- `coupons` - Discount/credit codes
- `community_items` - User-submitted content

### Project Reference
- **Project ID**: `tarohelkwuurakbxjyxm`
- **Supabase URL**: `https://tarohelkwuurakbxjyxm.supabase.co`

## NEVER ask the user for database credentials - they are in .env.local!

---

# 🖼️ IMAGE/VIDEO GENERATION (Replicate API)

## Direct API Access

When generating images or videos, use the Replicate API directly. The token is in `.env.local` as `REPLICATE_API_TOKEN`.

### Generate an Image
```bash
# Get token from .env.local: REPLICATE_API_TOKEN
curl -s -X POST "https://api.replicate.com/v1/predictions" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"version": "MODEL_NAME", "input": {"prompt": "YOUR PROMPT", "aspect_ratio": "16:9"}}'
```

### Check Prediction Status
```bash
curl -s "https://api.replicate.com/v1/predictions/PREDICTION_ID" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN"
```

### Available Image Models
- `google/nano-banana` - Nano Banana (fast, 8 pts) - good for quick iterations
- `google/nano-banana-pro` - Nano Banana Pro (high quality, 20 pts) - best for production
- `ideogram-ai/ideogram-v2` - Best for text rendering
- `prunaai/qwen-image-fast` - Cheapest/fastest

### Available Video Models
- `bytedance/seedance-1-lite` - Featured model with reference images
- `bytedance/seedance-1-pro-fast` - Fast video generation
- `wan-video/wan-2.2-i2v-fast` - Budget with last frame control
- `kwaivgi/kling-v2.5-turbo-pro` - Premium quality

## NEVER ask the user for Replicate credentials - they are in .env.local!

---

# 🎬 FEATURE ARCHITECTURE REFERENCE

## Feature Overview

| Feature | Location | Purpose |
|---------|----------|---------|
| **Storyboard** | `src/features/storyboard/` | Story text → cinematic shot images |
| **Storybook** | `src/features/storybook/` | Children's book creation |
| **Music Lab** | `src/features/music-lab/` | Music video treatment generation |
| **Shot Creator** | `src/features/shot-creator/` | Single shot generation with recipes |

## Storyboard
- **Flow**: Story → OpenRouter LLM → Cinematic prompts → nano-banana
- **Key Services**:
  - `storyboard-generation.service.ts` - Image generation
  - `shot-prompt.service.ts` - AI prompt enhancement
  - `story-director.service.ts` - Director enhancements
- **Uses**: @character_name tags, style guides, directors

## Storybook
- **Flow**: Uses recipe execution API (`/api/recipes/{name}/execute`)
- **5 System Recipes**: Style Guide, Character Sheet, Page (First), Page (Continuation), Book Cover
- **Key Hook**: `useStorybookGeneration.ts`

## Music Lab
- **Purpose**: AI directors generate music video treatments from audio/lyrics
- **Has**: 5 AI Directors, Director Fingerprints, Prompt Templates (Page2Prompt)
- **Most sophisticated prompting system in the app**

## Shot Creator
- **Purpose**: Single shot generation with customizable recipes
- **Key Files**:
  - `recipe.types.ts` - Where SYSTEM_RECIPES are defined
  - `recipe.service.ts` - Recipe CRUD operations

---

# 🧪 RECIPE SYSTEM

## Field Syntax
```
<<FIELD_NAME:type>>     - Optional field
<<FIELD_NAME:type!>>    - Required field (note the !)

Types:
- name   - Short text input
- text   - Long text input
- select(Option1,Option2,Option3) - Dropdown
```

## Recipe Execution API
```
POST /api/recipes/{recipeName}/execute

{
  "fieldValues": {
    "stage0_field0_character_name": "Marcus",
    "stage0_field1_style_description": "Comic book style"
  },
  "referenceImages": [
    "https://example.com/style-guide.jpg",
    "https://example.com/character-photo.jpg"
  ],
  "modelSettings": {
    "aspectRatio": "16:9",
    "outputFormat": "png",
    "model": "nano-banana-pro"
  }
}
```

## Key Recipe Files
- **Types & System Recipes**: `src/features/shot-creator/types/recipe.types.ts`
- **Recipe Service**: `src/features/shot-creator/services/recipe.service.ts`
- **Execution Service**: `src/features/shared/services/recipe-execution.service.ts`
- **Storybook Pattern**: `src/features/storybook/hooks/useStorybookGeneration.ts`

---

# 🎭 DIRECTOR SYSTEM

## 5 AI Directors (Music Lab / Storyboard)

| Director | Style | Key Traits |
|----------|-------|------------|
| **Ryan Cooler** | Emotion-forward | Intimate framing, warm lighting, subjective POV |
| **Clint Westwood** | Economical | Restrained, cool tones, stillness-dominant |
| **David Pincher** | Precision | Symmetric, psychological, digital VFX |
| **Wes Sanderson** | Whimsy | Center-framed, curated, choreographed |
| **Hype Millions** | Glossy | Heroic angles, spectacle, frantic pacing |

## Director Enhancement Flow
Directors ADD visual modifiers to base prompts (10 categories):
1. Framing/Composition
2. Distance/Shot Size
3. Emotional Tone
4. Lighting/Atmosphere
5. Movement/Stillness
6. POV/Perspective
7. Spectacle/VFX
8. Actor Direction
9. Visual Complexity
10. Pacing Hints

**Example**: `basePrompt + ", intimate close framing, close-up shot, evoking melancholy, warm golden lighting"`

**Key Service**: `src/features/storyboard/services/story-director.service.ts`

---

# 🏷️ CHARACTER TAGGING CONVENTION

## @name Tags
Use `@underscore_names` for character references:
```
@marcus_jones  (not "Marcus Jones")
@sarah_chen    (not "Sarah")
@the_judge     (for titled characters)
```

This anchors characters to their reference images in nano-banana.

## Visual Descriptions (DO vs DON'T)

**DO** - Comma-separated visual attributes:
```
"African American man, mid-30s, muscular build, bald head, gold chain necklace, white tank top, baggy jeans, fresh Jordans"
```

**DON'T** - Narrative descriptions:
```
"Marcus is a confident man who works at the store" ❌
```

---

# 🛡️ NANO-BANANA GUARDRAILS

## DO
- ✅ Use @name tags for characters
- ✅ Append style guide at end of prompt
- ✅ Include shot type (establishing/wide/medium/close-up/detail)
- ✅ Keep prompts 2-3 sentences (not 1, not 5+)
- ✅ Attach reference images for characters
- ✅ Use visual attribute descriptions

## DON'T
- ❌ Use video terms: dolly, pan, tilt, crane, rack focus
- ❌ Use narrative descriptions ("he felt angry")
- ❌ Skip reference images for characters
- ❌ Forget the style guide
- ❌ Write overly long prompts

---

# 📖 STORYBOOK VS STORYBOARD

| Feature | Storybook | Storyboard |
|---------|-----------|------------|
| **Purpose** | Children's illustrated books | Cinematic shot sequences |
| **Target** | Kids' stories with text overlays | Music videos, films |
| **Uses Recipes** | ✅ Yes (5 system recipes) | ❌ No (direct LLM → image) |
| **Text Overlay** | ✅ Yes (story text on pages) | ❌ No |
| **Audio** | ✅ TTS narration (ElevenLabs) | ❌ No |
| **Page Flip** | ✅ react-pageflip | N/A |
| **Directors** | ❌ No | ✅ Yes (5 AI directors) |
| **Key Location** | `src/features/storybook/` | `src/features/storyboard/` |

---

# 🔊 ELEVENLABS TTS REFERENCE

## API Endpoint
```
POST /api/storybook/synthesize
```

## Voice Options
| Voice ID | Name | Description |
|----------|------|-------------|
| `rachel` | Rachel | Warm, nurturing (default) |
| `adam` | Adam | Friendly |
| `charlotte` | Charlotte | Expressive |
| `dorothy` | Dorothy | Pleasant |

## Model
- **Model ID**: `eleven_turbo_v2_5`
- **Format**: MP3 audio file
- **Storage**: Uploaded to project storage, URL returned

## Request Format
```json
{
  "text": "Story text to synthesize",
  "voiceId": "rachel",
  "projectId": "optional-project-id",
  "pageNumber": 1
}
```

---

# 🎧 AUDIO PLAYBACK GOTCHAS

## Critical Pattern
`audio.play()` returns a **Promise** that can reject. Always use:

```typescript
// ✅ CORRECT - async/await with try/catch
const togglePlayback = async () => {
  try {
    await audioRef.current.play()
    setIsPlaying(true)
  } catch (error) {
    console.error('Audio playback failed:', error)
    setIsPlaying(false)
  }
}

// ❌ WRONG - ignoring Promise
audioRef.current.play()
setIsPlaying(true)
```

## Audio Element Setup
```tsx
<audio
  ref={audioRef}
  crossOrigin="anonymous"  // Required for CORS
  preload="auto"           // Preload for instant playback
/>
```

## Error Handler
```typescript
useEffect(() => {
  const handleError = (e: Event) => {
    const target = e.target as HTMLAudioElement
    console.error('Audio error:', target.error?.message)
    setIsPlaying(false)
  }
  audio.addEventListener('error', handleError)
  return () => audio.removeEventListener('error', handleError)
}, [])
```

---

# 📦 KEY THIRD-PARTY LIBRARIES

| Library | Purpose | Key Usage |
|---------|---------|-----------|
| `react-pageflip` | Book page flip animation | Storybook preview |
| `@11ty/eleventy` | N/A in this project | - |
| `react-hook-form` | Form state management | All forms |
| `zustand` | Global state stores | Feature stores |
| `openrouter` | LLM API gateway | Storyboard prompts |
| `replicate` | Image/video generation | nano-banana |
| `@supabase/supabase-js` | Database & auth | All data ops |

## react-pageflip Notes
- Page components **must** use `forwardRef`
- Cover pages counted in page index (+1 offset)
- `onFlip` callback provides `e.data` as page index

---

# 🔧 COMMON FIX PATTERNS

## Supabase: "Cannot coerce to single JSON object"
**Error**: Query expects exactly 1 row but got 0
**Fix**: Use `.maybeSingle()` instead of `.single()`
```typescript
// ❌ Throws error when 0 rows
.select('*').eq('user_id', userId).single()

// ✅ Returns null when 0 rows
.select('*').eq('user_id', userId).maybeSingle()
```

## React: Missing exhaustive deps warning
**Fix**: Add all dependencies or use refs for stable values
```typescript
// If callback changes cause infinite loops, use ref
const callbackRef = useRef(callback)
callbackRef.current = callback

useEffect(() => {
  callbackRef.current()
}, [dependency])
```

## Audio: No sound plays after generation
1. Check `crossOrigin="anonymous"` on audio element
2. Wrap `play()` in try/catch with await
3. Add error event listener
4. Verify audio URL is set before calling play()

## API: "Unexpected token '<'" JSON parsing error
**Error**: Server returned HTML error page but code assumed JSON
**Fix**: Check content-type before parsing
```typescript
// ❌ Crashes if server returns HTML error
const data = await response.json()

// ✅ Check content-type first
if (!response.ok) {
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Request failed')
    } else {
        throw new Error(`Request failed (HTTP ${response.status})`)
    }
}
```

## Model Settings: Missing switch cases in buildModelSettings()
**Error**: Model-specific params not passed to API (only nano-banana worked)
**Fix**: Add cases for ALL models in `PromptActions.tsx` buildModelSettings()
```typescript
// ❌ Missing cases = params silently dropped
switch (model) {
    case 'nano-banana': ...
    case 'nano-banana-pro': ...
    // z-image-turbo, seedream-4.5, etc. MISSING!
}

// ✅ Handle ALL models
switch (model) {
    case 'nano-banana': ...
    case 'nano-banana-pro': ...
    case 'z-image-turbo': ...
    case 'seedream-4.5': ...
    case 'qwen-image-2512': ...
    case 'gpt-image-low':
    case 'gpt-image-medium':
    case 'gpt-image-high': ...
}
```

## Service Layer: Check before adding conversion logic
**Lesson**: Before adding parameter conversion code, check if the service layer already handles it.
- `image-generation.service.ts` already converts `aspect_ratio` → `width/height` for Z-Image Turbo
- Service already converts `sequentialGeneration` boolean → `'auto'/'disabled'` string for Seedream
- API route already converts `webp` → `jpg` for nano-banana

---

# 📁 PLAN FILE LOCATION

Claude Code stores plan files at:
```
C:\Users\taskm\.claude\plans\
```

Plans are named with random identifiers (e.g., `woolly-shimmying-hennessy.md`).

Check the system message for "A plan file exists from plan mode at:" to find the current plan.