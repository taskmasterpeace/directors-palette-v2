# Codebase Refactor Sprint — Logger + Giant File Splits

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 1,099 console statements with a scoped logger, and split the 5 largest files (recipe.types 3,756 LOC, RecipeBuilder 1,539, PromptActions 1,392, storybook.store 1,208, storyboard.store 1,068) into focused modules.

**Architecture:** Enhance existing `src/lib/lognog.ts` with a scoped wrapper (`src/lib/logger.ts`). Split files along natural boundaries: types vs parsing vs constants vs samples for recipe.types; entity vs generation vs documentary vs UI slices for stores; extract hooks and sub-components for oversized components.

**Tech Stack:** Next.js 15, TypeScript (strict), Zustand, React 19

---

## Phase 1: Logger Utility (Tasks 1-3)

### Task 1: Create Scoped Logger Wrapper

**Files:**
- Create: `src/lib/logger.ts`
- Reference: `src/lib/lognog.ts` (existing LogNog wrapper)

**Step 1: Write the logger utility**

```typescript
// src/lib/logger.ts
import lognog from './lognog'

interface ScopedLogger {
  debug: (msg: string, ctx?: Record<string, unknown>) => void
  info: (msg: string, ctx?: Record<string, unknown>) => void
  warn: (msg: string, ctx?: Record<string, unknown>) => void
  error: (msg: string, ctx?: Record<string, unknown>) => void
}

export function createLogger(scope: string): ScopedLogger {
  return {
    debug: (msg, ctx) => lognog.devDebug(`[${scope}] ${msg}`, ctx),
    info: (msg, ctx) => lognog.devInfo(`[${scope}] ${msg}`, ctx),
    warn: (msg, ctx) => lognog.devWarn(`[${scope}] ${msg}`, ctx),
    error: (msg, ctx) => lognog.devError(`[${scope}] ${msg}`, ctx),
  }
}

// Pre-built loggers for common modules
export const logger = {
  api: createLogger('API'),
  gallery: createLogger('Gallery'),
  generation: createLogger('Generation'),
  auth: createLogger('Auth'),
  credits: createLogger('Credits'),
}
```

**Step 2: Verify build passes**

Run: `rm -rf .next && npm run build 2>&1 | grep -E "Compiled|Error"`
Expected: `Compiled successfully`

**Step 3: Commit**

```bash
git add src/lib/logger.ts
git commit -m "feat(logger): add scoped logger wrapper around lognog"
```

---

### Task 2: Migrate API Route Console Statements (334 statements)

**Files:**
- Modify: All files in `src/app/api/` with console.error/warn/log
- Reference: `src/lib/logger.ts`

**Step 1: Batch replace in API routes**

Pattern: `console.error('message', error)` → `logger.api.error('message', { error: error instanceof Error ? error.message : String(error) })`

Focus on the top 20 API routes by console count first:
- `src/app/api/generation/image/route.ts`
- `src/app/api/generation/video/route.ts`
- `src/app/api/gallery/save-frame/route.ts`
- `src/app/api/admin/financials/route.ts`
- `src/app/api/storyboard/*.ts`
- `src/app/api/storybook/*.ts`

**Step 2: Verify build passes**

Run: `rm -rf .next && npm run build`

**Step 3: Commit**

```bash
git add src/app/api/
git commit -m "refactor(api): replace console statements with scoped logger"
```

---

### Task 3: Migrate Feature Console Statements (696 statements)

**Files:**
- Modify: Files in `src/features/` and `src/lib/` with console.error/warn/log

**Step 1: Replace in services first** (highest value — structured error handling)

Priority order:
1. `src/lib/services/gallery.service.ts`
2. `src/features/credits/services/credits.service.ts`
3. `src/features/generation/` services
4. Component error handlers (try-catch blocks)

**Step 2: Leave deliberate dev-only console.log statements** that serve as debugging aids — prefix them with `// eslint-disable-next-line no-console` or convert to `logger.debug()`

**Step 3: Verify build + commit**

```bash
rm -rf .next && npm run build
git add src/features/ src/lib/
git commit -m "refactor(features): replace console statements with scoped logger"
```

---

## Phase 2: Split recipe.types.ts (Tasks 4-5)

### Task 4: Extract Recipe Constants, Parsing, and Samples

**Files:**
- Modify: `src/features/shot-creator/types/recipe.types.ts` (3,756 → ~230 lines)
- Create: `src/features/shot-creator/types/recipe-analysis.types.ts`
- Create: `src/features/shot-creator/types/recipe-tools.types.ts`
- Create: `src/features/shot-creator/services/recipe-parsing.ts`
- Create: `src/features/shot-creator/services/recipe-builder.ts`
- Create: `src/features/shot-creator/constants/recipe-constants.ts`
- Create: `src/features/shot-creator/constants/recipe-samples.ts`

**Step 1: Create the split files**

| New File | Content from recipe.types.ts | Lines |
|----------|------------------------------|-------|
| `recipe-analysis.types.ts` | `RecipeAnalysisType`, `RECIPE_ANALYSIS`, `RecipeAnalysisId` | ~40 lines |
| `recipe-tools.types.ts` | `RecipeToolOutputType`, `RECIPE_TOOLS`, `RecipeToolId` | ~55 lines |
| `recipe-parsing.ts` | `parseStageTemplate()`, `parseRecipeTemplate()`, `getAllFields()`, `getUniqueFieldsForForm()` | ~110 lines |
| `recipe-builder.ts` | `buildStagePrompt()`, `buildRecipePrompts()`, `calculateRecipeCost()`, `validateRecipe()` | ~165 lines |
| `recipe-constants.ts` | `COMMON_SELECT_OPTIONS`, `FRAME_TYPE_OPTIONS`, `HOLIDAY_OPTIONS`, `SYSTEM_TEMPLATE_URLS`, `DEFAULT_RECIPE_CATEGORIES` | ~45 lines |
| `recipe-samples.ts` | All 20+ system recipe definitions | ~1,250 lines |

**Step 2: Update recipe.types.ts to re-export**

Keep only core type definitions (~230 lines). Add barrel re-exports:
```typescript
export * from './recipe-analysis.types'
export * from './recipe-tools.types'
```

**Step 3: Update imports across codebase**

Find all files importing from `recipe.types` and verify they still work (barrel exports should cover most cases).

**Step 4: Build + commit**

```bash
rm -rf .next && npm run build
git add src/features/shot-creator/
git commit -m "refactor(recipes): split recipe.types.ts into focused modules"
```

---

### Task 5: Verify Recipe System Still Works

**Step 1: Run existing tests**

```bash
npx playwright test --grep recipe
```

**Step 2: Manual check** — Open shot creator, verify recipes load and execute

**Step 3: Commit any fixes**

---

## Phase 3: Split Stores (Tasks 6-7)

### Task 6: Split storyboard.store.ts into Slices

**Files:**
- Modify: `src/features/storyboard/store/storyboard.store.ts` (1,068 → ~200 lines)
- Create: `src/features/storyboard/store/slices/entity.slice.ts`
- Create: `src/features/storyboard/store/slices/generation.slice.ts`
- Create: `src/features/storyboard/store/slices/documentary.slice.ts`
- Create: `src/features/storyboard/store/slices/ui.slice.ts`

**Step 1: Create slice files**

Each slice exports a function `(set, get) => ({ ...state, ...actions })` that can be spread into the main store:

| Slice | State | Actions |
|-------|-------|---------|
| `entity.slice.ts` | characters, locations, styleGuides, shots, storyboards | CRUD for each entity type (~35 actions) |
| `generation.slice.ts` | broll, contactSheet, breakdown, prompts, extraction, images | Generation workflow (~30 actions) |
| `documentary.slice.ts` | documentaryMode, chapters, titleCards, brollPool | Nested chapter updates (~14 actions) |
| `ui.slice.ts` | tabs, settings, progress, collapse, viewMode, search | UI state + settings (~12 actions) |

**Step 2: Update main store to combine slices**

```typescript
// storyboard.store.ts
export const useStoryboardStore = create<StoryboardStore>()(
  persist(
    (set, get) => ({
      ...entitySlice(set, get),
      ...generationSlice(set, get),
      ...documentarySlice(set, get),
      ...uiSlice(set, get),
    }),
    { /* persist config */ }
  )
)
```

**Step 3: Build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storyboard/store/
git commit -m "refactor(storyboard): split store into entity/generation/documentary/ui slices"
```

---

### Task 7: Split storybook.store.ts into Slices

**Files:**
- Modify: `src/features/storybook/store/storybook.store.ts` (1,208 → ~250 lines)
- Create: `src/features/storybook/store/slices/project.slice.ts`
- Create: `src/features/storybook/store/slices/character.slice.ts`
- Create: `src/features/storybook/store/slices/education.slice.ts`
- Create: `src/features/storybook/store/slices/generation.slice.ts`

**Step 1: Create slice files**

| Slice | Content |
|-------|---------|
| `project.slice.ts` | Project CRUD, story text, pages, step navigation, initial state builders |
| `character.slice.ts` | Character detection (regex + helpers), character management, story characters (siblings/friends/pets) |
| `education.slice.ts` | Category, topic, structure, custom education settings |
| `generation.slice.ts` | Story ideas, approaches, generated stories, beats, spreads |

Also extract:
- `src/features/storybook/store/storybook.helpers.ts` — `parseGeneratedPages()`, `parsePagesFromText()`, `parseStructuredPages()`, COMMON_WORDS set

**Step 2: Combine in main store (same pattern as storyboard)**

**Step 3: Build + commit**

```bash
rm -rf .next && npm run build
git add src/features/storybook/store/
git commit -m "refactor(storybook): split store into project/character/education/generation slices"
```

---

## Phase 4: Split Oversized Components (Tasks 8-9)

### Task 8: Split RecipeBuilder.tsx

**Files:**
- Modify: `src/features/shot-creator/components/recipe/RecipeBuilder.tsx` (1,539 → ~500 lines)
- Create: `src/features/shot-creator/components/recipe/RecipeForm.tsx` (~550 lines)
- Create: `src/features/shot-creator/components/recipe/StageSection.tsx` (~320 lines)

**Step 1: Extract StageSection** (innermost, no dependents)

Move lines 1220-1538 to `StageSection.tsx`. Props:
```typescript
interface StageSectionProps {
  stage: RecipeStage
  stageIndex: number
  onUpdate: (index: number, updates: Partial<RecipeStage>) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  totalStages: number
}
```

**Step 2: Extract RecipeForm**

Move lines 990-1217 to `RecipeForm.tsx`. Import `StageSection`. Props:
```typescript
interface RecipeFormProps {
  mode: 'create' | 'edit'
  initialData?: Recipe
  onSave: (data: RecipeFormData) => void
  onCancel: () => void
}
```

**Step 3: Update RecipeBuilder** to import both

**Step 4: Build + commit**

```bash
rm -rf .next && npm run build
git add src/features/shot-creator/components/recipe/
git commit -m "refactor(recipe): extract RecipeForm and StageSection components"
```

---

### Task 9: Split PromptActions.tsx

**Files:**
- Modify: `src/features/shot-creator/components/creator-prompt-settings/PromptActions.tsx` (1,392 → ~300 lines)
- Create: `src/features/shot-creator/hooks/usePromptGeneration.ts` (~500 lines)
- Create: `src/features/shot-creator/hooks/useTextareaResize.ts` (~100 lines)

**Step 1: Extract useTextareaResize** (pure UI, zero dependencies)

Move drag-to-resize logic, height classes, size toggle. Returns:
```typescript
{ customHeight, textareaSize, setTextareaSize, getTextareaHeight, handleResizeMouseDown }
```

**Step 2: Extract usePromptGeneration** (the big one — 530 lines)

Move `handleGenerate` + all 4 generation modes + cost calculation + validation. Returns:
```typescript
{ handleGenerate, canGenerate, generationCost, isGenerating, cancelGeneration }
```

**Step 3: Update PromptActions** to use extracted hooks

**Step 4: Build + commit**

```bash
rm -rf .next && npm run build
git add src/features/shot-creator/
git commit -m "refactor(prompt): extract usePromptGeneration and useTextareaResize hooks"
```

---

## Phase 5: Final Verification (Task 10)

### Task 10: Full Build + Smoke Test

**Step 1: Clean build**
```bash
rm -rf .next && npm run build
```

**Step 2: Run Playwright tests**
```bash
npx playwright test
```

**Step 3: Manual smoke test**
- Shot Creator: create recipe, execute recipe, prompt generation
- Storyboard: story input → entities → style → generation
- Storybook: create project → generate story → view book

**Step 4: Final commit + push**
```bash
git add -A && git commit -m "refactor: complete codebase refactor sprint — logger + file splits"
git push origin main
```

---

## Summary

| Phase | Tasks | Effort | Impact |
|-------|-------|--------|--------|
| Logger | 1-3 | ~4 hours | -1,099 console.* calls |
| Recipe Types | 4-5 | ~2 hours | 3,756 → 7 files at ~200-500 each |
| Store Splits | 6-7 | ~3 hours | 2,276 → 9 slice files at ~200 each |
| Component Splits | 8-9 | ~3 hours | 2,931 → 5 files at ~300-500 each |
| Verification | 10 | ~1 hour | Confidence |
| **Total** | **10 tasks** | **~13 hours** | **7 files → 25+ focused modules** |
