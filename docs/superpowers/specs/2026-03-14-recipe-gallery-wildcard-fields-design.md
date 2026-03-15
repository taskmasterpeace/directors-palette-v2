# Recipe Gallery System + Wildcard Fields in Recipes

**Date:** 2026-03-14
**Status:** Draft

## Summary

Three connected changes to the recipe system:

1. **Recipe Gallery** — Remove all built-in recipes from Shot Creator. Recipes live in the Community tab. Users browse and add the ones they want. 3 starter recipes pre-added for new users (Battle Rap, Character Sheet, Product Shot).

2. **Wildcard field type** — New recipe field type `wildcard(name, mode)` that ties a field to a specific wildcard's entries. Two modes: **browse** (scrollable dropdown, pick exact entry) and **random** (pick a random entry). Recipe creator sets the default mode per field; end user can toggle.

3. **Guided recipe builder** — Redesigned recipe creation UX that surfaces all available building blocks (wildcards, reference images, chained stages, field types) so anyone can build a recipe without knowing template syntax.

---

## Part 1: Recipe Gallery System

### What Changes

**Before:** Shot Creator ships with ~18 built-in recipes (`SAMPLE_RECIPES` in `recipe-samples.ts`). Users see all of them immediately.

**After:**
- Shot Creator only shows recipes the user has added (starts with 3 starters)
- All ~18 former built-in recipes become community items in the Community tab (seeded as "official" recipes with a badge)
- Users browse Community → click "Add to Shot Creator" → recipe appears in their list
- Users can remove recipes from their Shot Creator (doesn't delete from Community)
- Recipe builder moves to Community tab (create → optionally share)

### 3 Starter Recipes

New users get these pre-added on first visit:
1. **Battle Rap** — The anchor recipe, updated with wildcard fields
2. **Character Sheet** — Most versatile character creation recipe
3. **Product Photography** — General purpose product shots

These are added via the existing `initializeSystemRecipes()` flow but limited to just these 3 instead of all 18.

### Migration Path

1. Seed all current `SAMPLE_RECIPES` as `community_items` with `type: 'recipe'`, `status: 'approved'`, `isFeatured: false`
2. Add `isOfficial: boolean` column to `community_items` table. Mark the seeded recipes as `isOfficial: true` to distinguish platform recipes from user submissions. The 3 starters also get a `starterRecipe: true` tag in their `tags` array.
3. Delete `recipe-samples.ts` (3,250 lines) — recipes now live in the database
4. Users who already have recipes keep them (no data loss, `user_recipes` table untouched)
5. For existing users who already had system recipes initialized: their `user_recipes` rows remain. They can remove unwanted ones manually. No automatic cleanup.

### "Add to Shot Creator" Flow

When a user clicks "Add to Shot Creator" on a community recipe:
1. The existing `/api/community/add` route copies the recipe into the `user_recipes` table (this already works — the route does an upsert by name)
2. Reference images are copied to the user's storage path via the existing image copy API
3. The recipe store refreshes to pick up the new recipe
4. A `user_library_items` row is created to track the link (for "Added" badge in Community)

When a user removes a recipe from Shot Creator:
1. Delete the row from `user_recipes`
2. Remove from `user_library_items`
3. Remove from `user_recipe_quick_access` if it was in the quick access bar
4. Community item and its add count are untouched (add count is historical, not decremented)

### Community Tab Changes

- Recipe cards show: name, description, category, stage count, whether it uses wildcards, add count
- "Added" badge on recipes already in user's Shot Creator (via `user_library_items` lookup)
- "Official" badge on platform-provided recipes (`isOfficial: true`)
- Filter by category: character-sheets, style-guides, storyboards, product, portraits, action, time-based (existing `RECIPE_CATEGORIES`)
- "Create Recipe" button opens the guided builder (see Part 3)
- Recipe approval: admin-only approval. Submitter sees status (pending/approved/rejected) in their Community submissions. Existing approval infrastructure is reused as-is.

---

## Part 2: Wildcard Field Type in Recipes

### Wildcard Ownership & Resolution

All wildcards referenced by recipes must be **shared wildcards** (`is_shared: true`). The wildcard store already loads shared wildcards via `loadWildCards()`. When resolving a wildcard field:

1. Look up the wildcard by `name` in the loaded store (which includes all shared wildcards)
2. If not found (wildcard was deleted or renamed), show a warning: "Wildcard '[name]' not available" with the field rendered as a disabled text input
3. No dependency tracking needed — wildcards are global shared resources managed centrally. Deletion of a shared wildcard is an admin action and is rare.

### New Field Type: `wildcard`

Current field types: `name`, `text`, `select`

New type: `wildcard` — links a recipe field to a specific wildcard's entries.

#### Schema

```typescript
interface RecipeField {
  id: string
  label: string
  type: 'name' | 'text' | 'select' | 'wildcard'  // add 'wildcard'
  placeholder?: string
  required?: boolean
  options?: string[]           // for 'select' type
  wildcardName?: string        // for 'wildcard' type — which wildcard to pull from
  wildcardMode?: 'browse' | 'random'  // default mode set by recipe creator
}
```

#### Template Syntax

In recipe stage templates, wildcard fields use:

```
<<LOCATION:wildcard(settingsbattlerap, browse)>>
<<ACTION_A:wildcard(actions_confident, random)>>
<<OUTFIT:wildcard(blkmen_fullbody, browse)>>
```

#### Parser Update

`parseStageTemplate()` in `recipe-utils.ts` currently handles `name`, `text`, `select(...)`. Add a new branch:

```typescript
// Match wildcard(name, mode) — name is lowercase with underscores, mode is browse|random
const wildcardMatch = typeSpec.match(/^wildcard\(([a-z0-9_]+),\s*(browse|random)\)$/)
if (wildcardMatch) {
  return {
    id, label,
    type: 'wildcard',
    wildcardName: wildcardMatch[1],
    wildcardMode: wildcardMatch[2] as 'browse' | 'random',
  }
}
```

#### UI Rendering

When `RecipeFormFields` renders a wildcard field:

**Browse mode:**
- Searchable dropdown showing all entries from the wildcard
- Entries displayed as readable text (the full line from the wildcard content)
- Search/filter box at top of dropdown
- Toggle button (dice icon) to switch to random mode
- Loading spinner while wildcard data loads; error message if wildcard not found

**Random mode:**
- Shows "Random [wildcard label]" with a dice/shuffle icon
- Click dice to re-roll and preview the selected entry inline
- The previewed value IS the value used at generation time (locked in, not re-rolled)
- Toggle button to switch to browse mode

**The recipe creator sets the default mode. The end user can toggle between modes.**

#### How Values Are Interpolated

`buildStagePrompt()` is a pure function. To support wildcard fields, the caller passes a `wildcardMap: Record<string, string[]>` parameter containing pre-loaded wildcard entries keyed by wildcard name.

When `buildActivePrompts()` runs in the store:
1. Collect all `wildcardName` values from the active recipe's fields
2. Load their entries from the wildcard store
3. Pass the map to `buildStagePrompt()`

Within `buildStagePrompt()`:
- **Browse mode with selection**: Insert the selected entry text directly (value already in `fieldValues`)
- **Random mode**: If `fieldValues` contains a value (from re-roll preview), use it. Otherwise pick a random entry from `wildcardMap[wildcardName]`
- **Wildcard not in map**: Leave placeholder with warning comment

### Battle Rap Recipe Update

Updated with wildcard fields:

| Field | Current Type | New Type | Wildcard Source |
|---|---|---|---|
| Camera Angle | `select` | `select` (unchanged) | — |
| Person A | `name` | `name` (unchanged) | — |
| Person A Action | `select` (5 options) | `wildcard(actions_confident, browse)` | 10 confident poses |
| Person B | `name` | `name` (unchanged) | — |
| Person B Action | `select` (5 options) | `wildcard(actions_expressive, browse)` | 10 expressive poses |
| Location | `select` (10 options) | `wildcard(settingsbattlerap, browse)` | 43 venues |
| Custom Location | `text` | removed (covered by wildcard browse) | — |
| Lighting Style | `select` | `select` (unchanged) | — |

New fields added:
| Field | Type | Wildcard Source |
|---|---|---|
| Person A Outfit | `wildcard(blkmen_fullbody, browse)` | 50 outfit descriptions |
| Person A Hair | `wildcard(blkmen_hair, browse)` | 80 hairstyles |
| Person B Outfit | `wildcard(blkmen_fullbody, browse)` | 50 outfit descriptions |
| Person B Hair | `wildcard(blkmen_hair, browse)` | 80 hairstyles |

### Wildcard Autocomplete in Text Fields

The existing `_wildcard_` autocomplete (from `useWildcardAutocomplete` hook) also works in recipe text fields. So recipe creators and users can type `_` in any free-text field to insert wildcards inline. This is independent of the wildcard field type — it's for ad-hoc wildcard usage in prompts.

---

## Part 3: Guided Recipe Builder

### Goal

Make recipe creation accessible to anyone. Surface all building blocks so users don't need to know template syntax.

### Builder Flow

**Step 1: Basics**
- Recipe name, description, category (dropdown from existing `RECIPE_CATEGORIES`)
- Suggested aspect ratio (dropdown)

**Step 2: Build Stages**

Each stage has a visual editor showing:

1. **Prompt template** — Rich text area with inline helpers:
   - Type `_` → wildcard autocomplete (inserts `_name_` for random inline usage)
   - Type `@` → reference image autocomplete
   - Toolbar buttons for inserting fields (see below)

2. **Field palette** — Sidebar/panel showing all available field types:
   - **Text field** — Free-form user input (`<<FIELD_NAME:text>>`)
   - **Select field** — Multiple choice, add options inline (`<<FIELD:select(opt1, opt2)>>`)
   - **Wildcard field** — Browse all wildcards by category, pick one, set mode (browse/random)
   - **Character reference** — `@character` tag field (`<<CHARACTER:name>>`)

3. **Wildcard browser** — When adding a wildcard field:
   - Shows all shared wildcards grouped by category (hair, outfits, accessories, footwear, actions, settings, training_data)
   - Preview: click a wildcard to see 5 sample entries from its content
   - Pick one → set field label → set default mode (browse/random) → template placeholder inserted automatically
   - User does NOT need to type `<<FIELD:wildcard(name, mode)>>` — the builder generates it

4. **Reference images** — Upload images that auto-attach when recipe is used
   - Drag & drop or file picker
   - Images stored in Supabase Storage at `recipe-images/{recipeId}/`
   - When a community recipe with reference images is added to Shot Creator, images are copied to the user's storage path (existing behavior via `/api/recipes/{id}/copy-images`)

5. **Stage chaining** — Visual pipeline: Stage 1 → Stage 2 → Stage 3
   - Add stage button with explanation: "Chain another generation. Output from previous stage feeds into the next."
   - Reorder stages via up/down buttons
   - Each stage can be 'generation' or 'tool' type

**Step 3: Preview & Test**
- Live preview showing how the recipe form will look to end users
- All fields rendered with their actual UI (dropdowns, wildcard browsers, text inputs)
- "Test with sample values" button:
  - Text fields: filled with placeholder text
  - Select fields: first option selected
  - Wildcard fields: random entry picked from the wildcard
  - Name fields: "[Character Name]" placeholder
- Shows the interpolated prompt output below the form
- If a wildcard fails to load, shows "[Wildcard unavailable]" in the preview

**Step 4: Save & Share**
- Save to your Shot Creator (always — saves to `user_recipes`)
- Optionally share to Community (creates `community_items` row with `status: 'pending'`)
- Admin approves/rejects submissions (existing flow)

### What the User Sees

The builder replaces the current recipe creation dialog. Key differences:

| Current Builder | New Builder |
|---|---|
| Raw template textarea | Visual field palette + inline insertion |
| Must know `<<FIELD:type>>` syntax | Click to add fields from palette |
| No wildcard integration | Browse & pick wildcards by category |
| No preview | Live form preview with test values |
| Hidden in Shot Creator | Prominent in Community tab |

### Field Palette UI

A collapsible panel showing available building blocks:

```
Available Fields
├── Text Input          "Add a free-form text field"
├── Multiple Choice     "Add a dropdown with custom options"
├── Wildcard            "Connect to a wildcard list"
│   ├── actions (4)     relaxed, confident, active, expressive
│   ├── hair (4)        blkmen_hair, blkmanhaircut, blkwomen_hair, blkwomanhair
│   ├── outfits (6)     blkmen_fullbody, blkmen_waistup, ...
│   ├── accessories (4) blkmen_accessories, blkwomen_accessories, ...
│   ├── footwear (8)    blkmen_footwear, blkmen_sneakers, ...
│   ├── settings (3)    settings_indoor, settings_outdoor, settingsbattlerap
│   └── training_data   trainingdata, trainingdata_locations_*, ...
├── Character Reference "Link a character from your library"
└── Reference Image     "Attach an image to this stage"
```

Clicking a wildcard opens a preview of its entries and lets you set the label + mode.

### Mobile Considerations

The guided builder is desktop-first. On mobile:
- Field palette renders as a bottom sheet instead of sidebar
- Wildcard browser is full-screen modal
- Stage pipeline is vertical stack (already works)
- Preview mode is available but simplified (no side-by-side)

---

## Part 4: New Recipe Proposals

Recipes that leverage wildcards heavily, seeded as community items.

### Gender/Style Selection

Recipes that use gendered wildcards (blkmen_*, blkwomen_*) include a **Style Variant** select field at the top:

```
<<STYLE_VARIANT:select(Men's, Women's)>>
```

The prompt template uses conditional logic: the wildcard field names include the variant prefix. For implementation simplicity, we create **two versions** of each gendered recipe (e.g., "Street Style Lookbook (Men)" and "Street Style Lookbook (Women)") rather than adding conditional logic to the template engine.

### 1. Street Style Lookbook (Men / Women)
- **Category:** character-sheets
- **Stages:** 1 (9-frame grid)
- **Wildcard fields:**
  - Outfit: `wildcard(blkmen_fullbody, random)` — 50 entries
  - Hair: `wildcard(blkmen_hair, random)` — 80 entries
  - Sneakers: `wildcard(blkmen_sneakers_color, random)` — 61 entries
  - Accessories: `wildcard(blkmen_accessories, random)` — 60 entries
- **Concept:** 9 frames of the same character in different street outfits. Each frame pulls random wildcard entries for variety.

### 2. Fashion Editorial (Women)
- **Category:** portraits
- **Stages:** 1
- **Wildcard fields:**
  - Dress Code: `wildcard(blkwomendresscode, browse)` — 30 entries
  - Accessories: `wildcard(blkwomen_accessories, browse)` — 60 entries
  - Hair: `wildcard(blkwomen_hair, browse)` — 80 entries
  - Handbags: `wildcard(blkwomen_handbags, browse)` — 50 entries
- **Concept:** Single character, high-fashion editorial magazine style. User picks specific looks.

### 3. Sneaker Showcase (Men / Women)
- **Category:** product
- **Stages:** 1
- **Wildcard fields:**
  - Sneakers: `wildcard(blkmen_sneakers_color, browse)` — 61 entries
- **Concept:** 9-frame grid focused on footwear from different angles and lighting.

### 4. Location Scouting Sheet
- **Category:** storyboards
- **Stages:** 1
- **Wildcard fields:**
  - Indoor: `wildcard(settings_indoor, random)` — 50 entries
  - Outdoor: `wildcard(settings_outdoor, random)` — 50 entries
- **Concept:** 9 different locations for a scene. Mix indoor and outdoor venues.

### 5. Action Sequence (Men / Women)
- **Category:** action
- **Stages:** 1
- **Wildcard fields:**
  - Action: `wildcard(actions_active, browse)` — 10 entries
  - Location: `wildcard(settingsbattlerap, browse)` — 43 entries
  - Outfit: `wildcard(blkmen_fullbody, browse)` — 50 entries
- **Concept:** Character performing a sequence of actions across frames.

---

## Non-Goals

- No review/rating system changes (existing 1-5 stars stays as-is)
- No recipe versioning (edit overwrites)
- No collaborative recipe editing
- No wildcard creation from inside the recipe builder (use Wildcards tab for that)
- No drag-and-drop field reordering in the builder (up/down buttons instead)
- No conditional template logic (gendered recipes are separate versions instead)
- No wildcard entry pagination (wildcards max ~120 entries, fits in a scrollable dropdown)

## Database Changes

### New column on `community_items`

```sql
ALTER TABLE community_items ADD COLUMN is_official boolean DEFAULT false;
```

Mark platform-provided recipes as official. Existing `isFeatured` remains separate (for spotlight placement).

### No changes to `user_recipes`

Wildcard field info is stored in the stage template string and parsed at runtime by `parseStageTemplate()`.

### Migration: Seed community recipes

Script to run once:
1. Convert each `SAMPLE_RECIPES` entry to a `community_items` row with `type: 'recipe'`, `status: 'approved'`, `isOfficial: true`
2. Tag the 3 starter recipes with `starterRecipe` in their tags array
3. Add the new wildcard-heavy recipes as community items with `isOfficial: true`

### Template parsing update

`parseStageTemplate()` in `recipe-utils.ts` needs to handle the new `wildcard(name, mode)` syntax in addition to existing `name`, `text`, `select(options)`.

## Testing

- Playwright: Browse community recipes, add one to Shot Creator, verify it appears
- Playwright: Use a wildcard field in browse mode, verify dropdown shows entries
- Playwright: Toggle wildcard field to random mode, verify random entry selected
- Playwright: Create a recipe in the guided builder, add a wildcard field, save
- Playwright: Verify 3 starter recipes present for new user
- Playwright: Remove a recipe from Shot Creator, verify it's gone but still in Community
- Playwright: Verify "Official" badge on platform recipes
- Playwright: Verify wildcard field shows warning when wildcard not found
- Playwright: Quick access bar updates when recipe is removed
