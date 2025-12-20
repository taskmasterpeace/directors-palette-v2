# Known Issues - Directors Palette v2

Last Updated: December 2024

---

## Community Recipes

### [CRITICAL] Added Community Recipes Don't Appear in Prompt Tools
- **Status:** Open
- **Reported:** December 2024
- **Impact:** High - Users think the "Add" feature is broken

**Description:**
When a user clicks "Add" on a community recipe, the UI shows success (toast + "Added" badge), but the recipe never appears in the Prompt Tools > Recipes tab.

**Root Cause:**
The Recipe Store (`useRecipeStore`) is not refreshed after adding a recipe via community. The data is written to `user_recipes` table but the store still has stale data.

**Technical Details:**
- `community.service.ts:addToLibrary()` writes to `user_recipes` correctly (lines 285-322)
- `community.store.ts:addToLibrary()` updates `libraryItemIds` but doesn't refresh recipe store (lines 88-110)
- `RecipeBuilder` reads from `useRecipeStore.recipes` which is never invalidated

**Fix Required:**
1. Import `useRecipeStore` in community store/actions
2. Call `useRecipeStore.getState().fetchRecipes()` after successful add
3. Or trigger a store invalidation that causes refetch on next visit

**Affected Files:**
- `src/features/community/store/community.store.ts`
- `src/features/shot-creator/hooks/useRecipeStore.ts`

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
