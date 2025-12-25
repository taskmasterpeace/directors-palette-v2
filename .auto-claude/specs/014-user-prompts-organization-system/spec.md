# Specification: User Prompts Organization System

## Overview

Build a comprehensive prompt library system that allows users to save, organize, and quickly reuse image generation prompts. This feature addresses the critical pain point where power users (storyboard artists and comic creators) create hundreds of prompts per project and waste time recreating them or searching through history. The system includes database storage, folder-based organization, tagging, search capabilities, and seamless integration with the Shot Creator workflow.

## Workflow Type

**Type**: feature

**Rationale**: This is net-new functionality adding a complete prompt management system to the existing application. It requires new database schema, API endpoints, UI components, and integration points with existing features. While it builds upon the existing Shot Creator, it introduces a distinct feature set for prompt library management.

## Task Scope

### Services Involved
- **main** (primary) - Next.js frontend/backend implementing all functionality

### This Task Will:
- [ ] Design and implement database schema for prompts, folders, and tags
- [ ] Create Supabase database migrations for `user_prompts`, `prompt_folders`, and `prompt_tags` tables
- [ ] Build API routes for CRUD operations on prompts, folders, and tags
- [ ] Develop Prompt Library UI with folder navigation, tag filtering, and search
- [ ] Create prompt save dialog integrated with Shot Creator
- [ ] Implement one-click prompt loading into Shot Creator
- [ ] Add comprehensive search across prompt names, content, and tags
- [ ] Build folder management UI for creating/editing/deleting folders
- [ ] Implement tag input system with autocomplete and filtering
- [ ] Add unit tests for database operations and API routes
- [ ] Add integration tests for prompt save/load workflow
- [ ] Add E2E tests for complete user journeys

### Out of Scope:
- Prompt versioning or history tracking
- Sharing prompts with other users
- Importing/exporting prompts
- Prompt templates or marketplace
- AI-assisted prompt suggestions
- Bulk operations on multiple prompts
- Advanced permissions or privacy settings

## Service Context

### main

**Tech Stack:**
- Language: TypeScript
- Framework: Next.js
- Database: PostgreSQL (via Supabase)
- State Management: Zustand
- Styling: Tailwind CSS
- Testing: Playwright (E2E), Jest/Testing Library (unit)

**Key Directories:**
- `src/` - Source code
- `tests/` - Test files

**Entry Point:** Next.js app

**How to Run:**
```bash
npm run dev
```

**Port:** 3000

**Database:** Supabase PostgreSQL
- URL: https://tarohelkwuurakbxjyxm.supabase.co
- Client: `@supabase/supabase-js`

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `DATABASE_URL`: Direct PostgreSQL connection (for migrations)

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `supabase/migrations/YYYYMMDDHHMMSS_create_user_prompts_system.sql` | main | Create new migration for prompts, folders, tags tables |
| `src/app/api/prompts/route.ts` | main | Create API endpoints for prompt CRUD operations |
| `src/app/api/prompts/[id]/route.ts` | main | Create API endpoints for single prompt operations |
| `src/app/api/prompt-folders/route.ts` | main | Create API endpoints for folder CRUD operations |
| `src/app/api/prompt-tags/route.ts` | main | Create API endpoints for tag operations |
| `src/components/prompts/PromptLibrary.tsx` | main | Create new prompt library browser component |
| `src/components/prompts/SavePromptDialog.tsx` | main | Create save prompt dialog component |
| `src/components/prompts/PromptSearch.tsx` | main | Create search interface component |
| `src/components/prompts/FolderTree.tsx` | main | Create folder navigation component |
| `src/components/prompts/TagFilter.tsx` | main | Create tag filtering component |
| `src/stores/promptStore.ts` | main | Create Zustand store for prompt library state |
| `src/types/prompts.ts` | main | Create TypeScript types for prompts, folders, tags |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `supabase/migrations/*` | Database migration structure and naming conventions |
| `src/app/api/*/route.ts` | Next.js API route patterns with Supabase authentication |
| `src/stores/*` | Zustand store patterns for state management |
| `src/components/*` | Component structure, Tailwind styling, TypeScript patterns |
| `src/types/*` | TypeScript type definition patterns |

## Patterns to Follow

### Database Migration Pattern

Supabase migrations should follow this structure:

```sql
-- Create tables with RLS enabled
CREATE TABLE user_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES prompt_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own prompts"
  ON user_prompts FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_prompts_user_id ON user_prompts(user_id);
CREATE INDEX idx_user_prompts_folder_id ON user_prompts(folder_id);
```

**Key Points:**
- Always enable RLS (Row Level Security)
- Create policies for SELECT, INSERT, UPDATE, DELETE
- Add indexes for foreign keys and frequently queried fields
- Use `auth.uid()` to restrict access to user's own data

### Next.js API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  // Get user from auth header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_prompts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
```

**Key Points:**
- Use Supabase client with anon key for user-scoped operations
- Extract user from authorization header
- Return proper HTTP status codes
- Handle errors gracefully

### Zustand Store Pattern

```typescript
import { create } from 'zustand';

interface PromptStore {
  prompts: UserPrompt[];
  selectedFolder: string | null;
  searchQuery: string;
  setPrompts: (prompts: UserPrompt[]) => void;
  setSelectedFolder: (folderId: string | null) => void;
  setSearchQuery: (query: string) => void;
  fetchPrompts: () => Promise<void>;
}

export const usePromptStore = create<PromptStore>((set) => ({
  prompts: [],
  selectedFolder: null,
  searchQuery: '',
  setPrompts: (prompts) => set({ prompts }),
  setSelectedFolder: (folderId) => set({ selectedFolder: folderId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  fetchPrompts: async () => {
    // Fetch implementation
  },
}));
```

**Key Points:**
- Define clear interface for state and actions
- Keep state minimal and normalized
- Use async actions for API calls
- Export typed hook

### React Component Pattern

```typescript
'use client';

import React from 'react';
import { usePromptStore } from '@/stores/promptStore';

interface PromptLibraryProps {
  onSelectPrompt?: (prompt: UserPrompt) => void;
}

export function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  const { prompts, fetchPrompts } = usePromptStore();

  React.useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return (
    <div className="flex flex-col h-full">
      {/* Component content */}
    </div>
  );
}
```

**Key Points:**
- Use 'use client' directive for client components
- Define TypeScript interfaces for props
- Use Tailwind for styling
- Follow React hooks best practices

## Requirements

### Functional Requirements

1. **Prompt Persistence**
   - Description: Users can save prompts with custom names and descriptions to their personal library
   - Acceptance: Save button in Shot Creator opens dialog; submitted prompts appear in library immediately

2. **Folder Organization**
   - Description: Users can create folders to organize prompts hierarchically (e.g., by project, series, or theme)
   - Acceptance: Folder tree in library UI; prompts can be assigned to folders; folders can be created/renamed/deleted

3. **Tag System**
   - Description: Users can add multiple tags to prompts for cross-cutting categorization
   - Acceptance: Tag input with autocomplete; prompts display assigned tags; tags can filter library view

4. **Multi-Field Search**
   - Description: Quick search finds prompts by matching against name, description, content, or tags
   - Acceptance: Search input filters results in real-time; highlights matching text; works across all fields

5. **One-Click Loading**
   - Description: Clicking a saved prompt loads its content into Shot Creator for immediate use
   - Acceptance: Click prompt card → Shot Creator fields populated with saved values; user can edit and generate

### Edge Cases

1. **Empty States** - Show helpful onboarding UI when user has no prompts, folders, or tags
2. **Long Content** - Truncate long prompt content in list view; show full content in detail view
3. **Special Characters** - Handle quotes, newlines, and emoji in prompt content, names, and tags
4. **Duplicate Names** - Allow duplicate prompt names (scoped by user); show folder path for disambiguation
5. **Orphaned Prompts** - When folder deleted, prompts move to root (null folder_id)
6. **Search Performance** - Debounce search input; use database indexes for fast queries on large libraries
7. **Concurrent Edits** - Handle race conditions when user edits prompt in multiple tabs
8. **Missing Auth** - Gracefully handle unauthenticated state; redirect to login or show error

## Implementation Notes

### DO
- **Follow Supabase RLS patterns** - Every table must have RLS enabled with user-scoped policies
- **Use existing auth flow** - Leverage Supabase auth; get user from `auth.uid()` in queries
- **Reuse UI components** - Check existing components (buttons, dialogs, forms) before creating new ones
- **Index for performance** - Add indexes on `user_id`, `folder_id`, and search fields
- **Debounce search** - Use debounce hook for search input to avoid excessive queries
- **Normalize tags** - Store tags as lowercase, trim whitespace, prevent duplicates
- **Test with large data** - Create test user with 100+ prompts to verify search performance
- **Handle loading states** - Show skeletons or spinners during API calls
- **Validate input** - Check for required fields, max lengths, SQL injection prevention (via parameterized queries)
- **Use optimistic updates** - Update UI immediately, rollback on error for better UX

### DON'T
- **Don't bypass RLS** - Never use service role key in client-facing code
- **Don't store sensitive data** - Prompts are user content, not secrets, but still enforce auth
- **Don't nest folders** - Keep folder structure flat for MVP (single level)
- **Don't over-engineer tags** - Simple string array is fine; no need for separate tag table initially
- **Don't block UI** - Make all API calls async; show progress indicators
- **Don't forget error handling** - Every API call needs try/catch and user-facing error messages
- **Don't hardcode limits** - Use constants for max prompt length, max tags, etc.
- **Don't skip migrations** - Always create migration file; never alter schema directly

## Development Environment

### Start Services

```bash
# Install dependencies (first time)
npm install

# Start development server
npm run dev

# Run database migrations (if using Supabase CLI)
npx supabase db push

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

### Service URLs
- Next.js App: http://localhost:3000
- Supabase Dashboard: https://supabase.com/dashboard/project/tarohelkwuurakbxjyxm

### Required Environment Variables

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://tarohelkwuurakbxjyxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=postgresql://postgres:<password>@db.tarohelkwuurakbxjyxm.supabase.co:5432/postgres
```

## Success Criteria

The task is complete when:

1. [ ] Users can save prompts with custom names and descriptions
2. [ ] Users can organize prompts into folders
3. [ ] Users can add tags to prompts for filtering
4. [ ] Quick search finds prompts by name, content, or tags
5. [ ] One-click loads saved prompt into Shot Creator
6. [ ] No console errors during normal usage
7. [ ] All existing tests still pass
8. [ ] New functionality verified via browser testing
9. [ ] Database migrations applied successfully
10. [ ] RLS policies verified to prevent unauthorized access

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Prompt CRUD API | `tests/unit/api/prompts.test.ts` | POST creates prompt, GET retrieves user's prompts, PUT updates, DELETE removes |
| Folder API | `tests/unit/api/folders.test.ts` | Folder creation, listing, deletion; orphaned prompts handled correctly |
| Tag operations | `tests/unit/api/tags.test.ts` | Tag creation, association, filtering |
| Search logic | `tests/unit/prompts/search.test.ts` | Search matches across name, description, content, tags |
| Zustand store | `tests/unit/stores/promptStore.test.ts` | State updates correctly, async actions work, optimistic updates rollback on error |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| Save prompt workflow | Frontend ↔ API ↔ Database | Click save → dialog opens → submit → API called → DB updated → UI refreshed |
| Load prompt workflow | Frontend ↔ API ↔ Database | Click prompt card → API fetches full content → Shot Creator fields populated |
| Search integration | Frontend ↔ API ↔ Database | Type search query → API called with debounce → results filtered → UI updated |
| Folder assignment | Frontend ↔ API ↔ Database | Move prompt to folder → API updates folder_id → UI reflects change |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| First-time user | 1. Login 2. Navigate to Prompt Library 3. See empty state | Empty state UI shows with "Create your first prompt" message |
| Save and reuse prompt | 1. Open Shot Creator 2. Enter prompt 3. Click save 4. Fill name/description 5. Submit 6. Navigate to library 7. Click saved prompt | Prompt appears in library; clicking loads it back into Shot Creator |
| Organize with folders | 1. Create folder "Project A" 2. Save prompt 3. Assign to folder 4. Filter by folder | Folder tree shows folder; prompts filtered by selected folder |
| Tag-based filtering | 1. Save prompt with tags "character, hero" 2. Save another with "background, landscape" 3. Filter by "character" tag | Only prompts with matching tag shown |
| Search across fields | 1. Save prompts with varied content 2. Search for word in name 3. Search for word in content 4. Search for tag | Results update for each search; matches highlighted |

### Browser Verification (Frontend)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Prompt Library | `http://localhost:3000/prompts` | Library renders, folder tree visible, search box functional |
| Save Prompt Dialog | Triggered from Shot Creator | Dialog opens, form fields present, validation works, submit creates prompt |
| Empty State | `http://localhost:3000/prompts` (no prompts) | Friendly message, CTA to create first prompt |
| Loaded Prompt in Shot Creator | `http://localhost:3000/shot-creator` | After clicking prompt, fields auto-populate correctly |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Tables created | `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_prompts', 'prompt_folders', 'prompt_tags');` | All 3 tables exist |
| RLS enabled | `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('user_prompts', 'prompt_folders', 'prompt_tags');` | rowsecurity = true for all |
| Policies exist | `SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename IN ('user_prompts', 'prompt_folders', 'prompt_tags');` | At least SELECT, INSERT, UPDATE, DELETE policies per table |
| Indexes created | `SELECT indexname FROM pg_indexes WHERE tablename IN ('user_prompts', 'prompt_folders', 'prompt_tags');` | Indexes on user_id, folder_id, created_at |
| Sample data integrity | `INSERT INTO user_prompts (user_id, name, prompt_content) VALUES (...); SELECT * FROM user_prompts WHERE id = ...;` | Can insert and retrieve; timestamps auto-set |

### QA Sign-off Requirements

- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Browser verification complete for all components
- [ ] Database migrations applied without errors
- [ ] RLS policies verified to block unauthorized access (test with different user)
- [ ] No regressions in existing Shot Creator functionality
- [ ] Code follows established TypeScript, Next.js, and Tailwind patterns
- [ ] No console errors or warnings in browser DevTools
- [ ] Search performance acceptable with 100+ prompts (< 500ms)
- [ ] Mobile/responsive layout tested (if applicable)
- [ ] Accessibility checked (keyboard navigation, screen reader)
- [ ] Error states handled gracefully (network failure, validation errors)
- [ ] No security vulnerabilities (SQL injection prevented, RLS enforced)
