# Recipe Gallery + Wildcard Fields Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove built-in recipes from Shot Creator, move them to the Community gallery, add a `wildcard` field type to recipes for browse/random entry selection, and build a guided recipe builder.

**Architecture:** Recipes move from hardcoded `SAMPLE_RECIPES` constant to `community_items` table. A new `wildcard` field type in `RecipeField` links recipe fields to wildcard entries with browse/random modes. The recipe builder in Community surfaces all available building blocks (wildcards, reference images, stages, field types) so anyone can create recipes.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Supabase, Tailwind CSS v4, Radix UI

---

## Chunk 1: Wildcard Field Type (Types + Parser + Prompt Builder)

### Task 1: Add `wildcard` to RecipeFieldType

**Files:**
- Modify: `src/features/shot-creator/types/recipe-field.types.ts:7-18`

- [ ] **Step 1: Update RecipeFieldType and RecipeField interface**

In `src/features/shot-creator/types/recipe-field.types.ts`, add `'wildcard'` to the union type and add optional wildcard-specific properties:

```typescript
// Field types for recipe forms
export type RecipeFieldType = 'name' | 'text' | 'select' | 'wildcard';

// A single field definition parsed from the recipe template
export interface RecipeField {
  id: string;
  name: string;
  label: string;
  type: RecipeFieldType;
  required: boolean;
  options?: string[];
  placeholder: string;
  wildcardName?: string;              // For 'wildcard' type — which wildcard to pull entries from
  wildcardMode?: 'browse' | 'random'; // Default mode set by recipe creator
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No new errors (existing code doesn't reference `wildcardName`/`wildcardMode` yet)

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/types/recipe-field.types.ts
git commit -m "feat(recipes): add wildcard field type to RecipeFieldType"
```

---

### Task 2: Update parseStageTemplate to handle wildcard syntax

**Files:**
- Modify: `src/features/shot-creator/types/recipe-utils.ts:27-79`

- [ ] **Step 1: Add wildcard parsing branch**

In `parseStageTemplate()`, after the `select(` branch (line 48-53), add:

```typescript
    } else if (cleanTypeSpec.startsWith('wildcard(')) {
      type = 'wildcard' as RecipeFieldType;
      const wildcardMatch = cleanTypeSpec.match(/^wildcard\(([a-z0-9_]+),\s*(browse|random)\)$/);
      if (wildcardMatch) {
        wildcardName = wildcardMatch[1];
        wildcardMode = wildcardMatch[2] as 'browse' | 'random';
      }
    }
```

Also declare `wildcardName` and `wildcardMode` variables at the top of the while loop body (alongside `type` and `options`):

```typescript
    let wildcardName: string | undefined;
    let wildcardMode: 'browse' | 'random' | undefined;
```

And include them in the pushed field:

```typescript
    fields.push({
      id: `stage${stageIndex}_field${fieldIndex}_${name.toLowerCase()}`,
      name,
      label,
      type,
      required,
      options,
      placeholder,
      wildcardName,
      wildcardMode,
    });
```

- [ ] **Step 2: Verify parsing works with a quick test**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/types/recipe-utils.ts
git commit -m "feat(recipes): parse wildcard(name, mode) syntax in stage templates"
```

---

### Task 3: Update buildStagePrompt to resolve wildcard values

**Files:**
- Modify: `src/features/shot-creator/types/recipe-utils.ts:134-194`
- Modify: `src/features/shot-creator/types/recipe-utils.ts:210-235` (buildRecipePrompts)
- Modify: `src/features/shot-creator/store/recipe.store.ts:579-583` (buildActivePrompts)

- [ ] **Step 1: Add wildcardEntries parameter to buildStagePrompt**

Update the function signature to accept an optional `wildcardEntries` map:

```typescript
export function buildStagePrompt(
  template: string,
  fields: RecipeField[],
  values: RecipeFieldValues,
  allUniqueFields?: RecipeField[],
  wildcardEntries?: Record<string, string[]>
): string {
```

In the replacement function (line 165), add wildcard handling:

```typescript
  result = result.replace(fieldRegex, (_match, name, typeSpec) => {
    const fieldData = valueByName.get(name);
    const value = fieldData?.value || '';
    const isRequired = typeSpec.endsWith('!');

    // Handle wildcard fields in random mode with no pre-selected value
    if (!value && typeSpec.replace(/!$/, '').startsWith('wildcard(') && wildcardEntries) {
      const wcMatch = typeSpec.replace(/!$/, '').match(/^wildcard\(([a-z0-9_]+),\s*(browse|random)\)$/);
      if (wcMatch) {
        const wcName = wcMatch[1];
        const entries = wildcardEntries[wcName];
        if (entries && entries.length > 0) {
          // Pick a random entry
          return entries[Math.floor(Math.random() * entries.length)];
        }
      }
    }

    if (!value && !isRequired) {
      return '';
    }

    return value;
  });
```

- [ ] **Step 2: Update buildRecipePrompts to pass wildcardEntries**

```typescript
export function buildRecipePrompts(
  stages: RecipeStage[],
  values: RecipeFieldValues,
  wildcardEntries?: Record<string, string[]>
): RecipePromptResult {
  const uniqueFields = getAllFields(stages);
  const prompts = stages.map(stage =>
    buildStagePrompt(stage.template, stage.fields, values, uniqueFields, wildcardEntries)
  );
  // ... rest unchanged
```

- [ ] **Step 3: Update buildActivePrompts in recipe store**

In `recipe.store.ts`, update `buildActivePrompts` to collect wildcard entries from the wildcard store:

```typescript
  buildActivePrompts: () => {
    const recipe = get().getActiveRecipe()
    if (!recipe) return null

    // Collect wildcard entries for any wildcard fields
    const wildcardStore = useWildCardStore.getState()
    const allFields = getAllFields(recipe.stages)
    const wildcardEntries: Record<string, string[]> = {}

    for (const field of allFields) {
      if (field.type === 'wildcard' && field.wildcardName) {
        const wc = wildcardStore.getWildCardByName(field.wildcardName)
        if (wc) {
          wildcardEntries[field.wildcardName] = wc.content
            .split('\n')
            .filter((l: string) => l.trim().length > 0)
        }
      }
    }

    return buildRecipePrompts(recipe.stages, get().activeFieldValues, wildcardEntries)
  },
```

Add the import at the top of `recipe.store.ts` (alongside existing imports from `../types/recipe.types`):

```typescript
import { useWildCardStore } from '../store/wildcard.store'
```

Note: `getAllFields` is already imported via the barrel export.

- [ ] **Step 4: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/shot-creator/types/recipe-utils.ts src/features/shot-creator/store/recipe.store.ts
git commit -m "feat(recipes): resolve wildcard values in prompt builder"
```

---

### Task 4: Render wildcard fields in RecipeFormFields

**Files:**
- Modify: `src/features/shot-creator/components/recipe/RecipeFormFields.tsx:106-161`

- [ ] **Step 1: Import wildcard store and add wildcard field rendering**

Add imports at top of file:

```typescript
import { useWildCardStore } from '../../store/wildcard.store'
import { useState } from 'react'
import { Dices, List } from 'lucide-react'
```

Add inside the component, before `renderField`:

```typescript
  const wildcardStore = useWildCardStore()
```

Add a new case in `renderField` switch, before the `default`:

```typescript
      case 'wildcard': {
        const wcName = field.wildcardName || ''
        const wc = wildcardStore.getWildCardByName(wcName)
        const entries = wc
          ? wc.content.split('\n').filter((l: string) => l.trim().length > 0)
          : []
        const defaultMode = field.wildcardMode || 'browse'
        // Track mode toggle per field
        const currentMode = wildcardModes[field.id] ?? defaultMode
        const isBrowse = currentMode === 'browse'

        if (!wc) {
          return (
            <div className="flex items-center gap-2 h-9 px-3 text-xs text-amber-400/60 bg-card border border-border rounded-md">
              Wildcard &quot;{wcName}&quot; not available
            </div>
          )
        }

        if (isBrowse) {
          // Filter entries by search query for large wildcard lists (50+ entries)
          const searchQuery = wildcardSearches[field.id] || ''
          const filteredEntries = searchQuery
            ? entries.filter(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
            : entries

          return (
            <div className="flex items-center gap-1">
              <Select
                value={value}
                onValueChange={(v) => setFieldValue(field.id, v)}
              >
                <SelectTrigger
                  className={cn(
                    'h-9 text-sm bg-card border-border flex-1',
                    isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
                  )}
                >
                  <SelectValue placeholder={`${field.label} (${entries.length})`} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {entries.length > 15 && (
                    <div className="px-2 py-1 sticky top-0 bg-popover z-10">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setWildcardSearches(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="w-full h-7 px-2 text-xs bg-card border border-border rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                  {filteredEntries.map((entry, i) => (
                    <SelectItem key={i} value={entry} className="text-xs">
                      {entry.length > 80 ? entry.slice(0, 80) + '...' : entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                title="Switch to random mode"
                onClick={() => setWildcardModes(prev => ({ ...prev, [field.id]: 'random' }))}
              >
                <Dices className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          )
        }

        // Random mode — auto-set a random value if none exists (locks it in)
        if (!value && entries.length > 0) {
          const picked = entries[Math.floor(Math.random() * entries.length)]
          // Use setTimeout to avoid setting state during render
          setTimeout(() => setFieldValue(field.id, picked), 0)
        }
        return (
          <div className="flex items-center gap-1">
            <div
              className={cn(
                'flex-1 flex items-center gap-2 h-9 px-3 text-sm bg-card border border-border rounded-md cursor-pointer hover:border-amber-500/30 transition-colors',
                isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
              )}
              onClick={() => {
                if (entries.length > 0) {
                  const picked = entries[Math.floor(Math.random() * entries.length)]
                  setFieldValue(field.id, picked)
                }
              }}
              title="Click to re-roll"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate text-xs">
                {value ? (value.length > 60 ? value.slice(0, 60) + '...' : value) : `Random ${field.label}`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 shrink-0"
              title="Switch to browse mode"
              onClick={() => setWildcardModes(prev => ({ ...prev, [field.id]: 'browse' }))}
            >
              <List className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        )
      }
```

Add state for wildcard mode toggling inside the component:

```typescript
  const [wildcardModes, setWildcardModes] = useState<Record<string, 'browse' | 'random'>>({})
  const [wildcardSearches, setWildcardSearches] = useState<Record<string, string>>({})
```

- [ ] **Step 2: Update field grouping to include wildcard fields with compact fields**

Update the grouping logic (line 166-167):

```typescript
  const compactFields = allFields.filter((f) => f.type === 'name' || f.type === 'select' || f.type === 'wildcard')
  const textFields = allFields.filter((f) => f.type === 'text')
```

- [ ] **Step 3: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeFormFields.tsx
git commit -m "feat(recipes): render wildcard fields with browse/random toggle"
```

---

## Chunk 2: Migration — Built-in Recipes to Community

### Task 5: Create seed script for community recipes

**Files:**
- Create: `scripts/seed-community-recipes.mjs`
- Create: `scripts/export-recipes-json.ts`

**Important:** `recipe-samples.ts` is NOT deleted in this plan. It stays as the data source for the 3 starter recipes in `initializeSystemRecipes()`. The seeded community items allow users to discover and add the full catalog. In a future cleanup, once all recipes are confirmed in the community DB, the file can be removed and starters fetched from `community_items` instead.

**Task ordering note:** The export to JSON (Step 3) should be run AFTER Tasks 9-10 (which modify recipes with wildcard fields and add new recipes). Steps 1-2 create the scripts; Steps 3-5 are run as part of Task 16 (final seed).

- [ ] **Step 1: Write the seed script**

This script reads recipe data from a JSON file and inserts into `community_items`. Uses SELECT-then-INSERT to avoid needing a unique constraint (the `community_items` table has no unique index on `(type, name)`).

```javascript
#!/usr/bin/env node
/**
 * Seed SAMPLE_RECIPES as community_items with type='recipe', status='approved'.
 *
 * Usage: node --env-file=.env.local scripts/seed-community-recipes.mjs [--dry-run]
 *
 * IMPORTANT: Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS (required for
 * inserting with submitted_by=null, which the RLS policy blocks for normal users).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Run with: node --env-file=.env.local scripts/seed-community-recipes.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const dryRun = process.argv.includes('--dry-run')

const STARTER_RECIPE_NAMES = [
  'Battle Rap',
  'Character Sheet',
  'Product Photography',
]

async function main() {
  const recipesJson = readFileSync('scripts/data/sample-recipes.json', 'utf-8')
  const recipes = JSON.parse(recipesJson)

  console.log(`Found ${recipes.length} recipes to seed`)

  // Fetch existing community recipe names to avoid duplicates
  const { data: existing } = await supabase
    .from('community_items')
    .select('name')
    .eq('type', 'recipe')
  const existingNames = new Set((existing || []).map(r => r.name))
  console.log(`Existing community recipes: ${existingNames.size}`)

  let seeded = 0
  let skipped = 0
  let errors = 0

  for (const recipe of recipes) {
    const isStarter = STARTER_RECIPE_NAMES.includes(recipe.name)

    if (existingNames.has(recipe.name)) {
      console.log(`  SKIP ${recipe.name} (already exists)`)
      skipped++
      continue
    }

    const communityItem = {
      type: 'recipe',
      name: recipe.name,
      description: recipe.description || null,
      category: recipe.categoryId || 'character-sheets',
      tags: isStarter ? ['starterRecipe'] : [],
      content: {
        stages: recipe.stages.map(stage => ({
          id: stage.id,
          order: stage.order,
          type: stage.type || 'generation',
          template: stage.template,
          toolId: stage.toolId || undefined,
          referenceImages: stage.referenceImages || [],
        })),
        suggestedAspectRatio: recipe.suggestedAspectRatio || null,
        recipeNote: recipe.recipeNote || null,
        referenceImages: [],
      },
      submitted_by: null,
      submitted_by_name: 'Directors Palette',
      status: 'approved',
      is_featured: false,
      is_official: true,
      add_count: 0,
      rating_sum: 0,
      rating_count: 0,
    }

    console.log(`  ${isStarter ? 'STARTER' : 'SEED'} ${recipe.name} → category: ${communityItem.category}`)

    if (!dryRun) {
      const { error } = await supabase
        .from('community_items')
        .insert(communityItem)

      if (error) {
        console.error(`    ERROR: ${error.message}`)
        errors++
        continue
      }
    }
    seeded++
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Done: ${seeded} seeded, ${skipped} skipped, ${errors} errors`)
}

main().catch(console.error)
```

- [ ] **Step 2: Create a helper to export SAMPLE_RECIPES to JSON**

Create `scripts/export-recipes-json.ts`:

```typescript
// Run with: npx tsx scripts/export-recipes-json.ts
import { SAMPLE_RECIPES } from '../src/features/shot-creator/constants/recipe-samples'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('scripts/data', { recursive: true })
writeFileSync(
  'scripts/data/sample-recipes.json',
  JSON.stringify(SAMPLE_RECIPES, null, 2)
)
console.log(`Exported ${SAMPLE_RECIPES.length} recipes to scripts/data/sample-recipes.json`)
```

**Do NOT run the export yet.** Wait until after Tasks 9-10 (which modify Battle Rap and add new recipes).

- [ ] **Step 3: Commit scripts only (no data yet)**

```bash
git add scripts/seed-community-recipes.mjs scripts/export-recipes-json.ts
git commit -m "feat(recipes): add seed and export scripts for community recipe migration"
```

---

### Task 6: Update initializeSystemRecipes to only seed 3 starters

**Files:**
- Modify: `src/features/shot-creator/services/recipe.service.ts:524-576`

- [ ] **Step 1: Change initializeSystemRecipes to only seed the 3 starter recipes**

Replace the current `initializeSystemRecipes` method:

```typescript
  async initializeSystemRecipes(): Promise<void> {
    const supabase = await getRecipeClient()

    // Check if user already has any recipes (system or user-owned)
    const { data: existing } = await supabase
      .from('user_recipes')
      .select('id')
      .limit(1)

    if (existing && existing.length > 0) {
      logger.shotCreator.info('User already has recipes, skipping starter seed')
      return
    }

    logger.shotCreator.info('Seeding 3 starter recipes for new user...')

    // Only seed the 3 starter recipes from SAMPLE_RECIPES
    const STARTER_NAMES = ['Battle Rap', 'Character Sheet', 'Product Photography']
    const starters = SAMPLE_RECIPES.filter(r => STARTER_NAMES.includes(r.name))

    for (const sample of starters) {
      const dbRecipe = {
        user_id: null,
        name: sample.name,
        description: sample.description || null,
        recipe_note: sample.recipeNote || null,
        stages: sample.stages.map(stage => ({
          id: stage.id,
          order: stage.order,
          template: stage.template,
          type: stage.type || 'generation',
          toolId: stage.toolId,
          fields: [],
          referenceImages: stage.referenceImages,
        })),
        suggested_aspect_ratio: sample.suggestedAspectRatio || null,
        suggested_resolution: sample.suggestedResolution || null,
        quick_access_label: sample.quickAccessLabel || null,
        is_quick_access: sample.isQuickAccess,
        category_id: sample.categoryId || null,
        is_system: true,
        is_system_only: sample.isSystemOnly || false,
      }

      const { error } = await supabase
        .from('user_recipes')
        .insert(dbRecipe)

      if (error) {
        logger.shotCreator.error('Error inserting starter recipe', { name: sample.name, error })
      } else {
        logger.shotCreator.info('Inserted starter recipe', { name: sample.name })
      }
    }

    logger.shotCreator.info('Starter recipes initialization complete')
  }
```

- [ ] **Step 2: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/services/recipe.service.ts
git commit -m "feat(recipes): limit system recipe init to 3 starters"
```

---

### Task 7: Update Community types and page to show official badge

**Files:**
- Modify: `src/features/community/types/community.types.ts:82-118`
- Modify: `src/features/community/components/CommunityPage.tsx`

- [ ] **Step 1: Add isOfficial to CommunityItem and CommunityItemRow**

In `community.types.ts`, add to `CommunityItem` interface (after `isFeatured`):

```typescript
  isOfficial: boolean
```

Add to `CommunityItemRow` (after `is_featured`):

```typescript
  is_official: boolean
```

Update `rowToCommunityItem` to include:

```typescript
    isOfficial: row.is_official ?? false,
```

- [ ] **Step 2: Add "Official" badge to community recipe cards**

In `CommunityPage.tsx`, find where recipe cards are rendered. Add an "Official" badge next to the name for items with `isOfficial: true`:

```tsx
{item.isOfficial && (
  <Badge variant="outline" className="text-[10px] py-0 border-amber-500/40 text-amber-400">
    Official
  </Badge>
)}
```

- [ ] **Step 3: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/community/types/community.types.ts src/features/community/components/CommunityPage.tsx
git commit -m "feat(community): add isOfficial badge for platform recipes"
```

---

### Task 8: Update "remove recipe" to clean up library + quick access

**Files:**
- Modify: `src/features/shot-creator/store/recipe.store.ts:260-287`

- [ ] **Step 1: Add library cleanup to deleteRecipe**

The existing `deleteRecipe` already removes from quick access. Add a call to remove from `user_library_items` as well:

```typescript
  deleteRecipe: async (id, isAdmin = false) => {
    const userId = get().currentUserId
    if (!userId) throw new Error('No user ID')

    // Remove from quick access if present
    const quickAccessItem = get().quickAccessItems.find(
      (item) => item.recipeId === id
    )
    if (quickAccessItem) {
      await get().removeFromQuickAccess(quickAccessItem.id)
    }

    // Clear active recipe if it's the one being deleted
    if (get().activeRecipeId === id) {
      set({ activeRecipeId: null, activeFieldValues: {} })
    }

    // Get recipe name before deletion (for library cleanup)
    const recipe = get().getRecipe(id)
    const recipeName = recipe?.name

    // Delete from user_recipes
    const success = await recipeService.deleteRecipe(id, userId, isAdmin)
    if (!success) {
      throw new Error('Failed to delete recipe from database')
    }

    // Also remove from user_library_items if it was added from community
    if (recipeName) {
      try {
        const { getClient } = await import('@/lib/db/client')
        const supabase = await getClient()
        await supabase
          .from('user_library_items')
          .delete()
          .eq('user_id', userId)
          .eq('type', 'recipe')
          .eq('name', recipeName)
      } catch {
        // Best-effort cleanup — doesn't block deletion
      }
    }

    // Update local state
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
    }))
  },
```

- [ ] **Step 2: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/store/recipe.store.ts
git commit -m "feat(recipes): clean up library items when removing recipe"
```

---

## Chunk 3: Battle Rap Recipe Update + New Recipes

### Task 9: Update Battle Rap recipe with wildcard fields

**Files:**
- Modify: `src/features/shot-creator/constants/recipe-samples.ts` (Battle Rap recipe entry)

- [ ] **Step 1: Find and update the Battle Rap recipe template**

Search for the Battle Rap recipe in `recipe-samples.ts`. Update its stage template to use wildcard fields:

Replace the existing field definitions:
- `<<ACTION_A:select(...)>>` → `<<ACTION_A:wildcard(actions_confident, browse)>>`
- `<<ACTION_B:select(...)>>` → `<<ACTION_B:wildcard(actions_expressive, browse)>>`
- `<<LOCATION:select(...)>>` → `<<LOCATION:wildcard(settingsbattlerap, browse)>>`
- Remove `<<CUSTOM_LOCATION:text>>` (no longer needed — browse mode covers custom selection)

Add new wildcard fields to the template:
- `<<OUTFIT_A:wildcard(blkmen_fullbody, browse)>>`
- `<<HAIR_A:wildcard(blkmen_hair, browse)>>`
- `<<OUTFIT_B:wildcard(blkmen_fullbody, browse)>>`
- `<<HAIR_B:wildcard(blkmen_hair, browse)>>`

Integrate the new fields into the prompt template text so they appear in the right context (outfit/hair descriptions near each person's description).

- [ ] **Step 2: Verify the updated recipe parses correctly**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/constants/recipe-samples.ts
git commit -m "feat(recipes): update Battle Rap recipe with wildcard fields"
```

---

### Task 10: Add new wildcard-powered recipes

**Files:**
- Modify: `src/features/shot-creator/constants/recipe-samples.ts`

- [ ] **Step 1: Add Street Style Lookbook (Men) recipe**

Add a new recipe to `SAMPLE_RECIPES` array:

```typescript
{
  name: 'Street Style Lookbook (Men)',
  description: '9 frames of the same character in different street outfits, each pulled from wildcards',
  categoryId: 'character-sheets',
  suggestedAspectRatio: '1:1',
  isQuickAccess: false,
  stages: [{
    id: generateStageId(),
    order: 0,
    template: `Professional fashion lookbook. 3x3 grid, 9 frames. Same male character in each frame, consistent face and build. Each frame shows a different street outfit.

Frame 1: <<OUTFIT_1:wildcard(blkmen_fullbody, random)>>, <<HAIR:wildcard(blkmen_hair, random)>>, <<SHOES_1:wildcard(blkmen_sneakers_color, random)>>
Frame 2: <<OUTFIT_2:wildcard(blkmen_fullbody, random)>>, same hair, <<SHOES_2:wildcard(blkmen_sneakers_color, random)>>
Frame 3: <<OUTFIT_3:wildcard(blkmen_fullbody, random)>>, same hair, <<SHOES_3:wildcard(blkmen_sneakers_color, random)>>
Frame 4-9: Continue with unique random outfits and sneakers per frame.

<<ACCESSORIES:wildcard(blkmen_accessories, random)>>

Clean white studio background. Professional photography lighting. Full body shots. Editorial fashion photography style.`,
    fields: [],
    referenceImages: [],
  }],
}
```

- [ ] **Step 2: Add Street Style Lookbook (Women) recipe**

Same structure but with `blkwomen_*` wildcards.

- [ ] **Step 3: Add Fashion Editorial (Women) recipe**

```typescript
{
  name: 'Fashion Editorial (Women)',
  description: 'High-fashion editorial spread with curated looks from wildcards',
  categoryId: 'portraits',
  suggestedAspectRatio: '2:3',
  isQuickAccess: false,
  stages: [{
    id: generateStageId(),
    order: 0,
    template: `High fashion editorial magazine spread. Single female model.

Dress code: <<DRESS_CODE:wildcard(blkwomendresscode, browse)>>
Hairstyle: <<HAIR:wildcard(blkwomen_hair, browse)>>
Accessories: <<ACCESSORIES:wildcard(blkwomen_accessories, browse)>>
Handbag: <<HANDBAG:wildcard(blkwomen_handbags, browse)>>
Footwear: <<SHOES:wildcard(blkwomen_footwear, browse)>>

Magazine-quality photography. Studio lighting with dramatic shadows. Editorial pose. Vogue/Harper's Bazaar aesthetic.`,
    fields: [],
    referenceImages: [],
  }],
}
```

- [ ] **Step 4: Add Location Scouting Sheet recipe**

```typescript
{
  name: 'Location Scouting Sheet',
  description: '9 different locations for a scene, mixing indoor and outdoor venues from wildcards',
  categoryId: 'storyboards',
  suggestedAspectRatio: '1:1',
  isQuickAccess: false,
  stages: [{
    id: generateStageId(),
    order: 0,
    template: `Location scouting reference sheet. 3x3 grid, 9 frames. Each frame shows a different location, empty of people. Cinematic composition, establishing shot angle.

Locations 1-5: <<INDOOR:wildcard(settings_indoor, random)>>
Locations 6-9: <<OUTDOOR:wildcard(settings_outdoor, random)>>

Golden hour and blue hour lighting mix. Film photography aesthetic. Wide angle lens. No people visible.`,
    fields: [],
    referenceImages: [],
  }],
}
```

- [ ] **Step 5: Add Action Sequence (Men) recipe**

```typescript
{
  name: 'Action Sequence (Men)',
  description: 'Character performing a sequence of actions across 9 frames',
  categoryId: 'action',
  suggestedAspectRatio: '16:9',
  isQuickAccess: false,
  stages: [{
    id: generateStageId(),
    order: 0,
    template: `Action sequence. 3x3 grid, 9 frames. Same male character throughout. Each frame captures a different moment of action.

Character outfit: <<OUTFIT:wildcard(blkmen_fullbody, browse)>>
Character hair: <<HAIR:wildcard(blkmen_hair, browse)>>
Location: <<LOCATION:wildcard(settingsbattlerap, browse)>>

Frame actions:
1-3: <<ACTION_START:wildcard(actions_relaxed, random)>>
4-6: <<ACTION_MID:wildcard(actions_confident, random)>>
7-9: <<ACTION_END:wildcard(actions_active, random)>>

Cinematic realism. Dynamic camera angles. Motion blur on fast movements. Dramatic lighting.`,
    fields: [],
    referenceImages: [],
  }],
}
```

- [ ] **Step 6: Add Sneaker Showcase (Men) recipe**

```typescript
{
  name: 'Sneaker Showcase (Men)',
  description: '9-frame grid focused on sneakers from different angles and lighting',
  categoryId: 'product',
  suggestedAspectRatio: '1:1',
  isQuickAccess: false,
  stages: [{
    id: generateStageId(),
    order: 0,
    template: `Sneaker showcase. 3x3 grid, 9 frames. Each frame shows the same sneaker from a different angle and lighting.

Sneaker: <<SNEAKER:wildcard(blkmen_sneakers_color, browse)>>

Angles: front, side profile, back, top-down, 3/4 front, 3/4 back, close-up detail, on-foot shot, lifestyle shot.
Clean studio background. Product photography lighting. Sharp focus. No people except the on-foot shot.`,
    fields: [],
    referenceImages: [],
  }],
}
```

- [ ] **Step 7: Add Sneaker Showcase (Women) recipe**

Same structure as Step 6 but with `blkwomen_sneakers_color` wildcard.

- [ ] **Step 8: Add Action Sequence (Women) recipe**

Same structure as Action Sequence (Men) but with `blkwomen_*` wildcards.

- [ ] **Step 9: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/features/shot-creator/constants/recipe-samples.ts
git commit -m "feat(recipes): add 8 new wildcard-powered recipes"
```

---

## Chunk 4: Guided Recipe Builder

### Task 11: Create WildcardFieldPicker component

**Files:**
- Create: `src/features/community/components/recipe-builder/WildcardFieldPicker.tsx`

- [ ] **Step 1: Create the wildcard picker component**

This component shows all available wildcards grouped by category. When the user picks one, it returns the wildcard name and selected mode.

```typescript
'use client'

import { useState } from 'react'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { cn } from '@/utils/utils'
import { Dices, List, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WildcardFieldPickerProps {
  onSelect: (wildcardName: string, mode: 'browse' | 'random', label: string) => void
  onCancel: () => void
}

export function WildcardFieldPicker({ onSelect, onCancel }: WildcardFieldPickerProps) {
  const { wildcards } = useWildCardStore()
  const [selectedWc, setSelectedWc] = useState<string | null>(null)
  const [mode, setMode] = useState<'browse' | 'random'>('browse')
  const [label, setLabel] = useState('')

  // Group wildcards by category
  const groups: Record<string, typeof wildcards> = {}
  for (const wc of wildcards) {
    const cat = wc.category || 'general'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(wc)
  }

  const selectedWildcard = wildcards.find(w => w.name === selectedWc)
  const entries = selectedWildcard
    ? selectedWildcard.content.split('\n').filter(l => l.trim().length > 0)
    : []

  if (selectedWc && selectedWildcard) {
    // Step 2: Configure the field
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium text-amber-400">
          Configure: _{selectedWildcard.name}_
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground/60 mb-1">Field Label</div>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={selectedWildcard.name.replace(/_/g, ' ')}
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
          />
        </div>

        <div>
          <div className="text-[10px] text-muted-foreground/60 mb-1">Default Mode</div>
          <div className="flex gap-1">
            <button
              onClick={() => setMode('browse')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all',
                mode === 'browse'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                  : 'border-border/30 text-muted-foreground/60 hover:border-amber-500/30'
              )}
            >
              <List className="w-3 h-3" /> Browse
            </button>
            <button
              onClick={() => setMode('random')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all',
                mode === 'random'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                  : 'border-border/30 text-muted-foreground/60 hover:border-amber-500/30'
              )}
            >
              <Dices className="w-3 h-3" /> Random
            </button>
          </div>
        </div>

        {/* Preview entries */}
        <div>
          <div className="text-[10px] text-muted-foreground/60 mb-1">
            Sample entries ({entries.length} total)
          </div>
          <div className="max-h-[120px] overflow-y-auto space-y-0.5">
            {entries.slice(0, 5).map((entry, i) => (
              <div key={i} className="text-[11px] text-muted-foreground/80 truncate px-2 py-0.5 bg-card/50 rounded">
                {entry}
              </div>
            ))}
            {entries.length > 5 && (
              <div className="text-[10px] text-muted-foreground/40 px-2">
                ...and {entries.length - 5} more
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSelectedWc(null)} className="text-xs">
            Back
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const fieldLabel = label.trim() || selectedWildcard.name.replace(/_/g, ' ')
              onSelect(selectedWildcard.name, mode, fieldLabel)
            }}
            className="text-xs bg-amber-600 hover:bg-amber-500"
          >
            Add Field
          </Button>
        </div>
      </div>
    )
  }

  // Step 1: Browse wildcards by category
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-amber-400">Select a Wildcard</div>
      <div className="max-h-[300px] overflow-y-auto space-y-1">
        {Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, wcs]) => (
            <div key={category}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40 px-2 py-1">
                {category} ({wcs.length})
              </div>
              {wcs.sort((a, b) => a.name.localeCompare(b.name)).map(wc => {
                const count = wc.content.split('\n').filter(l => l.trim().length > 0).length
                return (
                  <button
                    key={wc.id}
                    onClick={() => {
                      setSelectedWc(wc.name)
                      setLabel(wc.name.replace(/_/g, ' '))
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs rounded hover:bg-card transition-colors"
                  >
                    <span className="font-mono text-amber-400">_{wc.name}_</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">{count}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </button>
                )
              })}
            </div>
          ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
        Cancel
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/community/components/recipe-builder/WildcardFieldPicker.tsx
git commit -m "feat(recipes): add WildcardFieldPicker component for guided builder"
```

---

### Task 12: Create FieldPalette component

**Files:**
- Create: `src/features/community/components/recipe-builder/FieldPalette.tsx`

- [ ] **Step 1: Create the field palette**

This component shows all available field types and lets the user add them to a recipe template. When a field is added, it inserts the template syntax into the textarea.

```typescript
'use client'

import { useState } from 'react'
import { Type, ListOrdered, Dices, User, Image } from 'lucide-react'
import { cn } from '@/utils/utils'
import { WildcardFieldPicker } from './WildcardFieldPicker'

type FieldPaletteAction =
  | { type: 'text'; label: string }
  | { type: 'select'; label: string; options: string[] }
  | { type: 'wildcard'; label: string; wildcardName: string; mode: 'browse' | 'random' }
  | { type: 'name'; label: string }

interface FieldPaletteProps {
  onInsertField: (templateSnippet: string) => void
  className?: string
}

export function FieldPalette({ onInsertField, className }: FieldPaletteProps) {
  const [activePanel, setActivePanel] = useState<'none' | 'text' | 'select' | 'wildcard' | 'name'>('none')
  const [textLabel, setTextLabel] = useState('')
  const [nameLabel, setNameLabel] = useState('')
  const [selectLabel, setSelectLabel] = useState('')
  const [selectOptions, setSelectOptions] = useState('')

  const insertField = (action: FieldPaletteAction) => {
    const fieldName = action.label.toUpperCase().replace(/\s+/g, '_')
    let snippet = ''

    switch (action.type) {
      case 'text':
        snippet = `<<${fieldName}:text>>`
        break
      case 'select':
        snippet = `<<${fieldName}:select(${action.options.join(',')})>>`
        break
      case 'wildcard':
        snippet = `<<${fieldName}:wildcard(${action.wildcardName}, ${action.mode})>>`
        break
      case 'name':
        snippet = `<<${fieldName}:name>>`
        break
    }

    onInsertField(snippet)
    setActivePanel('none')
    setTextLabel('')
    setNameLabel('')
    setSelectLabel('')
    setSelectOptions('')
  }

  const buttons = [
    { id: 'text' as const, icon: Type, label: 'Text Input', desc: 'Free-form text field' },
    { id: 'select' as const, icon: ListOrdered, label: 'Multiple Choice', desc: 'Dropdown with options' },
    { id: 'wildcard' as const, icon: Dices, label: 'Wildcard', desc: 'Connect to a wildcard list' },
    { id: 'name' as const, icon: User, label: 'Character Ref', desc: 'Link a character' },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
        Add Field
      </div>

      {activePanel === 'none' && (
        <div className="grid grid-cols-2 gap-1">
          {buttons.map(btn => (
            <button
              key={btn.id}
              onClick={() => setActivePanel(btn.id)}
              className="flex items-center gap-2 rounded-md border border-border/30 px-2 py-2 text-left hover:border-amber-500/30 transition-colors"
            >
              <btn.icon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[11px] font-medium text-foreground">{btn.label}</div>
                <div className="text-[9px] text-muted-foreground/50">{btn.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {activePanel === 'text' && (
        <div className="space-y-2">
          <input
            type="text"
            value={textLabel}
            onChange={(e) => setTextLabel(e.target.value)}
            placeholder="Field label (e.g. Story)"
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setActivePanel('none')} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={() => textLabel.trim() && insertField({ type: 'text', label: textLabel.trim() })}
              disabled={!textLabel.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePanel === 'name' && (
        <div className="space-y-2">
          <input
            type="text"
            value={nameLabel}
            onChange={(e) => setNameLabel(e.target.value)}
            placeholder="Field label (e.g. Character Name)"
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setActivePanel('none')} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={() => nameLabel.trim() && insertField({ type: 'name', label: nameLabel.trim() })}
              disabled={!nameLabel.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePanel === 'select' && (
        <div className="space-y-2">
          <input
            type="text"
            value={selectLabel}
            onChange={(e) => setSelectLabel(e.target.value)}
            placeholder="Field label (e.g. Style)"
            className="w-full h-8 px-2 text-sm bg-card border border-border rounded-md"
            autoFocus
          />
          <textarea
            value={selectOptions}
            onChange={(e) => setSelectOptions(e.target.value)}
            placeholder="Options (one per line)"
            className="w-full h-20 px-2 py-1 text-sm bg-card border border-border rounded-md resize-y"
          />
          <div className="flex gap-2">
            <button onClick={() => setActivePanel('none')} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={() => {
                const opts = selectOptions.split('\n').map(o => o.trim()).filter(Boolean)
                if (selectLabel.trim() && opts.length > 0) {
                  insertField({ type: 'select', label: selectLabel.trim(), options: opts })
                }
              }}
              disabled={!selectLabel.trim() || !selectOptions.trim()}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:opacity-50"
            >
              Insert
            </button>
          </div>
        </div>
      )}

      {activePanel === 'wildcard' && (
        <WildcardFieldPicker
          onSelect={(wildcardName, mode, label) => {
            insertField({ type: 'wildcard', label, wildcardName, mode })
          }}
          onCancel={() => setActivePanel('none')}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/community/components/recipe-builder/FieldPalette.tsx
git commit -m "feat(recipes): add FieldPalette component for guided builder"
```

---

### Task 13: Create GuidedRecipeBuilder component

**Files:**
- Create: `src/features/community/components/recipe-builder/GuidedRecipeBuilder.tsx`

- [ ] **Step 1: Create the guided builder**

This is the main recipe creation wizard. It replaces the raw template textarea with a visual editor plus field palette.

The component is a multi-step form:
1. **Basics** — name, description, category, aspect ratio
2. **Stages** — template editor with field palette sidebar, reference image upload, stage chaining
3. **Preview** — live form preview with test values
4. **Save** — save to Shot Creator, optionally share to Community

Key implementation details:
- Use `Dialog` from Radix UI for the modal
- Template textarea has `_` wildcard autocomplete via `useWildcardAutocomplete` hook
- Field palette inserts `<<FIELD:type>>` syntax at cursor position
- Preview uses `parseStageTemplate()` to render the form
- Save creates a `user_recipes` row and optionally a `community_items` row

The component should be ~200-300 lines. Use the existing `RecipeBuilder.tsx` as reference for stage management patterns, but simplify the UX.

- [ ] **Step 2: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/community/components/recipe-builder/GuidedRecipeBuilder.tsx
git commit -m "feat(recipes): add GuidedRecipeBuilder wizard component"
```

---

### Task 14: Wire guided builder into Community page

**Files:**
- Modify: `src/features/community/components/CommunityPage.tsx`

- [ ] **Step 1: Add "Create Recipe" button to Community page**

Import `GuidedRecipeBuilder` and add a button in the Community page header (near the filter controls) that opens the guided builder dialog.

```tsx
import { GuidedRecipeBuilder } from './recipe-builder/GuidedRecipeBuilder'

// In the component:
const [showRecipeBuilder, setShowRecipeBuilder] = useState(false)

// In the header area:
<Button
  onClick={() => setShowRecipeBuilder(true)}
  className="bg-amber-600 hover:bg-amber-500 text-sm"
>
  Create Recipe
</Button>

// At the bottom of the return:
{showRecipeBuilder && (
  <GuidedRecipeBuilder
    open={showRecipeBuilder}
    onClose={() => setShowRecipeBuilder(false)}
  />
)}
```

- [ ] **Step 2: Verify build**

Run: `rm -rf .next && npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/community/components/CommunityPage.tsx
git commit -m "feat(community): wire guided recipe builder into Community page"
```

---

## Chunk 5: Build + Test + Polish

### Task 15: Full build verification

**Files:**
- All modified files

- [ ] **Step 1: Clean build**

Run: `rm -rf .next && npm run build`
Expected: PASS with no errors

- [ ] **Step 2: Start dev server and verify**

Run: `node node_modules/next/dist/bin/next dev --port 3002 2>&1 &`

Verify these flows manually via curl or browser:
1. Community page loads with recipe cards
2. Shot Creator shows recipes (starters or existing user recipes)
3. Wildcard fields render in browse and random modes
4. Guided recipe builder opens from Community tab

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix: build fixes for recipe gallery system"
```

---

### Task 16: Run seed scripts (AFTER Tasks 9-10 have modified recipes)

- [ ] **Step 1: Export recipes to JSON (now includes wildcard fields + new recipes)**

Run: `npx tsx scripts/export-recipes-json.ts`
Expected: "Exported N recipes to scripts/data/sample-recipes.json" (N should be ~26+, the original recipes + 8 new ones)

- [ ] **Step 2: Add is_official column via migration file**

Create `supabase/migrations/20260315_community_is_official.sql`:

```sql
ALTER TABLE community_items ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false;
```

Run via Supabase dashboard or: `npx supabase db push`

- [ ] **Step 3: Seed community recipes**

Run: `node --env-file=.env.local scripts/seed-community-recipes.mjs --dry-run`
Verify output shows correct recipes, then run for real:
Run: `node --env-file=.env.local scripts/seed-community-recipes.mjs`

- [ ] **Step 4: Verify seeded recipes appear in Community**

Run: `curl http://localhost:3002/api/community?type=recipe | jq '.items | length'`
Expected: 26+ recipes (18 original + 8 new)

- [ ] **Step 5: Commit seed data + migration**

```bash
git add scripts/data/sample-recipes.json supabase/migrations/20260315_community_is_official.sql
git commit -m "feat(recipes): seed community recipes data + is_official migration"
```

---

### Task 17: Final push

- [ ] **Step 1: Push all commits**

Run: `git push origin main`

---
