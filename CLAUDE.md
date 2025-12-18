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
- `google/imagen-3` - High quality (Nano Banana Pro equivalent)
- `google/imagen-3-fast` - Fast generation
- `ideogram-ai/ideogram-v2` - Best for text rendering
- `prunaai/qwen-image-fast` - Cheapest/fastest

### Available Video Models
- `bytedance/seedance-1-lite` - Featured model with reference images
- `bytedance/seedance-1-pro-fast` - Fast video generation
- `wan-video/wan-2.2-i2v-fast` - Budget with last frame control
- `kwaivgi/kling-v2.5-turbo-pro` - Premium quality

## NEVER ask the user for Replicate credentials - they are in .env.local!