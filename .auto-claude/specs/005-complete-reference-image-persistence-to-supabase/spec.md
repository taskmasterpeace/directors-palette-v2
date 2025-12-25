# Specification: Complete Reference Image Persistence to Supabase

## Overview

This task addresses two critical issues with the reference image system in Director's Palette. First, there's a UX bug where **two autocomplete dropdowns appear simultaneously** when typing `@` in the prompt textarea - one narrow fixed-position dropdown and one wider inline dropdown. Second, reference images need **proper persistence to Supabase Storage** so that character references survive browser sessions and sync across devices. The reference system is the #1 differentiator for Director's Palette, addressing character consistency pain points that competitors (Midjourney, DALL-E) fail to solve.

## Workflow Type

**Type**: bug_fix

**Rationale**: The primary issue is a UI collision bug (dual autocomplete) combined with incomplete persistence implementation. The autocomplete bug prevents proper usage of the reference system, while the persistence gap causes users to lose their character reference work across sessions.

## Task Scope

### Services Involved
- **main** (primary) - Next.js frontend with Zustand state management and Supabase integration

### This Task Will:
- [ ] Remove the duplicate autocomplete dropdown from PromptActions.tsx (keep only `<PromptAutocomplete>` component)
- [ ] Consolidate autocomplete logic to use only the `usePromptAutocomplete` hook
- [ ] Ensure reference images are uploaded to Supabase Storage on save to library
- [ ] Verify reference image URLs are valid and accessible in prompts
- [ ] Implement storage cleanup when references are deleted
- [ ] Ensure references persist across browser sessions
- [ ] Enable cross-device sync for authenticated users

### Out of Scope:
- Redesigning the reference library UI
- Changing the @reference syntax or detection logic
- Adding new reference categories beyond existing (people, places, props)
- Modifying the image generation pipeline

## Service Context

### Main Service (Next.js Frontend)

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Styling: Tailwind CSS
- State Management: Zustand
- Database/Storage: Supabase (PostgreSQL + Storage)
- Testing: Playwright (E2E)

**Key Directories:**
- `src/features/shot-creator/` - Shot creator feature module
- `src/features/shot-creator/components/prompt-autocomplete/` - Autocomplete components
- `src/features/shot-creator/hooks/` - React hooks including usePromptAutocomplete
- `src/features/shot-creator/store/` - Zustand stores
- `src/features/shot-creator/services/` - API and service functions
- `src/features/generation/services/` - Storage service with Supabase integration

**Entry Point:** `src/app/page.tsx`

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx` | main | Remove duplicate autocomplete dropdown (lines 647-685), remove old autocomplete state (lines 78-82), remove `autocompleteSuggestions` memo (lines 157-180), remove old handlers |
| `src/features/shot-creator/services/reference-library.service.ts` | main | Add storage upload/delete functions for reference images |
| `src/features/shot-creator/store/shot-library.store.ts` | main | Integrate storage operations when adding/deleting references |
| `src/features/generation/services/storage.service.ts` | main | Add reference image upload path and cleanup methods |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/features/shot-creator/components/prompt-autocomplete/PromptAutocomplete.tsx` | The autocomplete component to KEEP - uses fixed positioning, Command component |
| `src/features/shot-creator/hooks/usePromptAutocomplete.ts` | The hook to KEEP - handles trigger detection, filtering, keyboard navigation |
| `src/features/generation/services/storage.service.ts` | Pattern for Supabase Storage uploads - uses service role key, proper paths |
| `src/features/shot-creator/services/gallery.service.ts` | Pattern for deleting from both database and storage |

## Patterns to Follow

### Autocomplete Pattern (KEEP)

From `src/features/shot-creator/hooks/usePromptAutocomplete.ts`:

```typescript
// This is the pattern to KEEP - uses unified gallery store
const { getAllReferences, getImagesByReferences } = useUnifiedGalleryStore()

// Proper trigger detection
const detectTrigger = useCallback((text: string, cursorPosition: number): TriggerResult => {
  const textBeforeCursor = text.slice(0, cursorPosition)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  // ... validation logic
  return { shouldShow: true, query: queryText.toLowerCase(), triggerPosition: lastAtIndex }
}, [])
```

**Key Points:**
- Uses `useUnifiedGalleryStore` for references (from gallery images with reference tags)
- Returns categories AND specific references
- Component renders with fixed positioning via `position` prop

### Storage Upload Pattern

From `src/features/generation/services/storage.service.ts`:

```typescript
static async uploadToStorage(
  buffer: ArrayBuffer,
  userId: string,
  predictionId: string,
  fileExtension: string,
  mimeType: string
): Promise<{ publicUrl: string; storagePath: string; fileSize: number }> {
  const storagePath = `generations/${userId}/${predictionId}.${fileExtension}`

  const { error: uploadError } = await getSupabase().storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    })
  // ...
}
```

**Key Points:**
- Uses `STORAGE_BUCKET = 'directors-palette'`
- Path structure: `{folder}/{userId}/{uniqueId}.{ext}`
- Uses service role key for backend operations
- Returns publicUrl for frontend access

### Supabase Client Pattern

From `src/features/shot-creator/services/reference-library.service.ts`:

```typescript
import { getClient } from "@/lib/db/client";

// Pattern for authenticated operations
const supabase = await getClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('User not authenticated');
```

**Key Points:**
- Always get authenticated user before operations
- Use `getClient()` for client-side, service role key for server-side
- Handle auth errors gracefully

## Requirements

### Functional Requirements

1. **Remove Duplicate Autocomplete**
   - Description: Eliminate the old inline autocomplete dropdown that conflicts with the new `<PromptAutocomplete>` component
   - Acceptance: Only ONE autocomplete dropdown appears when typing `@` in the prompt textarea

2. **Reference Image Storage Upload**
   - Description: When a user saves an image to the reference library, upload the image file to Supabase Storage
   - Acceptance: Reference images are stored in Supabase Storage at path `references/{userId}/{referenceId}.{ext}`

3. **Reference Persistence Across Sessions**
   - Description: Reference images and their tags survive browser session close/reopen
   - Acceptance: After closing and reopening browser, all reference images are visible in library with correct tags

4. **Cross-Device Sync**
   - Description: Authenticated users see their references on all devices
   - Acceptance: Login on device B shows same references as device A

5. **Storage Cleanup on Delete**
   - Description: When a reference is deleted, remove the image from Supabase Storage
   - Acceptance: Deleted references don't leave orphaned files in storage bucket

### Edge Cases

1. **No Suggestions Available** - Show empty state or close autocomplete when no references match query
2. **Duplicate @ Triggers** - Handle consecutive `@` symbols gracefully (e.g., `@@` should not break)
3. **Storage Upload Failure** - Show error toast, don't lose local reference data
4. **Offline Mode** - Queue storage operations for when connection restored (or show appropriate error)
5. **Large Image Files** - Enforce size limits or compress before upload

## Implementation Notes

### DO
- Follow the pattern in `usePromptAutocomplete.ts` for all autocomplete logic
- Reuse `StorageService.uploadToStorage()` pattern for reference uploads
- Use `references/` folder in storage bucket for organization
- Keep the `<PromptAutocomplete>` component with fixed positioning
- Update `deleteReference()` to also clean storage

### DON'T
- Create a new autocomplete system - fix the existing collision
- Store reference images only in localStorage - must use Supabase Storage
- Delete from storage without deleting from database (or vice versa)
- Block UI during storage operations - use optimistic updates

## Development Environment

### Start Services

```bash
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000
- Supabase Studio: https://app.supabase.com/project/tarohelkwuurakbxjyxm

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: https://tarohelkwuurakbxjyxm.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Required for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY`: Required for storage operations

## Success Criteria

The task is complete when:

1. [ ] Only ONE autocomplete dropdown appears when typing `@` in prompt
2. [ ] Reference images are uploaded to Supabase Storage on save
3. [ ] Reference images persist across browser sessions
4. [ ] Reference images sync across devices for logged-in users
5. [ ] Reference image URLs are valid and accessible in prompts
6. [ ] Deleted references are cleaned up from storage
7. [ ] No console errors related to autocomplete or storage
8. [ ] Existing tests still pass
9. [ ] New functionality verified via browser testing

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Autocomplete trigger detection | `tests/features/shot-creator/hooks/usePromptAutocomplete.test.ts` | @ symbol correctly triggers autocomplete |
| Reference filtering | `tests/features/shot-creator/hooks/usePromptAutocomplete.test.ts` | Query filters references correctly |
| Storage upload | `tests/features/generation/services/storage.service.test.ts` | Files upload to correct path |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Reference save flow | Frontend + Supabase | Saving reference uploads to storage and database |
| Reference delete flow | Frontend + Supabase | Deleting removes from both storage and database |
| Reference load flow | Frontend + Supabase | References load correctly on page refresh |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Single Autocomplete | 1. Type `@` in prompt 2. Wait for dropdown | Only ONE autocomplete dropdown visible |
| Reference Persistence | 1. Add reference 2. Refresh page 3. Check library | Reference still visible with correct tag |
| Cross-Device Sync | 1. Add reference on device A 2. Login on device B | Reference visible on device B |

### Browser Verification (if frontend)
| Page/Component | URL | Checks |
|----------------|-----|--------|
| Shot Creator | `http://localhost:3000/` | Type @ shows single autocomplete |
| Reference Library | `http://localhost:3000/` | References persist after refresh |
| Fullscreen Modal | Click image > Add tag | Tag saves to correct reference |

### Database Verification (if applicable)
| Check | Query/Command | Expected |
|-------|---------------|----------|
| Reference exists | `SELECT * FROM reference WHERE id = 'xxx'` | Row exists with gallery_id |
| Storage file exists | Supabase Storage browser | File at `references/{userId}/{id}` |
| Orphan cleanup | Delete reference, check storage | File removed from storage |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Browser verification complete (if applicable)
- [ ] Database state verified (if applicable)
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns
- [ ] No security vulnerabilities introduced
