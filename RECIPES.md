# Recipe System Documentation

This document explains how the Directors Palette recipe system works - from field syntax to multi-stage pipe chaining.

---

## Table of Contents
1. [Field Syntax](#field-syntax)
2. [Field Types](#field-types)
3. [Duplicate Fields](#duplicate-fields)
4. [Multi-Stage Pipe Chaining](#multi-stage-pipe-chaining)
5. [Reference Images](#reference-images)
6. [Validation Logic](#validation-logic)
7. [Prompt Building](#prompt-building)
8. [Generation Flow](#generation-flow)
9. [Key Files](#key-files)

---

## Field Syntax

Recipe fields use the syntax: `<<FIELD_NAME:type!>>`

| Part | Description | Required |
|------|-------------|----------|
| `<<` | Opening delimiter | Yes |
| `FIELD_NAME` | Variable name (UPPERCASE + underscores + numbers) | Yes |
| `:` | Separator | Yes |
| `type` | Field type (see below) | Yes |
| `!` | Marks field as required | No |
| `>>` | Closing delimiter | Yes |

### Examples
```
<<CHARACTER_NAME:name!>>       - Required name field (small input)
<<DESCRIPTION:text>>           - Optional text field (larger textarea)
<<SHOT_TYPE:select(CU,MS,WS)!>> - Required dropdown with options
```

---

## Field Types

### `name`
- Small input (~12 characters visible)
- Used for short values like names, titles
- Width: 140px

### `text`
- Larger resizable textarea
- Used for descriptions, prompts, notes
- Height: min 36px, resizable

### `select(option1,option2,...)`
- Dropdown with predefined options
- Options separated by commas
- Example: `<<STYLE:select(anime,cartoon,realistic)!>>`

---

## Duplicate Fields

**Same variable can appear multiple times in a recipe.**

Example prompt:
```
<<CHARACTER_NAME:name!>> walks into the room.
Everyone looks at <<CHARACTER_NAME:name!>>.
"Hello," says <<CHARACTER_NAME:name!>>.
```

**How it works:**

1. **Parsing**: `parseStageTemplate()` creates a field for EACH occurrence:
   - `stage0_field0_character_name`
   - `stage0_field1_character_name`
   - `stage0_field2_character_name`

2. **Deduplication**: `getAllFields()` keeps only the FIRST occurrence per NAME:
   - Returns: `[{id: "stage0_field0_character_name", name: "CHARACTER_NAME", ...}]`

3. **Form Display**: User sees ONE input field for CHARACTER_NAME

4. **Value Storage**: Value stored under first field's ID:
   - `activeFieldValues["stage0_field0_character_name"] = "John"`

5. **Validation**: Uses deduplicated list - validates ONCE per unique field name

6. **Prompt Building**: `buildStagePrompt()` builds a name-to-value map, then replaces ALL occurrences:
   - All `<<CHARACTER_NAME:name!>>` become "John"

---

## Multi-Stage Pipe Chaining

Recipes can have multiple stages separated by `|`. Each stage generates a separate image, with the previous output becoming a reference for the next stage.

### Syntax
```
Stage 1 prompt here | Stage 2 prompt here | Stage 3 prompt here
```

### How It Works

1. **Parsing**: Template split by `|` into stages
2. **Field Sharing**: Fields with same NAME share values across stages
3. **Sequential Generation**: Each stage generates one at a time
4. **Reference Chaining**: Previous stage's output becomes reference for next stage

### Example: Photo to Character Sheet
```
Stage 0: Extract and isolate character from photo
    |
Stage 1: Apply art style to isolated character
    |
Stage 2: Generate full character sheet with expressions
```

### Generation Flow
1. Stage 0 generates → Output URL saved as `previousImageUrl`
2. Stage 1 starts with `previousImageUrl` as reference → Generates → Updates `previousImageUrl`
3. Stage 2 starts with `previousImageUrl` as reference → Final output

---

## Reference Images

### Per-Stage Reference Images

Each stage can have its own fixed reference images (templates, layouts, etc.):

```typescript
interface RecipeStage {
  id: string
  order: number
  template: string
  fields: RecipeField[]
  referenceImages: RecipeReferenceImage[]  // Fixed refs for this stage
}
```

### Reference Image Priority (for each stage)

1. **First Stage**:
   - Stage's fixed refs (if any)
   - OR user's uploaded refs (fallback)

2. **Subsequent Stages**:
   - Previous stage output PLUS stage's fixed refs

### Example
```
Stage 0: Uses character sheet layout template image
Stage 1: Uses Stage 0's output + style guide template
Stage 2: Uses Stage 1's output (final character sheet)
```

### Important: URL Conversion

Reference images must be HTTPS URLs that Replicate can access. The system:
1. Detects data URLs, blob URLs, or local paths
2. Uploads them to Supabase Storage
3. Uses the public HTTPS URLs for Replicate

This happens via `prepareReferenceImagesForAPI()`.

---

## Validation Logic

### How Validation Works

1. **Get Unique Fields**: `getAllFields(stages)` deduplicates by field NAME
2. **Check Required Fields**: For each unique field with `required: true`:
   - Look up value by field ID
   - Fallback: Search for any value with matching field name pattern
3. **Result**: `{ isValid: boolean, missingFields: string[], errors: string[] }`

### Validation Code (`validateRecipe`)
```typescript
const uniqueFields = getAllFields(stages)  // Deduplicated

for (const field of uniqueFields) {
  if (field.required) {
    let value = values[field.id]

    // Fallback: search by field name pattern
    if (!value) {
      for (const [id, val] of Object.entries(values)) {
        if (id.includes(field.name.toLowerCase()) && val) {
          value = val
          break
        }
      }
    }

    if (!value || value.trim() === '') {
      missingFields.push(field.label)
    }
  }
}
```

### UI Validation Display

The `canGenerate` check in `PromptActions.tsx`:
```typescript
const canGenerate = useMemo(() => {
  if (activeRecipe) {
    const validation = getActiveValidation()
    const hasRefs = shotCreatorReferenceImages.length > 0 ||
      activeRecipe.stages.some(s => (s.referenceImages?.length || 0) > 0)
    return (validation?.isValid ?? false) && hasRefs
  }
  return shotCreatorPrompt.length > 0 && shotCreatorReferenceImages.length > 0
}, [shotCreatorPrompt, shotCreatorReferenceImages, activeFieldValues, ...])
```

**CRITICAL**: `activeFieldValues` MUST be in dependencies or button won't update when fields change!

---

## Prompt Building

### Building a Single Stage (`buildStagePrompt`)

1. Create name-to-value map from unique fields
2. Replace ALL `<<FIELD_NAME:type>>` occurrences with values
3. Clean up orphaned punctuation and extra spaces

```typescript
function buildStagePrompt(template, fields, values, allUniqueFields?) {
  // Build name -> value map
  const valueByName = new Map()
  for (const field of (allUniqueFields || fields)) {
    valueByName.set(field.name, { value: values[field.id], required: field.required })
  }

  // Replace all field placeholders
  result = template.replace(/<<([A-Z_0-9]+):([^>]+)>>/g, (match, name, typeSpec) => {
    const fieldData = valueByName.get(name)
    const value = fieldData?.value || ''

    // Optional field with empty value: remove placeholder entirely
    if (!value && !typeSpec.endsWith('!')) {
      return ''
    }
    return value
  })

  // Clean up orphaned punctuation
  // ...
}
```

### Building All Stages (`buildRecipePrompts`)

Returns:
```typescript
{
  prompts: string[]        // One prompt per stage
  referenceImages: string[] // All refs flattened (backward compat)
  stageReferenceImages: string[][] // Per-stage refs [stage0_refs, stage1_refs, ...]
}
```

---

## Generation Flow

### Full Flow: Recipe Selection to Image Generation

```
1. USER SELECTS RECIPE
   ↓
   setActiveRecipe(recipeId) → Clears field values
   ↓
2. USER FILLS FIELDS
   ↓
   setFieldValue(fieldId, value) → Updates activeFieldValues
   ↓
   canGenerate recalculates (useMemo with activeFieldValues dependency)
   ↓
3. USER CLICKS GENERATE
   ↓
   getActiveValidation() → Validates fields
   ↓
   buildActivePrompts() → Returns { prompts, stageReferenceImages }
   ↓
   Join prompts with " | " → fullPrompt = "stage0 | stage1 | stage2"
   ↓
   setStageReferenceImages(stageReferenceImages) → Store for pipe chaining
   ↓
4. generateImage() CALLED
   ↓
   Read FRESH stageReferenceImages from store (closure fix!)
   ↓
   isRecipeMode = stageReferenceImages.length > 0
   ↓
   parseDynamicPrompt() with pipe syntax ENABLED in recipe mode
   ↓
   variations = ["stage0 prompt", "stage1 prompt", "stage2 prompt"]
   isPipeChaining = true
   ↓
5. SEQUENTIAL GENERATION LOOP
   ↓
   For each stage:
     - Get fresh stageReferenceImages[i] from store
     - Convert refs to HTTPS URLs via prepareReferenceImagesForAPI()
     - Combine with previousImageUrl for stage > 0
     - Call Replicate API
     - Wait for completion (must be Supabase URL, not temp Replicate URL)
     - Store result URL as previousImageUrl
   ↓
6. RETURN RESULTS
```

### Critical Implementation Details

**Closure Bug Fix**: `stageReferenceImages` must be read FRESH from store inside `generateImage`:
```typescript
// WRONG: Uses stale closure value
const { stageReferenceImages } = useShotCreatorStore()
const isRecipeMode = stageReferenceImages.length > 0

// CORRECT: Read fresh from store
const freshStageRefs = useShotCreatorStore.getState().stageReferenceImages
const isRecipeMode = freshStageRefs && freshStageRefs.length > 0
```

**Supabase URL Check**: Wait for final URL, not temporary Replicate URL:
```typescript
// Wait until URL contains 'supabase.co' (permanent storage)
if (public_url && typeof public_url === 'string' && public_url.includes('supabase.co')) {
  return { imageUrl: public_url, ... }
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/shot-creator/types/recipe.types.ts` | Type definitions, field parsing, prompt building, validation |
| `src/features/shot-creator/store/recipe.store.ts` | Zustand store for recipes, field values, active recipe state |
| `src/features/shot-creator/components/recipe/RecipeFormFields.tsx` | Form UI for filling recipe fields |
| `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx` | Generate button, canGenerate validation, recipe mode handling |
| `src/features/shot-creator/hooks/useImageGeneration.ts` | Image generation, pipe chaining loop, reference image handling |
| `src/features/shot-creator/services/recipe.service.ts` | Database operations for recipes |

---

## Common Issues & Fixes

### Issue: Duplicate fields require filling multiple times
**Cause**: Not using `getAllFields()` for deduplication
**Fix**: Always use `getAllFields(stages)` for form display and validation

### Issue: Generate button stays disabled after filling fields
**Cause**: `activeFieldValues` missing from `useMemo` dependencies
**Fix**: Add `activeFieldValues` to the dependency array of `canGenerate`

### Issue: Pipe chaining not working (all prompts in one)
**Cause**: Closure stale value - `stageReferenceImages` captured at render time
**Fix**: Use `useShotCreatorStore.getState().stageReferenceImages` inside `generateImage`

### Issue: Reference images failing with Replicate
**Cause**: Using data URLs, blob URLs, or local paths
**Fix**: Convert via `prepareReferenceImagesForAPI()` to HTTPS Supabase URLs

### Issue: Previous stage output not available for next stage
**Cause**: Waiting for temporary Replicate URL instead of final Supabase URL
**Fix**: Check `public_url.includes('supabase.co')` before resolving

---

## Adding New Recipes

### Step 1: Define the Template
```typescript
{
  name: 'My Recipe',
  description: 'What this recipe does',
  recipeNote: 'Instructions shown when selected',
  stages: [{
    id: 'stage_0',
    order: 0,
    template: `Your prompt with <<FIELD:type!>> placeholders`,
    fields: [],  // Auto-populated by parseStageTemplate
    referenceImages: []  // Optional fixed refs
  }],
  suggestedAspectRatio: '16:9',
  isQuickAccess: true,
  quickAccessLabel: 'MyRecipe',
  categoryId: 'custom'
}
```

### Step 2: For Multi-Stage
Add multiple stages with `|` conceptually (or literally if in raw template):
```typescript
stages: [
  { id: 'stage_0', order: 0, template: 'Extract subject...', ... },
  { id: 'stage_1', order: 1, template: 'Apply style...', ... },
  { id: 'stage_2', order: 2, template: 'Generate final...', ... }
]
```

### Step 3: Add to SAMPLE_RECIPES
Add to `SAMPLE_RECIPES` array in `recipe.types.ts` for system templates.

---

## Testing Recipes

1. Select recipe in UI
2. Check console for: `🍳 Recipe mode detected - forcing pipe syntax enabled`
3. Fill all required fields (amber highlight should disappear)
4. Verify "Ready to Generate" shows in green
5. Click Generate
6. For multi-stage: check console for `[Pipe Chain] Step X/Y` logs
7. Verify each stage uses correct reference images

---

*Last Updated: December 2024*
*Generated with Claude Code*
