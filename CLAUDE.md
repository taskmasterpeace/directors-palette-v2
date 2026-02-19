# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

# CRITICAL RULES

## Git Commit Protocol
- Run `git status` at session start and end. Commit any uncommitted changes immediately.
- Commit after every feature completion. Push after every commit.
- Never let more than 30 minutes of work go uncommitted.
- Command: `git add -A && git commit -m "type(scope): description" && git push origin main`

## Clean Build Before Every Commit
Always run a clean build before committing. Cached `.next` builds hide errors.
```bash
rm -rf .next && npm run build
```
- This runs both TypeScript type checking AND ESLint
- `tsc --noEmit` alone does NOT catch ESLint errors (unused imports, missing alt text, etc.)
- If build fails: fix errors, rebuild, only commit on success

## Dev Server Startup
Start the dev server automatically when needed. Never ask the user to start it.
```bash
cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &
```
- Use port 3002 (not 3000)
- Use `node` directly (not `npm run dev`)
- Verify with `curl http://localhost:3002`

---

# Project Overview

**Next.js 15** app with React 19, TypeScript (strict), Tailwind CSS v4, Turbopack.

## Commands
```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
```

## Architecture
- `src/app/` - App Router pages and layouts
- `src/features/[name]/` - Feature modules with: `components/`, `hooks/`, `services/`, `types/`
- Path alias `@/*` maps to `./src/*`
- Components: <70 lines, UI-focused. Business logic in services. State in hooks.

## Key Libraries
zustand (state), react-hook-form (forms), @supabase/supabase-js (DB/auth), replicate (image gen), openrouter (LLM), react-pageflip (storybook)

## Features
| Feature | Location | Purpose |
|---------|----------|---------|
| Storyboard | `src/features/storyboard/` | Story text -> cinematic shots via LLM + nano-banana |
| Storybook | `src/features/storybook/` | Children's book creation with recipes |
| Music Lab | `src/features/music-lab/` | Music video treatments with AI directors |
| Shot Creator | `src/features/shot-creator/` | Single shot generation with recipes |

## Credentials
All API keys/tokens are in `.env.local`. Never ask the user for credentials.

## Testing
Use Playwright for UI tests. Test files in `/tests` folder. Use cURL for API testing.

---

# REFERENCE

For detailed reference on database access, Replicate API, ElevenLabs TTS, recipe system, director system, character tagging, nano-banana guardrails, audio playback patterns, and common fix patterns, see `CLAUDE-REFERENCE.md`.
