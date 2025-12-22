# Specification: Audit Storyboard Functionality and Identify Issues

## Overview

This task is a comprehensive audit of the storyboard feature in Director's Palette v2. The storyboard feature allows users to input story text, extract characters and locations, break down the story into visual shots, generate cinematic prompts using LLM, and produce AI-generated images for each shot. The audit will investigate all aspects of this complex feature to identify bugs, missing implementations, broken functionality, and areas requiring improvement. **This is a read-only investigation - no code changes will be made during this phase.**

## Workflow Type

**Type**: investigation

**Rationale**: This is a pure audit/investigation task. The objective is to thoroughly examine the storyboard feature ("look under every rock"), test functionality, identify all issues, and document findings. No fixes or implementations will be made during this audit - only issue identification and documentation.

## Task Scope

### Services Involved
- **main** (primary) - Next.js frontend with storyboard feature implementation

### This Task Will:
- [ ] Audit all storyboard components for functionality
- [ ] Test the 6-step workflow (Story → Style → Characters → Shots → Generate → Results)
- [ ] Verify API endpoints work correctly
- [ ] Check state management (Zustand store) behavior
- [ ] Examine data persistence and localStorage handling
- [ ] Test character/location extraction functionality
- [ ] Verify shot breakdown and prompt generation
- [ ] Check image generation queue functionality
- [ ] Test gallery display and metadata
- [ ] Document all identified issues with severity levels
- [ ] Identify missing implementations vs broken features

### Out of Scope:
- Fixing any identified issues (audit only)
- Database schema changes
- New feature development
- Performance optimization implementation
- UI/UX redesign

## Service Context

### Main Service

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- State Management: Zustand
- Styling: Tailwind CSS
- Database: Supabase (PostgreSQL)
- Testing: Playwright (E2E)

**Entry Point:** `src/features/storyboard/index.ts`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Test URL:** http://localhost:3000/test-storyboard

## Files to Audit

### Core Components
| File | Purpose | What to Check |
|------|---------|---------------|
| `src/features/storyboard/components/Storyboard.tsx` | Main component with 6-tab workflow | Tab navigation, state flow, modal handling |
| `src/features/storyboard/components/story-input/StoryInput.tsx` | Story text input and extraction | Text input, extract button, validation |
| `src/features/storyboard/components/style-guides/StyleGuideEditor.tsx` | Style guide selection/creation | Preset styles, custom guides, persistence |
| `src/features/storyboard/components/style-guides/StyleGuideGenerator.tsx` | AI style generation | Generation flow, error handling |
| `src/features/storyboard/components/entities/CharacterList.tsx` | Character management | CRUD operations, reference images |
| `src/features/storyboard/components/entities/LocationList.tsx` | Location management | CRUD operations, reference images |
| `src/features/storyboard/components/shot-list/ShotBreakdown.tsx` | Shot breakdown display | Prompt display, editing, selection |
| `src/features/storyboard/components/shot-list/ShotTextPreview.tsx` | Color-coded text preview | Highlight accuracy, chapter support |
| `src/features/storyboard/components/generation/GenerationQueue.tsx` | Image generation queue | Queue processing, progress, error handling |
| `src/features/storyboard/components/gallery/StoryboardGallery.tsx` | Generated images gallery | Image display, metadata, actions |
| `src/features/storyboard/components/ShotLab/ShotLab.tsx` | Shot editing lab modal | Canvas, VFX, blocking features |

### State Management
| File | Purpose | What to Check |
|------|---------|---------------|
| `src/features/storyboard/store/storyboard.store.ts` | Zustand store | State shape, actions, persistence, localStorage quota |

### Services
| File | Purpose | What to Check |
|------|---------|---------------|
| `src/features/storyboard/services/openrouter.service.ts` | OpenRouter API integration | API calls, error handling, response parsing |
| `src/features/storyboard/services/shot-breakdown.service.ts` | Text breakdown logic | Granularity levels, segment accuracy |
| `src/features/storyboard/services/shot-prompt.service.ts` | Prompt generation | Character refs, wildcards, formatting |
| `src/features/storyboard/services/storyboard-generation.service.ts` | Image generation orchestration | Queue management, API calls |
| `src/features/storyboard/services/chapter-detection.service.ts` | Chapter auto-detection | Detection accuracy, edge cases |
| `src/features/storyboard/services/contact-sheet.service.ts` | 3x3 contact sheet | Angle variations, generation |
| `src/features/storyboard/services/story-director.service.ts` | Director style application | Prompt enhancement, pitch generation |

### API Routes
| File | Purpose | What to Check |
|------|---------|---------------|
| `src/app/api/storyboard/extract/route.ts` | Character/location extraction | Request handling, LLM integration |
| `src/app/api/storyboard/generate-prompts/route.ts` | Shot prompt generation | Batch processing, error recovery |
| `src/app/api/storyboard/broll/route.ts` | B-roll generation | Context handling, generation |

### Tests
| File | Purpose | What to Check |
|------|---------|---------------|
| `tests/storyboard.spec.ts` | E2E tests | Test coverage, passing/failing tests |
| `tests/helpers/storyboard-test-data.ts` | Test data | Data completeness |

## Key Feature Areas to Audit

### 1. Story Input Tab
- Text input persistence
- Character/location extraction via OpenRouter
- Loading states and error handling
- Model selection (AI model dropdown)

### 2. Style Tab
- Preset style selection (Claymation, Muppet, Comic, Action Figure)
- Custom style guide creation
- Style guide persistence
- Reference image handling

### 3. Characters/Entities Tab
- Auto-extracted character display
- Manual character addition/editing
- Reference image assignment from gallery
- Character description editing
- Location management

### 4. Shots Tab
- Granularity slider (3 levels)
- Color-coded text preview
- Shot breakdown generation
- Prompt editing
- Director commission feature
- Chapter detection and tabs

### 5. Generate Tab
- Shot selection (individual/all)
- Generation queue management
- Progress tracking
- Error handling and retry
- Pause/resume functionality

### 6. Results Tab
- Gallery display
- Image metadata
- Shot Lab integration
- Contact sheet generation

## Known Architectural Concerns

### State Persistence
The store explicitly notes localStorage quota issues:
```typescript
// NOTE: Avoid persisting large arrays (breakdownResult, generatedPrompts)
// as they can exceed localStorage quota (~5MB) with many shots
```

### Complex Feature Interactions
- Shot Lab modal integration with main workflow
- Director pitch system integration
- Chapter detection affecting multiple views
- Wildcard expansion in prompts

## Requirements

### Functional Requirements

1. **Story Input Flow**
   - Description: Users can input story text and extract characters/locations
   - Acceptance: Verify extraction API works and populates store

2. **Shot Breakdown**
   - Description: Story is broken into visual shots at 3 granularity levels
   - Acceptance: Verify breakdown produces correct segments

3. **Prompt Generation**
   - Description: Each shot gets a cinematic prompt via LLM
   - Acceptance: Verify prompts are generated with character references

4. **Image Generation**
   - Description: Queue system generates images for selected shots
   - Acceptance: Verify queue processes and images are saved

5. **Gallery Display**
   - Description: Generated images displayed with metadata
   - Acceptance: Verify images load and metadata is accurate

### Edge Cases to Investigate

1. **Empty story text** - What happens with no input?
2. **Very long stories** - Does localStorage quota fail?
3. **No characters extracted** - How is this handled?
4. **API failures** - Are errors gracefully handled?
5. **Mid-generation refresh** - Is state preserved?
6. **Multiple chapters** - Does chapter detection work?
7. **Missing style assets** - What if preset images missing?

## Implementation Notes

### DO
- Run all existing E2E tests and document failures
- Test each tab's functionality manually
- Check browser console for errors
- Verify API responses match expected schema
- Test on both desktop and mobile viewports
- Document issues with reproduction steps

### DON'T
- Make any code changes
- Fix identified issues (document only)
- Skip any features - comprehensive audit required
- Assume anything works without testing

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Main App: http://localhost:3000
- Test Storyboard Page: http://localhost:3000/test-storyboard

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENROUTER_API_KEY`: OpenRouter API key (for LLM)
- `REPLICATE_API_TOKEN`: Replicate API token (for image generation)

## Success Criteria

The audit is complete when:

1. [ ] All 6 workflow tabs have been tested
2. [ ] All API endpoints have been verified
3. [ ] All components have been inspected for issues
4. [ ] State management behavior has been validated
5. [ ] E2E tests have been run and results documented
6. [ ] All identified issues have been catalogued with severity
7. [ ] Browser console errors have been noted
8. [ ] Mobile responsiveness has been checked
9. [ ] Edge cases have been tested
10. [ ] Comprehensive issue report has been created

## QA Acceptance Criteria

**CRITICAL**: These criteria define what constitutes a complete audit.

### Test Execution
| Test Type | What to Verify |
|-----------|----------------|
| E2E Tests | Run `npx playwright test tests/storyboard.spec.ts` and document results |
| Manual Testing | Walk through entire 6-step workflow |
| Console Monitoring | Note all warnings and errors |

### Functional Verification
| Feature | Steps to Test | Expected Behavior |
|---------|---------------|-------------------|
| Story Input | Enter text, click Extract | Characters/locations extracted |
| Style Selection | Select preset style | Style applied to generation |
| Shot Breakdown | Move granularity slider | Shots update dynamically |
| Prompt Generation | Click generate prompts | Prompts created for each shot |
| Image Generation | Select shots, generate | Images generated and saved |
| Gallery View | Navigate to Results tab | Images displayed with metadata |

### Issue Documentation Format
For each issue found, document:
- **Issue ID**: Sequential number
- **Severity**: Critical / High / Medium / Low
- **Category**: Bug / Missing Feature / UX Issue / Performance
- **Component**: Which file/component affected
- **Description**: What's wrong
- **Steps to Reproduce**: How to trigger the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots/Logs**: If applicable

### Audit Sign-off Requirements
- [ ] All 6 workflow tabs audited
- [ ] All API endpoints tested
- [ ] All services reviewed
- [ ] E2E test results documented
- [ ] Issue list created with severities
- [ ] No critical functionality left untested
- [ ] Recommendations for next steps provided
