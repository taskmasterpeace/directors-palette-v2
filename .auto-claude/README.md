# Auto-Claude Configuration for Directors Palette

This directory contains all configuration and artifacts for Auto-Claude autonomous development.

## Directory Structure

```
.auto-claude/
├── README.md                 # This file
├── project_index.json        # Project configuration and context
├── patterns.md               # Code patterns to follow
├── gotchas.md                # Known pitfalls and constraints
├── specs/                    # Task specifications
│   └── README.md
├── roadmap/                  # Project roadmap
│   └── README.md
└── ideation/                 # Ideas and planning
    └── README.md
```

## Key Files

### project_index.json
Complete project configuration including:
- Tech stack details
- Service definitions (frontend, database, AI generation)
- Directory structure mapping
- API endpoint documentation
- Feature module organization
- Environment variable requirements
- Command reference

### patterns.md
Established code patterns for:
- Feature module structure
- Component patterns (< 70 lines)
- Custom hook patterns
- Service layer patterns
- Zustand store patterns
- API route patterns
- Type definitions with Zod
- Import conventions
- Error handling

### gotchas.md
Critical lessons learned including:
- Git commit protocol (MANDATORY after Dec 2024 incident)
- Next.js 15 / React 19 specifics
- Supabase authentication gotchas
- Replicate API considerations
- Zustand hydration issues
- File upload best practices
- Testing guidelines

## Usage with Auto-Claude

### Running a Task
1. Describe your task to Auto-Claude
2. The system will read `project_index.json` for context
3. Reference `patterns.md` for implementation style
4. Check `gotchas.md` to avoid known issues
5. Generate spec in `specs/` directory
6. Execute with verification

### Creating a Spec Manually
1. Create a new folder in `specs/` (e.g., `specs/001-feature-name/`)
2. Add required files:
   - `spec.md` - Full specification
   - `implementation_plan.json` - Execution plan
   - `context.json` - File context (optional)
3. Run Auto-Claude to execute

## Project Overview

**Directors Palette** is an AI-powered image/video generation platform featuring:

### Core Features
- **Shot Creator**: Image generation with prompt library, wildcards, and references
- **Shot Animator**: Video generation from reference images
- **Story Creator**: AI-assisted storyboard generation
- **Layout Annotation**: Fabric.js canvas for composition

### Tech Stack
- Next.js 15.5.4 with App Router
- React 19.1.0
- TypeScript (strict)
- Tailwind CSS v4
- Zustand for state
- Supabase for database/auth
- Replicate for AI generation
- Stripe for payments

### Key Commands
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run test         # Playwright E2E tests
npm run test:unit    # Vitest unit tests
npm run lint         # ESLint
```

## Critical Reminders

1. **ALWAYS commit frequently** - Never let work exceed 30 mins uncommitted
2. **Follow feature module structure** - See `patterns.md`
3. **Keep components < 70 lines** - Extract logic to hooks/services
4. **Use TypeScript strict mode** - No `any` types
5. **Check `gotchas.md`** - Before implementing new features
