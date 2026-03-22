# Recipe Wildcards & Reference Tags

## Problem

Recipes currently lack two key capabilities that the Shot Creator prompt textarea has:

1. **Reference tags** (`@hero`, `@villain`) — no way to attach reference images when filling out recipe form fields
2. **Wildcard control** — wildcard fields exist in recipes but the UI only supports random selection, with no way to browse and pick a specific entry for consistency

## Solution

### Feature 1: `@` Reference Autocomplete in Recipe Fields

Add the same `@` autocomplete that Shot Creator has to all recipe form text fields. When a user types `@` in any text input (e.g., `<<CHARACTER_NAME:text>>`), they see a dropdown of their session references and reference library. Selecting a reference auto-attaches the image and embeds the tag in the field value.

**Behavior:**

- User types `@` in a recipe text field → autocomplete dropdown appears
- Dropdown shows: session references (top, with thumbnails) + library references grouped by category (people, places, props, layouts, styles)
- Arrow keys navigate, Enter/Tab selects, Escape closes
- On selection: `@tagname` inserted into field value, reference image auto-attached to generation
- Multiple `@tags` across multiple fields all work — each resolved independently
- At execution time: recipe execution service collects all `@tags` from all filled field values, resolves to image URLs via unified gallery store + reference library, rewrites prompts with `(REF:IMG_N)` tokens
- Uses existing resolution pipeline from `useImageGeneration.ts` (lines 412-678)

**No recipe language or data model changes required.**

### Feature 2: Wildcard Picker UI

Upgrade the existing `<<FIELD:wildcard(name)>>` field type with an A+B combo UI: an inline chip that opens a searchable dropdown.

**Default state:**
- Inline chip displays "🎲 Random"
- Tapping/clicking opens a searchable dropdown

**Searchable dropdown (desktop):**
- Text input at top for filtering entries
- Scrollable list of all wildcard entries
- Click to select → chip updates to "📌 [Selected Value]" with X button to reset

**Mobile:**
- Dropdown renders as a bottom sheet (slides up from bottom)
- Same search + scrollable list inside the sheet
- Tap to select, swipe down to dismiss

**Reset:**
- X button on chip resets to "🎲 Random" mode
- Random mode picks a random entry at generation time (current behavior)

**Placement:**
- Each wildcard field appears inline among other recipe fields in template order
- Always defaults to Random mode — user overrides per use

### Feature 3: Community Recipe Wildcard Bundling

When recipes are shared to community, bundle referenced wildcards so recipients don't need to create them manually.

**Export (sharing a recipe):**
- Scan recipe template stages for `wildcard(name)` references
- Fetch each referenced wildcard from the author's library
- Store as `bundled_wildcards` JSONB on the community recipe record

**Import (adding a community recipe):**
- Auto-import bundled wildcards into user's library
- Skip any wildcard the user already has (matched by name)
- If import fails or wildcard missing: field falls back to plain text input with warning "Missing wildcard: `_name_`"

## Data Model Changes

### Community recipes — add column

```sql
ALTER TABLE community_recipes
ADD COLUMN bundled_wildcards JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN community_recipes.bundled_wildcards IS 'Wildcards bundled with recipe for auto-import. Array of {name, category, content, description}.';
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
  - Replace current wildcard field rendering with `WildcardPickerField`
  - Load wildcard entries from store by name
  - Pass selected value (or null for random) to field values

**`@` Reference Autocomplete:**

- Extract autocomplete logic from `PromptActions.tsx` into a shared hook: `src/shared/hooks/useReferenceAutocomplete.ts`
  - Detects `@` trigger in text input
  - Returns: suggestions, selectedIndex, handlers (onKeyUp, onKeyDown, onSelect)
  - Sources: session references (`shotCreatorReferenceImages`) + reference library
- New shared component: `src/shared/components/ReferenceAutocomplete.tsx`
  - Dropdown UI with thumbnails, categories, keyboard nav
  - Attaches to any text input via ref
- Modify: `src/features/shot-creator/components/recipe/RecipeFormFields.tsx`
  - Attach `ReferenceAutocomplete` to all text-type recipe fields
  - On selection: insert `@tagname` into field value, auto-attach reference image
- Modify: `src/features/shared/services/recipe-execution.service.ts`
  - In `buildRecipePrompts()`: after field substitution, scan all built prompts for `@tags`
  - Resolve `@tags` to image URLs using unified gallery store + reference library
  - Rewrite prompts with `(REF:IMG_N)` tokens
  - Append resolved reference images to the stage's reference image array

### Phase 2: Community Recipe Wildcard Bundling

**Export:**
- Modify: community recipe share flow
  - When user shares recipe, extract wildcard names from all stage templates
  - Fetch wildcard data from user's library via `wildcard.service.ts`
  - Store in `bundled_wildcards` column

**Import:**
- Modify: community recipe add/install flow
  - On add: read `bundled_wildcards` from community recipe
  - For each: check if user has wildcard with same name
  - If not: create via `wildcard.service.ts`
  - If yes: skip
  - If create fails: log warning, field will fall back to text input

**Fallback in RecipeFormFields:**
- If wildcard field references a name not found in user's store: render as plain text input
- Show subtle warning: "Missing wildcard: `_name_`"

### Phase 3: App-Wide `@` Autocomplete

- Attach `ReferenceAutocomplete` to prompt textareas in:
  - Storyboard shot prompt inputs
  - Storybook prompt inputs
  - Music Lab prompt inputs
  - Any other feature with prompt text inputs
- The shared hook + component from Phase 1 makes this a wiring task

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
- `@` trigger shows dropdown
- Typing after `@` filters suggestions
- Arrow keys navigate, Enter selects, Escape closes
- Selection inserts `@tagname` at correct cursor position
- Multiple `@tags` in same field all resolve
- Session references appear above library references

**Recipe Execution:**
- `@tags` in field values are collected across all fields
- Tags resolve to correct image URLs
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
4. Generate → verify reference image sent with correct `(REF:IMG_N)` token

**Community Wildcard Bundling:**
1. Create recipe with wildcard field
2. Share to community
3. Verify `bundled_wildcards` contains wildcard data
4. As different user: add community recipe
5. Verify wildcard auto-imported to library
6. Verify recipe wildcard field works with imported wildcard

**Mobile Responsive:**
1. Set viewport to mobile (375px)
2. Open recipe with wildcard field
3. Tap chip → bottom sheet opens (not dropdown)
4. Search and select → sheet closes, chip updates

### Edge Cases to Test

- Recipe with wildcard referencing deleted/nonexistent wildcard → graceful fallback
- Recipe field with both `@tag` and regular text → both handled correctly
- `@tag` referencing image not in library → warning, generation continues without that ref
- Wildcard with 500+ entries → search performance acceptable
- Multiple recipe stages all using same wildcard → same selected value used consistently
- Community recipe import when user has wildcard with same name but different content → skip, keep user's version

## Files Changed (Estimated)

### New Files
- `src/features/shot-creator/components/recipe/WildcardPickerField.tsx`
- `src/features/shot-creator/components/recipe/WildcardPickerDropdown.tsx`
- `src/shared/hooks/useReferenceAutocomplete.ts`
- `src/shared/components/ReferenceAutocomplete.tsx`
- `tests/recipe-wildcard-picker.spec.ts`
- `tests/recipe-reference-tags.spec.ts`

### Modified Files
- `src/features/shot-creator/components/recipe/RecipeFormFields.tsx` — use new wildcard picker + reference autocomplete
- `src/features/shared/services/recipe-execution.service.ts` — resolve `@tags` in recipe prompts
- `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx` — extract autocomplete logic to shared hook
- Community recipe share/add flows — bundle and import wildcards
- Supabase migration — add `bundled_wildcards` column

## Out of Scope

- Recipe author setting default wildcard mode (always Random, user decides)
- Wildcard editing from within the recipe form (manage wildcards in dedicated UI)
- Visual preview of wildcard entries (e.g., showing images for each entry)
- Nested wildcards (wildcard entries containing other wildcard references)
