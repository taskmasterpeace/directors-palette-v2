# Recipe Wildcards & Reference Tags

## Problem

Recipes currently lack two key capabilities that the Shot Creator prompt textarea has:

1. **Reference tags** (`@hero`, `@villain`) — no way to attach reference images when filling out recipe form fields
2. **Wildcard control** — wildcard fields exist in recipes with a browse/random toggle and Radix Select dropdown, but the UX is clunky — no inline chip, no mobile bottom sheet, no visual indication of mode at a glance

## Solution

### Feature 1: `@` Reference Autocomplete in Recipe Fields

Add the same `@` autocomplete that Shot Creator has to all recipe form text/textarea fields. When a user types `@` in any input (e.g., `<<CHARACTER_NAME:text>>`), they see a dropdown of their session references and reference library. Selecting a reference auto-attaches the image and embeds the tag in the field value.

**Behavior:**

- User types `@` in a recipe text field → autocomplete dropdown appears
- Dropdown shows: session references (top, with thumbnails) + library references grouped by category (people, places, props, layouts, styles)
- Arrow keys navigate, Enter/Tab selects, Escape closes
- On selection: `@tagname` inserted into field value, reference image auto-attached to generation
- Multiple `@tags` across multiple fields all work — each resolved independently
- Works in both single-line text inputs and multi-line textarea fields (dropdown anchored to cursor position)

**Reference image data flow (client → server):**

1. **Client side (RecipeFormFields.tsx):** When user selects `@hero` from autocomplete, the tag goes into the field value AND the matching image URL is collected into a `recipeReferenceImages` array stored in the recipe Zustand store
2. **At execution time (usePromptGeneration.ts):** Before calling `executeRecipe()`, collect all reference image URLs from `recipeReferenceImages` and pass them as part of `RecipeExecutionOptions.stageReferenceImages`
3. **In recipe-execution.service.ts:** After `buildRecipePrompts()` substitutes field values into templates, scan the resulting prompts for `@tags` using `parseReferenceTags()`. Rewrite prompts with `(REF:IMG_N)` tokens where N maps to the index in the combined reference images array. The reference image URLs are already HTTPS (resolved client-side) so they pass straight through to the generation API

**No recipe language or data model changes required.**

### Feature 2: Wildcard Picker UI

Upgrade the existing wildcard field UI in `RecipeFormFields.tsx` (currently a Radix Select + browse/random toggle button) with an A+B combo: an inline chip that opens a searchable dropdown.

**Current state (being replaced):**
- Radix `<Select>` with browse/random mode toggle icon button
- Search appears only when 15+ entries
- Random mode shows dice container with re-roll on click

**New state:**

**Default:** Inline chip displays "🎲 Random" — tapping/clicking opens a searchable dropdown

**Searchable dropdown (desktop):**
- Text input at top for filtering entries (always visible, no 15-entry threshold)
- Scrollable list of all wildcard entries
- Click to select → chip updates to "📌 [Selected Value]" with X button to reset

**Mobile (< 640px):**
- Dropdown renders as a bottom sheet (slides up from bottom, with backdrop)
- Same search + scrollable list inside the sheet
- Tap to select, swipe down or tap backdrop to dismiss

**Reset:** X button on chip resets to "🎲 Random" mode. Random mode picks a random entry at generation time (current behavior preserved).

**Placement:** Each wildcard field appears inline among other recipe fields in template order. Always defaults to Random mode — user overrides per use.

**Multi-stage consistency:** If multiple stages reference the same wildcard field name (e.g., both have `<<HAIR:wildcard(hairstyles)>>`), the field is deduplicated — user picks once, same value used in all stages. This is existing behavior (fields are deduplicated by name in `getAllFields()`) and is preserved.

### Feature 3: Community Recipe Wildcard Bundling

When recipes are shared to community, bundle referenced wildcards so recipients don't need to create them manually.

**Export (sharing a recipe):**
- Scan recipe template stages for `wildcard(name)` references
- Fetch each referenced wildcard from the author's library
- Store as `bundled_wildcards` JSONB on the community item record
- **Size limit:** Max 10 bundled wildcards per recipe, max 1000 entries per wildcard

**Import (adding a community recipe):**
- Auto-import bundled wildcards into user's library
- Skip any wildcard the user already has (matched by name)
- If import fails or wildcard missing: field falls back to plain text input with warning "Missing wildcard: `_name_`"

## Data Model Changes

### `community_items` table — add column

```sql
ALTER TABLE community_items
ADD COLUMN bundled_wildcards JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN community_items.bundled_wildcards IS 'Wildcards bundled with recipe for auto-import. Array of {name, category, content, description}. Max 10 wildcards, 1000 entries each.';
```

**Schema for `bundled_wildcards` array entries:**

```typescript
interface BundledWildcard {
  name: string        // Wildcard name (e.g., "black_girl_hairstyles")
  category: string    // Category (e.g., "hairstyles")
  content: string     // Newline-separated entries
  description: string // Optional description
}
```

### No changes to `user_recipes` or `wildcards` tables

Wildcard references are already embedded in recipe template syntax (`<<FIELD:wildcard(name)>>`). The recipe data model does not change.

## Implementation

### Phase 1: Wildcard Picker UI + `@` Autocomplete in Shot Creator Recipes

**Wildcard Picker Component:**

- New component: `src/features/shot-creator/components/recipe/WildcardPickerField.tsx`
  - Renders inline chip (🎲 Random / 📌 Value)
  - On tap: opens `WildcardPickerDropdown`
  - Props: `wildcardName`, `value`, `onChange`, `onReset`
- New component: `src/features/shot-creator/components/recipe/WildcardPickerDropdown.tsx`
  - Search input + scrollable entry list
  - Desktop: positioned dropdown below chip
  - Mobile (< 640px): bottom sheet with backdrop
  - Props: `entries: string[]`, `onSelect`, `onClose`, `searchQuery`
- Modify: `src/features/shot-creator/components/recipe/RecipeFormFields.tsx`
  - Replace current wildcard field rendering (Radix Select + toggle) with `WildcardPickerField`
  - Load wildcard entries from store by name
  - Pass selected value (or null for random) to field values

**`@` Reference Autocomplete:**

- Move existing hook from `src/features/shot-creator/hooks/usePromptAutocomplete.ts` to `src/shared/hooks/useReferenceAutocomplete.ts`
  - Decouple from shot-creator-specific store imports
  - Accept reference sources (session images, library) as parameters instead of reading from `useUnifiedGalleryStore` directly
  - Keep same return interface: `isOpen`, `query`, `items`, `selectedIndex`, `handleTextChange`, `insertItem`, `detectTrigger`, etc.
- New shared component: `src/shared/components/ReferenceAutocomplete.tsx`
  - Dropdown UI with thumbnails, categories, keyboard nav
  - Attaches to any text input or textarea via ref
  - Handles cursor positioning for both single-line and multi-line inputs
- Modify: `src/features/shot-creator/components/recipe/RecipeFormFields.tsx`
  - Attach `ReferenceAutocomplete` to all text/textarea-type recipe fields
  - On selection: insert `@tagname` into field value, add image URL to `recipeReferenceImages` in recipe store
- Modify: `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx`
  - Update import to use new shared hook location
- Modify: `src/features/shared/services/recipe-execution.service.ts`
  - In `buildRecipePrompts()`: after field substitution, scan all built prompts for `@tags` using `parseReferenceTags()`
  - Accept reference image URLs as parameter (passed from client)
  - Rewrite prompts with `(REF:IMG_N)` tokens
  - Append resolved reference images to the stage's reference image array
- Coexistence with wildcard autocomplete: both `@` (reference) and `_` (wildcard) triggers can be active on the same field. They use different trigger characters and don't conflict. Only one dropdown shows at a time.

### Phase 2: Community Recipe Wildcard Bundling

**Export:**
- Modify: `src/features/community/services/community.service.ts` (`submitItem` method)
  - When submitting a recipe, extract wildcard names from all stage templates using regex for `wildcard\(([^)]+)\)`
  - Fetch wildcard data from user's library via `wildcard.service.ts`
  - Include as `bundled_wildcards` in the community item payload
  - Enforce limits: max 10 wildcards, max 1000 entries per wildcard
- Modify: `src/app/api/community/route.ts` (POST handler)
  - Accept and validate `bundled_wildcards` field

**Import:**
- Modify: `src/features/community/services/community.service.ts` (`addToLibrary` method)
  - After writing recipe to `user_recipes`, read `bundled_wildcards` from community item
  - For each: check if user has wildcard with same name via `wildcard.service.ts`
  - If not: create via `wildcard.service.ts`
  - If yes: skip
  - If create fails: log warning, continue (field will fall back to text input)
- Modify: `src/app/api/community/add/route.ts` (POST handler)
  - Pass bundled_wildcards through to service

**Fallback in RecipeFormFields:**
- If wildcard field references a name not found in user's store: render as plain text input
- Show subtle warning: "Missing wildcard: `_name_`"

### Phase 3: App-Wide `@` Autocomplete

Phase 3 requires its own mini-spec once Phase 1 is validated. At a high level:
- Attach `ReferenceAutocomplete` to prompt textareas across features
- Each feature has different prompt input architecture:
  - **Storyboard:** per-shot prompt inputs in shot list (`src/features/storyboard/components/`)
  - **Storybook:** page prompt inputs (`src/features/storybook/components/`)
  - **Music Lab:** treatment prompt inputs (`src/features/music-lab/components/`)
- The shared hook + component from Phase 1 makes this primarily a wiring task, but each feature may need its own reference image accumulation strategy
- Scope and file list to be defined in Phase 3 mini-spec

## Testing

### Unit Tests

**Wildcard Picker:**
- `WildcardPickerField` renders "🎲 Random" chip by default
- Clicking chip opens dropdown
- Search filters entries correctly (case-insensitive, partial match)
- Selecting entry updates chip to "📌 [Value]"
- X button resets to Random
- Empty wildcard (0 entries) shows disabled state
- Missing wildcard shows fallback text input with warning

**Reference Autocomplete:**
- `@` trigger shows dropdown in text input
- `@` trigger shows dropdown in textarea (multi-line)
- Typing after `@` filters suggestions
- Arrow keys navigate, Enter selects, Escape closes
- Selection inserts `@tagname` at correct cursor position
- Multiple `@tags` in same field all resolve
- Session references appear above library references
- Both `@` and `_` autocomplete coexist on same field without conflict

**Recipe Execution:**
- `@tags` in field values are collected across all fields
- Tags resolve to correct image URLs via passed reference image array
- Prompts rewritten with correct `(REF:IMG_N)` indices
- Missing `@tags` produce warning but don't break execution
- Wildcard fields in Random mode pick random entry
- Wildcard fields in Pick mode use selected value
- Mixed random + pick fields in same recipe work correctly

### Integration Tests (Playwright)

**Wildcard Picker Flow:**
1. Open Shot Creator → select recipe with wildcard field
2. Verify chip shows "🎲 Random"
3. Click chip → dropdown opens with entries
4. Type search text → entries filter
5. Select entry → chip updates
6. Click X → resets to Random
7. Generate → verify correct value used in prompt

**Reference Autocomplete in Recipe:**
1. Open Shot Creator → select recipe with text field
2. Type `@` in text field → dropdown appears
3. Select reference → `@tagname` inserted, image attached
4. Type more text + another `@` → second reference works
5. Generate → verify reference images sent with correct `(REF:IMG_N)` tokens

**Community Wildcard Bundling:**
1. Create recipe with wildcard field
2. Share to community
3. Verify `bundled_wildcards` contains wildcard data
4. As different user: add community recipe
5. Verify wildcard auto-imported to library
6. Verify recipe wildcard field works with imported wildcard
7. Test with existing wildcard (same name) → verify user's version kept

**Mobile Responsive:**
1. Set viewport to mobile (375px)
2. Open recipe with wildcard field
3. Tap chip → bottom sheet opens (not dropdown)
4. Search and select → sheet closes, chip updates

### Edge Cases to Test

- Recipe with wildcard referencing deleted/nonexistent wildcard → graceful fallback to text input
- Recipe field with both `@tag` and regular text → both handled correctly
- `@tag` referencing image not in library → warning, generation continues without that ref
- Wildcard with 500+ entries → search performance acceptable
- Multiple recipe stages all using same wildcard field name → same selected value used consistently (deduplication)
- Community recipe import when user has wildcard with same name but different content → skip, keep user's version
- Community recipe with >10 bundled wildcards → rejected at share time with error message
- `@` autocomplete in textarea field → dropdown positioned near cursor, not at field edge
- Both `@` and `_` typed in sequence in same field → correct autocomplete triggers for each

## Files Changed (Estimated)

### New Files
- `src/features/shot-creator/components/recipe/WildcardPickerField.tsx`
- `src/features/shot-creator/components/recipe/WildcardPickerDropdown.tsx`
- `src/shared/hooks/useReferenceAutocomplete.ts` (moved + refactored from `shot-creator/hooks/usePromptAutocomplete.ts`)
- `src/shared/components/ReferenceAutocomplete.tsx`
- `tests/recipe-wildcard-picker.spec.ts`
- `tests/recipe-reference-tags.spec.ts`

### Modified Files
- `src/features/shot-creator/components/recipe/RecipeFormFields.tsx` — replace wildcard UI with chip picker, add reference autocomplete
- `src/features/shared/services/recipe-execution.service.ts` — resolve `@tags` in built recipe prompts
- `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx` — update import to shared hook
- `src/features/shot-creator/hooks/usePromptAutocomplete.ts` — deprecate, re-export from shared
- `src/features/shot-creator/store/recipe.store.ts` — add `recipeReferenceImages` state
- `src/features/community/services/community.service.ts` — bundle wildcards on share, import on add
- `src/app/api/community/route.ts` — accept `bundled_wildcards` on POST
- `src/app/api/community/add/route.ts` — pass bundled wildcards through to service
- Supabase migration — add `bundled_wildcards` column to `community_items`

## Out of Scope

- Recipe author setting default wildcard mode (always Random, user decides)
- Wildcard editing from within the recipe form (manage wildcards in dedicated UI)
- Visual preview of wildcard entries (e.g., showing images for each entry)
- Nested wildcards (wildcard entries containing other wildcard references)
- Phase 3 detailed file list (to be defined in Phase 3 mini-spec)
