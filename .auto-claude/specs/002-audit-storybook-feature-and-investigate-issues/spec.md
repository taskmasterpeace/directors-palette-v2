# Specification: Storybook Feature Audit and Investigation

## Overview

This is a comprehensive audit of the Storybook feature to verify functionality, identify bugs, and assess missing capabilities. The Storybook feature allows users to generate illustrated children's storybooks with optional narration. Key areas to investigate include: story generation workflows, character sheet creation, image upload persistence, narration synthesis, and metadata handling for future recipe integration. Two critical issues have been reported: (1) character images don't persist in the UI after upload, and (2) there's no mechanism to generate character sheets without a source photo.

## Workflow Type

**Type**: investigation

**Rationale**: This task is primarily exploratory and diagnostic in nature. Before implementing fixes, we need to understand the current state of the feature, reproduce bugs, and document gaps between expected and actual functionality. The user explicitly requested an audit to "take a look and see what we have right now."

## Task Scope

### Services Involved
- **main** (primary) - Next.js frontend application containing all Storybook components, stores, and API routes

### This Task Will:
- [ ] Audit the complete Storybook wizard flow (10 steps in generate mode, 5 steps in paste mode)
- [ ] Investigate why character images don't persist after upload
- [ ] Document the current character sheet generation workflow and its limitations
- [ ] Verify narration functionality works correctly (ElevenLabs integration)
- [ ] Assess metadata persistence and readiness for recipe integration
- [ ] Identify gaps between expected and actual functionality
- [ ] Create detailed findings report with recommended fixes

### Out of Scope:
- Implementing recipe integration (pending external dependency)
- Adding new features beyond fixing identified bugs
- Major refactoring of the wizard architecture
- PDF export implementation (marked as "Coming Soon")

## Service Context

### Main Service (Next.js Frontend)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Tailwind CSS
- State Management: Zustand
- Database: Supabase/PostgreSQL
- File Storage: Replicate (temporary) / Supabase Storage
- TTS Service: ElevenLabs

**Entry Point:** `src/app/page.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Key Directories:**
- `src/features/storybook/` - Main Storybook feature code
- `src/features/storybook/components/wizard/` - Wizard step components
- `src/features/storybook/store/` - Zustand state management
- `src/features/storybook/services/` - ElevenLabs and template services
- `src/app/api/storybook/` - API routes for story generation

## Files to Investigate

| File | Service | What to Investigate |
|------|---------|---------------------|
| `src/features/storybook/components/wizard/steps/CharacterSetupStep.tsx` | main | Image upload and state persistence - uses local React state that may not sync with store |
| `src/features/storybook/components/wizard/steps/CharacterStep.tsx` | main | Character sheet generation workflow - requires sourcePhotoUrl before generation |
| `src/features/storybook/store/storybook.store.ts` | main | State management - verify mainCharacterPhotoUrl is persisted correctly |
| `src/app/api/upload-file/route.ts` | main | Uses Replicate temporary URLs - may expire causing image disappearance |
| `src/features/storybook/hooks/useStorybookGeneration.ts` | main | Character sheet generation logic |
| `src/features/storybook/components/AudioPlayer.tsx` | main | Narration playback and generation |
| `src/app/api/storybook/synthesize/route.ts` | main | ElevenLabs TTS integration |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/features/storybook/store/storybook.store.ts` | Zustand store pattern for state management |
| `src/features/storybook/services/elevenlabs.service.ts` | Service class pattern for external API integration |
| `src/features/storybook/types/storybook.types.ts` | TypeScript interface definitions |

## Current Architecture Analysis

### Storybook Wizard Flow

The wizard has two modes:

**Generate Mode (Educational)** - 10 steps:
1. `character-setup` - Name, age, and photo of main character
2. `category` - Educational category selection
3. `topic` - Specific topic within category
4. `settings` - Page count, sentences per page
5. `approach` - Choose from 4 AI-generated story ideas
6. `review` - Edit generated story
7. `style` - Art style selection
8. `characters` - Character sheet generation
9. `pages` - Page illustration generation
10. `preview` - Final preview with narration

**Paste Mode** - 5 steps:
1. `story` - Paste or write story text
2. `style` - Art style selection
3. `characters` - Character sheet generation
4. `pages` - Page illustration generation
5. `preview` - Final preview

### Key Data Types

```typescript
interface StorybookCharacter {
  id: string
  name: string
  tag: string // @name format for prompts
  sourcePhotoUrl?: string // Original photo (uploaded)
  characterSheetUrl?: string // Generated character sheet
  artStyle?: string
  isFromLibrary?: boolean
}

interface StorybookProject {
  id: string
  title: string
  storyText: string
  pages: StorybookPage[]
  characters: StorybookCharacter[]
  style?: StorybookStyle
  mainCharacterPhotoUrl?: string // Main character photo
  // ... other fields
}
```

## Identified Issues

### Issue 1: Image Upload Persistence

**Symptom:** Character images don't stay displayed in UI after upload

**Root Cause Analysis:**
1. `upload-file/route.ts` uses `replicate.files.create(file)` which returns temporary URLs
2. `CharacterSetupStep.tsx` uses local React state (`useState`) for `photoUrl`
3. When navigating away and back, local state is re-initialized from `project?.mainCharacterPhotoUrl`
4. If the Replicate URL expires or store wasn't updated properly, image disappears

**Investigation Points:**
- Verify Replicate URL expiration policy
- Check if `setMainCharacter(name, age, photoUrl)` is called correctly
- Verify store state persistence between wizard steps

### Issue 2: Character Sheet Generation Without Photo

**Symptom:** "No way to generate character sheet from anything"

**Root Cause Analysis:**
1. `CharacterStep.tsx` requires `sourcePhotoUrl` before enabling generation button
2. The button is disabled with text "Upload a photo first"
3. No fallback to generate character sheets from description alone

**Code Evidence:**
```typescript
// CharacterStep.tsx lines 336-339
<Button
  disabled={!character.sourcePhotoUrl || (isGenerating && ...)}
>
```

**Investigation Points:**
- Determine if AI generation without reference is feasible
- Consider adding text-based character description option

### Issue 3: Metadata Persistence for Recipes

**Symptom:** Metadata not structured for recipe processing

**Root Cause Analysis:**
1. Zustand store is in-memory only
2. No database persistence layer for project metadata
3. `generatedStory` object contains learning notes but isn't persisted

**Investigation Points:**
- Review what metadata is captured in `generatedStory`
- Determine storage schema for recipe integration

## Requirements

### Functional Requirements

1. **Image Upload Persistence**
   - Description: Uploaded character photos must remain visible in UI after navigation
   - Acceptance: Image displays correctly when returning to CharacterSetupStep or CharacterStep

2. **Character Sheet Generation**
   - Description: Character sheets should be generateable (currently requires source photo)
   - Acceptance: Either fix photo persistence OR provide alternative generation method

3. **Narration Functionality**
   - Description: Story pages can be narrated using ElevenLabs TTS
   - Acceptance: Click "Generate Narration" produces playable audio

4. **Metadata Capture**
   - Description: Document current metadata structure for recipe readiness
   - Acceptance: Clear documentation of available metadata fields

### Edge Cases

1. **Expired Replicate URLs** - Uploaded images may disappear after URL expiration (investigate TTL)
2. **Large File Uploads** - 50MB limit enforced; verify graceful error handling
3. **Missing ElevenLabs API Key** - Narration should fail gracefully with error message
4. **Empty Story Text** - Character detection should handle empty/minimal text

## Implementation Notes

### DO
- Investigate Replicate URL expiration policies
- Test complete wizard flow in both modes
- Verify state synchronization between local state and Zustand store
- Document all metadata fields available for recipes
- Check browser console for errors during image upload

### DON'T
- Implement fixes without completing investigation
- Change storage provider without understanding current limitations
- Modify recipe integration code (external dependency pending)
- Delete or refactor working wizard components

## Development Environment

### Start Services

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Service URLs
- Main Application: http://localhost:3000

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `REPLICATE_API_TOKEN`: Replicate API token (for file uploads)
- `ELEVENLABS_API_KEY`: ElevenLabs API key (for narration)

## Success Criteria

The investigation is complete when:

1. [ ] Complete wizard flow tested in both Generate and Paste modes
2. [ ] Image persistence bug reproduced and root cause documented
3. [ ] Character sheet generation limitation documented with recommendations
4. [ ] Narration functionality verified end-to-end
5. [ ] Metadata structure documented for recipe integration
6. [ ] Findings report created with prioritized recommendations
7. [ ] No new regressions introduced during investigation

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Manual Testing Checklist

| Test | Steps | Expected Outcome |
|------|-------|------------------|
| Image Upload Persistence | 1. Start new storybook 2. Upload character photo 3. Click Next 4. Click Back | Image should still be visible |
| Character Sheet Generation | 1. Add character 2. Upload source photo 3. Click Generate Character Sheet | Character sheet image appears |
| Narration Generation | 1. Complete to Preview step 2. Select voice 3. Click Generate Narration | Audio plays for current page |
| Generate All Narration | 1. On Preview step 2. Click "Generate All Pages" | All pages receive audio URLs |

### Browser Verification

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Storybook Wizard | `http://localhost:3000` | Navigate to Storybook feature via sidebar |
| Character Setup Step | Wizard step 1 | Image upload and preview display |
| Character Step | Wizard step 8 | Character sheet generation UI |
| Preview Step | Wizard step 10 | Audio player and narration controls |

### Console Error Checks

| Check | Command | Expected |
|-------|---------|----------|
| Upload Errors | Browser DevTools Console | No errors during file upload |
| Generation Errors | Browser DevTools Console | No errors during character sheet generation |
| TTS Errors | Browser DevTools Console | No errors during narration synthesis |

### API Endpoint Verification

| Endpoint | Method | Expected Response |
|----------|--------|-------------------|
| `/api/upload-file` | POST | `{ url: "https://..." }` |
| `/api/storybook/synthesize` | POST | `{ audioUrl: "..." }` |
| `/api/storybook/detect-characters` | POST | `{ characters: [...] }` |

### QA Sign-off Requirements
- [ ] All manual testing checklist items verified
- [ ] Image persistence issue reproduced and documented
- [ ] Character sheet limitation confirmed
- [ ] Narration works end-to-end
- [ ] No console errors during normal operation
- [ ] API endpoints respond correctly
- [ ] Investigation findings documented

## Investigation Deliverables

1. **Bug Report: Image Persistence**
   - Steps to reproduce
   - Root cause analysis
   - Recommended fix

2. **Feature Gap: Character Sheet Generation**
   - Current limitations
   - Alternative approaches
   - Implementation recommendations

3. **Metadata Inventory**
   - Fields captured during story generation
   - Storage location and format
   - Recipe integration requirements

4. **Functionality Verification**
   - Narration: Working / Not Working
   - Story Generation: Working / Not Working
   - Page Generation: Working / Not Working
