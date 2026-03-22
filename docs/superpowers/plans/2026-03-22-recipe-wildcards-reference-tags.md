# Recipe Wildcards & Reference Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline wildcard chip picker and @reference autocomplete to recipe form fields, plus community wildcard bundling.

**Architecture:** Replace current Radix Select wildcard UI with chip-based picker (random/browse). Extract shared @reference autocomplete hook from shot-creator for reuse in recipe fields. Bundle wildcards with community recipe shares.

**Tech Stack:** React 19, Zustand, Tailwind CSS v4, Next.js 15 API routes, Supabase

---

### Task 1: WildcardPickerDropdown Component

**Files:**
- Create: `src/features/shot-creator/components/recipe/WildcardPickerDropdown.tsx`

- [ ] **Step 1: Create the dropdown component**

Searchable dropdown with desktop/mobile variants. Desktop: positioned dropdown below chip. Mobile (<640px): bottom sheet with backdrop.

```tsx
// Props: entries: string[], onSelect: (entry: string) => void, onClose: () => void, anchorRef: React.RefObject<HTMLElement>
// - Search input always visible at top
// - Scrollable list, max-height 300px
// - Click entry to select
// - Click backdrop or Escape to close
// - Mobile: fixed bottom sheet with slide-up animation
```

- [ ] **Step 2: Verify it renders in isolation (dev server)**

### Task 2: WildcardPickerField Component

**Files:**
- Create: `src/features/shot-creator/components/recipe/WildcardPickerField.tsx`

- [ ] **Step 1: Create the chip field component**

Inline chip that shows "🎲 Random" or "📌 [Value]" with X to reset.

```tsx
// Props: wildcardName: string, value: string, onChange: (value: string) => void, entries: string[], isMissing: boolean
// Default state: chip shows "🎲 Random"
// Click chip → opens WildcardPickerDropdown
// On select → chip shows "📌 [Selected Value]" with X button
// X button → resets to "🎲 Random", calls onChange('')
```

- [ ] **Step 2: Verify chip renders and opens dropdown**

### Task 3: Replace Wildcard UI in RecipeFormFields

**Files:**
- Modify: `src/features/shot-creator/components/recipe/RecipeFormFields.tsx`

- [ ] **Step 1: Replace wildcard case in renderField**

Replace the entire `case 'wildcard'` block (lines 155-278) with WildcardPickerField component. Remove useState for wildcardModes and wildcardSearches. Remove Dices and List icon imports if no longer needed.

- [ ] **Step 2: Clean build and verify**

Run: `rm -rf .next && npm run build`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(recipe): replace wildcard UI with inline chip picker" && git push origin main
```

### Task 4: Shared Reference Autocomplete Hook

**Files:**
- Create: `src/shared/hooks/useReferenceAutocomplete.ts`
- Modify: `src/features/shot-creator/hooks/usePromptAutocomplete.ts` (re-export)

- [ ] **Step 1: Create shared hook**

Copy `usePromptAutocomplete.ts` logic into shared hook. Accept reference sources as parameters instead of reading from `useUnifiedGalleryStore` directly:

```tsx
// Parameters:
//   getAllReferences: () => string[]
//   getImagesByReferences: (refs: string[]) => GeneratedImage[]
// Returns same interface as usePromptAutocomplete
```

- [ ] **Step 2: Update original hook to re-export from shared**

```tsx
// src/features/shot-creator/hooks/usePromptAutocomplete.ts
// Import from shared, wire up with useUnifiedGalleryStore, re-export
```

- [ ] **Step 3: Verify build passes**

### Task 5: ReferenceAutocomplete Dropdown Component

**Files:**
- Create: `src/shared/components/ReferenceAutocomplete.tsx`

- [ ] **Step 1: Create dropdown UI component**

Dropdown with thumbnails, categories, keyboard navigation. Attaches to any text input/textarea via ref.

```tsx
// Props:
//   isOpen: boolean
//   items: AutocompleteOption[]
//   selectedIndex: number
//   onSelect: (item: AutocompleteOption) => void
//   onClose: () => void
//   onNavigate: (direction: 'up' | 'down') => void
//   anchorRef: React.RefObject<HTMLElement>
```

- [ ] **Step 2: Verify renders with sample data**

### Task 6: Wire @Reference Autocomplete into RecipeFormFields

**Files:**
- Modify: `src/features/shot-creator/components/recipe/RecipeFormFields.tsx`
- Modify: `src/features/shot-creator/store/recipe.store.ts`

- [ ] **Step 1: Add recipeReferenceImages to recipe store**

Add `recipeReferenceImages: Record<string, string>` (tag → imageUrl) to recipe store state. Add `setRecipeReferenceImage` and `clearRecipeReferenceImages` actions. Clear on setActiveRecipe.

- [ ] **Step 2: Attach autocomplete to text/textarea fields in RecipeFormFields**

For each text/textarea field, wrap with ReferenceAutocomplete. On selection: insert @tagname into field value, add image URL to store's recipeReferenceImages.

- [ ] **Step 3: Clean build**

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(recipe): add @reference autocomplete to recipe text fields" && git push origin main
```

### Task 7: Resolve @tags in Recipe Execution

**Files:**
- Modify: `src/features/shared/services/recipe-execution.service.ts`
- Modify: `src/features/shot-creator/hooks/usePromptGeneration.ts`

- [ ] **Step 1: Add @tag resolution to recipe execution**

In `executeRecipe()`, after prompts are built, scan for @tags using `parseReferenceTags()`. Accept `recipeReferenceImages: Record<string, string>` as optional param in `RecipeExecutionOptions`. Rewrite prompts with `(REF:IMG_N)` tokens and append resolved URLs to stage reference images.

- [ ] **Step 2: Pass recipeReferenceImages from usePromptGeneration**

In the recipe mode section of `handleGenerate`, read `recipeReferenceImages` from recipe store and pass to `executeRecipe()`.

- [ ] **Step 3: Update PromptActions import to use shared hook**

- [ ] **Step 4: Clean build and test**

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(recipe): resolve @tags in recipe execution with reference images" && git push origin main
```

### Task 8: Community Wildcard Bundling — Export

**Files:**
- Modify: `src/app/api/community/route.ts` (POST handler)
- Modify: `src/features/community/services/community.service.ts`

- [ ] **Step 1: Accept bundled_wildcards in community POST**

In the POST handler, accept `bundled_wildcards` from body and include in insert payload. Validate: max 10 wildcards, max 1000 entries each.

- [ ] **Step 2: Bundle wildcards in community service submitItem**

In `submitItem()`, if type is 'recipe', extract wildcard names from template stages using regex `wildcard\(([^)]+)\)`, fetch from user's wildcard store, include as `bundled_wildcards`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(community): bundle wildcards when sharing recipes" && git push origin main
```

### Task 9: Community Wildcard Bundling — Import

**Files:**
- Modify: `src/app/api/community/add/route.ts`

- [ ] **Step 1: Auto-import bundled wildcards on recipe add**

In the recipe import section of POST handler, after writing to `user_recipes`, check if community item has `bundled_wildcards`. For each: check if user has wildcard with same name, if not create it.

- [ ] **Step 2: Add missing wildcard fallback in RecipeFormFields**

Already exists — the `!wc` check renders "Wildcard not available" message. Just add a subtle note: "Add from community" or similar.

- [ ] **Step 3: Clean build and test**

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(community): auto-import bundled wildcards on recipe add" && git push origin main
```

### Task 10: Final Integration Test

- [ ] **Step 1: Manual test wildcard picker**
  - Open Shot Creator, select recipe with wildcard field
  - Verify chip shows "🎲 Random"
  - Click chip, search, select entry
  - Click X to reset
  - Test on mobile viewport

- [ ] **Step 2: Manual test @reference autocomplete**
  - Select recipe with text field
  - Type @ in text field
  - Verify dropdown appears with references
  - Select reference, verify tag inserted

- [ ] **Step 3: Full clean build**

```bash
rm -rf .next && npm run build
```
