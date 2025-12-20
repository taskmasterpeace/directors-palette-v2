# Known Issues - Directors Palette v2

Last Updated: December 2024

---

## Community Items - Add to Library

### [FIXED] Added Community Items Don't Appear in UI
- **Status:** Fixed
- **Reported:** December 2024
- **Fixed:** December 2024
- **Impact:** High - Users thought the "Add" feature was broken for all item types

**Problem:**
When users clicked "Add" on community items (recipes, wildcards, directors), the UI showed success but items never appeared in their respective locations (Prompt Tools, Wildcard Manager, Music Lab).

**Root Cause:**
1. Items were only written to `user_library_items` table, not their type-specific tables
2. UI stores were never refreshed after add, so stale data was displayed

**Solution Implemented:**
1. **Dual-table writes**: `community.service.ts:addToLibrary()` now writes to BOTH `user_library_items` AND type-specific tables:
   - Recipes → `user_recipes`
   - Wildcards → `wildcards`
   - Directors → `user_directors` (new table created)

2. **Store refresh after add**: `CommunityPage.tsx:handleAdd()` now refreshes the appropriate Zustand store after successful add:
   - `useRecipeStore.getState().refreshRecipes()`
   - `useWildCardStore.getState().loadWildCards()`
   - `useDirectorStore.getState().refreshDirectors()`

3. **New Director infrastructure**:
   - Created `user_directors` table in Supabase with RLS
   - Created `director.service.ts` for CRUD operations
   - Created `director.store.ts` Zustand store for state management

**Files Modified:**
- `src/features/community/services/community.service.ts` - Added type-specific writes
- `src/features/community/components/CommunityPage.tsx` - Added store refresh calls
- `src/features/music-lab/services/director.service.ts` - NEW
- `src/features/music-lab/store/director.store.ts` - NEW

---

### Admin Recipe Edit - No Cascade Update to User Copies
- **Status:** Open
- **Reported:** December 2024
- **Impact:** Low - only affects users who added recipe before admin edit

**Description:**
When an admin edits a community recipe, the original in `community_items` is updated, but users who already added it don't see the changes (their copy in `user_recipes` is unchanged).

**Behavior:**
- Admin edits recipe in community panel
- `community_items` table is updated correctly
- Users who add the recipe AFTER edit get the new version
- Users who added BEFORE edit still have the old version

**Fix Required:**
When admin edits a recipe, also update `user_recipes` entries where `community_item_id` matches the edited item.

**Affected Files:**
- `src/app/api/admin/community/route.ts` (edit handler, lines 167-190)
- May need new SQL to cascade update user copies

---

## Other Tracked Issues

(Add more issues here as they are discovered)

---

## Issue Template

```markdown
### [SEVERITY] Issue Title
- **Status:** Open | In Progress | Fixed
- **Reported:** Month Year
- **Impact:** Description of user impact

**Description:**
What the user experiences.

**Root Cause:**
Why this happens technically.

**Fix Required:**
Steps to resolve.

**Affected Files:**
- List of files
```
