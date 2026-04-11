# Recipe Authoring & Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the recipe system from pre-loaded built-ins to a user-driven system with a browsable catalog, clean default state, and a split-pane recipe editor.

**Architecture:** Leverage the existing `community_items` table (already supports `type='recipe'`, `bundled_wildcards`, `is_featured`, `is_official`, `add_count`) as the catalog backend. The existing `user_recipes` table remains the user's personal collection. New UI components: RecipeCatalogModal (browse/add), RecipeEditorModal (split-pane authoring), RecipeEmptyState. The RecipeBuilder in Prompt Tools is replaced by the new editor modal.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Zustand, Supabase, Lucide icons

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/features/shot-creator/components/recipe/RecipeCatalogModal.tsx` | Full-screen modal for browsing recipe catalog |
| `src/features/shot-creator/components/recipe/RecipeCatalogCard.tsx` | Individual recipe card in catalog grid |
| `src/features/shot-creator/components/recipe/RecipeCatalogDetail.tsx` | Expanded detail view when clicking a catalog card |
| `src/features/shot-creator/components/recipe/RecipeEditorModal.tsx` | Full-screen split-pane recipe editor |
| `src/features/shot-creator/components/recipe/RecipeTemplateEditor.tsx` | Left pane: template textarea with syntax highlighting |
| `src/features/shot-creator/components/recipe/RecipeLivePreview.tsx` | Right pane: live form preview + assembled prompt |
| `src/features/shot-creator/components/recipe/RecipeEmptyState.tsx` | Empty state shown when user has no recipes |
| `src/features/shot-creator/services/recipe-catalog.service.ts` | Catalog CRUD: fetch catalog items, add to collection, publish |
| `src/app/api/recipes/catalog/route.ts` | GET catalog recipes, POST add recipe to user collection |
| `src/app/api/recipes/catalog/[itemId]/route.ts` | GET single catalog item detail |
| `src/app/api/recipes/publish/route.ts` | POST publish a recipe to catalog |

### Modified Files
| File | Changes |
|------|---------|
| `src/features/shot-creator/components/recipe/QuickAccessBar.tsx` | Empty state text change, "+" opens catalog modal |
| `src/features/shot-creator/components/ShotCreator.tsx` | Add catalog/editor modal triggers, integrate empty state |
| `src/features/shot-creator/store/recipe.store.ts` | Add catalog state, modal visibility flags |
| `src/features/shot-creator/types/recipe-core.types.ts` | Add `source` field to Recipe interface |
| `src/features/shot-creator/services/recipe.service.ts` | Remove starter recipe seeding (seedStarterRecipes) |

---

## Phase 1: Foundation (Types, Services, API)

### Task 1: Extend Recipe Types

**Files:**
- Modify: `src/features/shot-creator/types/recipe-core.types.ts`

- [ ] **Step 1: Add source tracking to Recipe interface**

```typescript
// In recipe-core.types.ts, add to Recipe interface:
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  recipeNote?: string;
  stages: RecipeStage[];
  suggestedAspectRatio?: string;
  suggestedResolution?: string;
  suggestedModel?: string;
  quickAccessLabel?: string;
  isQuickAccess: boolean;
  categoryId?: string;
  requiresImage?: boolean;
  isSystem?: boolean;
  isSystemOnly?: boolean;
  source?: 'created' | 'catalog' | 'imported' | 'system';  // NEW
  sourceCatalogId?: string;  // NEW - points to community_items.id
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 2: Add CatalogRecipe interface**

Add below the Recipe interface in the same file:

```typescript
// A recipe as it appears in the catalog (from community_items table)
export interface CatalogRecipe {
  id: string;                    // community_items.id
  name: string;
  description?: string;
  category: string;
  tags: string[];
  content: {                     // The actual recipe data stored as JSONB
    stages: RecipeStage[];
    recipeNote?: string;
    suggestedModel?: string;
    suggestedAspectRatio?: string;
    suggestedResolution?: string;
    requiresImage?: boolean;
    categoryId?: string;
  };
  submittedByName: string;
  isOfficial: boolean;
  isFeatured: boolean;
  addCount: number;
  bundledWildcards: Array<{
    name: string;
    category: string;
    content: string[];
    description?: string;
  }>;
  previewImageUrl?: string;      // From content JSONB or separate field
  isAdded?: boolean;             // Client-side: whether user already has this recipe
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/types/recipe-core.types.ts
git commit -m "feat(recipes): add source tracking and CatalogRecipe types"
```

---

### Task 2: Catalog Service

**Files:**
- Create: `src/features/shot-creator/services/recipe-catalog.service.ts`

- [ ] **Step 1: Create the catalog service**

```typescript
/**
 * Recipe Catalog Service
 * Fetches recipes from community_items table for the catalog browser
 */

import { logger } from '@/lib/logger'
import type { CatalogRecipe } from '../types/recipe-core.types'

interface CatalogFilters {
  category?: string
  search?: string
  featured?: boolean
}

interface CatalogResponse {
  recipes: CatalogRecipe[]
  total: number
}

class RecipeCatalogService {
  /**
   * Fetch catalog recipes (approved community_items with type='recipe')
   */
  async getCatalogRecipes(filters?: CatalogFilters): Promise<CatalogResponse> {
    try {
      const params = new URLSearchParams()
      if (filters?.category) params.set('category', filters.category)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.featured) params.set('featured', 'true')

      const response = await fetch(`/api/recipes/catalog?${params.toString()}`)
      if (!response.ok) {
        logger.shotCreator.error('Error fetching catalog recipes', { status: response.status })
        return { recipes: [], total: 0 }
      }
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error fetching catalog', { error: error instanceof Error ? error.message : String(error) })
      return { recipes: [], total: 0 }
    }
  }

  /**
   * Get a single catalog recipe by ID
   */
  async getCatalogRecipe(itemId: string): Promise<CatalogRecipe | null> {
    try {
      const response = await fetch(`/api/recipes/catalog/${itemId}`)
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error fetching catalog recipe', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Add a catalog recipe to the user's personal collection
   * Creates a copy in user_recipes table
   */
  async addToCollection(catalogItemId: string): Promise<{ recipeId: string } | null> {
    try {
      const response = await fetch('/api/recipes/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogItemId }),
      })
      if (!response.ok) {
        const err = await response.json()
        logger.shotCreator.error('Error adding catalog recipe', { error: err })
        return null
      }
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error adding to collection', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Publish a user recipe to the catalog
   */
  async publishRecipe(recipeId: string, opts: {
    visibility: 'public' | 'unlisted'
    previewImageUrl?: string
  }): Promise<{ catalogItemId: string } | null> {
    try {
      const response = await fetch('/api/recipes/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, ...opts }),
      })
      if (!response.ok) return null
      return await response.json()
    } catch (error) {
      logger.shotCreator.error('Error publishing recipe', { error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }
}

export const recipeCatalogService = new RecipeCatalogService()
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/services/recipe-catalog.service.ts
git commit -m "feat(recipes): add catalog service for browsing and adding recipes"
```

---

### Task 3: Catalog API Routes

**Files:**
- Create: `src/app/api/recipes/catalog/route.ts`
- Create: `src/app/api/recipes/catalog/[itemId]/route.ts`

- [ ] **Step 1: Create GET /api/recipes/catalog**

```typescript
// src/app/api/recipes/catalog/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const featured = searchParams.get('featured') === 'true'

  const supabase = await getClient()

  // Get current user's recipe IDs to mark "isAdded"
  let userRecipeSourceIds: string[] = []
  try {
    const authClient = createRouteHandlerClient({ cookies })
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      // We'll check user_recipes for source_catalog_id matches
      const { data: userRecipes } = await supabase
        .from('user_recipes')
        .select('name')
        .eq('user_id', user.id)

      if (userRecipes) {
        userRecipeSourceIds = userRecipes.map((r: { name: string }) => r.name)
      }
    }
  } catch {
    // Not authenticated — that's fine, just don't mark isAdded
  }

  // Query community_items for approved recipes
  let query = supabase
    .from('community_items')
    .select('*')
    .eq('type', 'recipe')
    .eq('status', 'approved')
    .order('is_featured', { ascending: false })
    .order('add_count', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
  if (featured) {
    query = query.eq('is_featured', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recipes = (data || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    tags: item.tags || [],
    content: item.content,
    submittedByName: item.submitted_by_name,
    isOfficial: item.is_official || false,
    isFeatured: item.is_featured || false,
    addCount: item.add_count || 0,
    bundledWildcards: item.bundled_wildcards || [],
    previewImageUrl: (item.content as Record<string, unknown>)?.previewImageUrl,
    isAdded: userRecipeSourceIds.includes(item.name as string),
  }))

  return NextResponse.json({ recipes, total: recipes.length })
}

export async function POST(request: NextRequest) {
  const authClient = createRouteHandlerClient({ cookies })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { catalogItemId } = await request.json()
  if (!catalogItemId) {
    return NextResponse.json({ error: 'catalogItemId required' }, { status: 400 })
  }

  const supabase = await getClient()

  // Fetch the catalog item
  const { data: item, error: fetchError } = await supabase
    .from('community_items')
    .select('*')
    .eq('id', catalogItemId)
    .eq('type', 'recipe')
    .single()

  if (fetchError || !item) {
    return NextResponse.json({ error: 'Recipe not found in catalog' }, { status: 404 })
  }

  const content = item.content as Record<string, unknown>

  // Create a copy in user_recipes
  const { data: newRecipe, error: insertError } = await supabase
    .from('user_recipes')
    .insert({
      user_id: user.id,
      name: item.name,
      description: item.description || null,
      recipe_note: (content.recipeNote as string) || null,
      stages: content.stages || [],
      suggested_model: (content.suggestedModel as string) || null,
      suggested_aspect_ratio: (content.suggestedAspectRatio as string) || null,
      suggested_resolution: (content.suggestedResolution as string) || null,
      category_id: (content.categoryId as string) || null,
      requires_image: content.requiresImage ?? true,
      is_quick_access: false,
      is_system: false,
      is_system_only: false,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Increment add_count on the catalog item
  await supabase.rpc('increment_community_add_count', { item_id: catalogItemId })

  // Import bundled wildcards if any
  const bundledWildcards = (item.bundled_wildcards || []) as Array<{
    name: string; category: string; content: string[]; description?: string
  }>
  if (bundledWildcards.length > 0) {
    for (const wc of bundledWildcards) {
      // Check if user already has this wildcard
      const { data: existing } = await supabase
        .from('user_wildcards')
        .select('id, content')
        .eq('user_id', user.id)
        .eq('name', wc.name)
        .single()

      if (existing) {
        // Merge: add new entries that don't exist
        const existingContent = (existing.content || []) as string[]
        const newEntries = wc.content.filter((e: string) => !existingContent.includes(e))
        if (newEntries.length > 0) {
          await supabase
            .from('user_wildcards')
            .update({ content: [...existingContent, ...newEntries] })
            .eq('id', existing.id)
        }
      } else {
        // Create new wildcard
        await supabase
          .from('user_wildcards')
          .insert({
            user_id: user.id,
            name: wc.name,
            category: wc.category,
            description: wc.description || null,
            content: wc.content,
          })
      }
    }
  }

  return NextResponse.json({ recipeId: newRecipe.id })
}
```

- [ ] **Step 2: Create GET /api/recipes/catalog/[itemId]**

```typescript
// src/app/api/recipes/catalog/[itemId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { itemId } = await params
  const supabase = await getClient()

  const { data: item, error } = await supabase
    .from('community_items')
    .select('*')
    .eq('id', itemId)
    .eq('type', 'recipe')
    .eq('status', 'approved')
    .single()

  if (error || !item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    tags: item.tags || [],
    content: item.content,
    submittedByName: item.submitted_by_name,
    isOfficial: item.is_official || false,
    isFeatured: item.is_featured || false,
    addCount: item.add_count || 0,
    bundledWildcards: item.bundled_wildcards || [],
    previewImageUrl: (item.content as Record<string, unknown>)?.previewImageUrl,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/recipes/catalog/route.ts src/app/api/recipes/catalog/\[itemId\]/route.ts
git commit -m "feat(recipes): add catalog API routes for browsing and adding recipes"
```

---

### Task 4: Publish API Route

**Files:**
- Create: `src/app/api/recipes/publish/route.ts`

- [ ] **Step 1: Create POST /api/recipes/publish**

```typescript
// src/app/api/recipes/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const authClient = createRouteHandlerClient({ cookies })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { recipeId, visibility, previewImageUrl } = await request.json()
  if (!recipeId) {
    return NextResponse.json({ error: 'recipeId required' }, { status: 400 })
  }

  const supabase = await getClient()

  // Fetch the user's recipe
  const { data: recipe, error: fetchError } = await supabase
    .from('user_recipes')
    .select('*')
    .eq('id', recipeId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !recipe) {
    return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
  }

  // Build catalog content
  const content = {
    stages: recipe.stages,
    recipeNote: recipe.recipe_note,
    suggestedModel: recipe.suggested_model,
    suggestedAspectRatio: recipe.suggested_aspect_ratio,
    suggestedResolution: recipe.suggested_resolution,
    requiresImage: recipe.requires_image,
    categoryId: recipe.category_id,
    previewImageUrl: previewImageUrl || null,
  }

  // Scan template for wildcard references and bundle them
  const bundledWildcards: Array<{ name: string; category: string; content: string[]; description?: string }> = []
  const wildcardRegex = /<<\w+:wildcard\(([^,)]+)/g
  const templates = (recipe.stages as Array<{ template: string }>).map((s) => s.template).join(' ')
  const wildcardNames = new Set<string>()

  let match
  while ((match = wildcardRegex.exec(templates)) !== null) {
    wildcardNames.add(match[1])
  }

  if (wildcardNames.size > 0) {
    const { data: wildcards } = await supabase
      .from('user_wildcards')
      .select('name, category, content, description')
      .eq('user_id', user.id)
      .in('name', Array.from(wildcardNames))

    if (wildcards) {
      bundledWildcards.push(...wildcards)
    }
  }

  // Get user profile name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  const authorName = profile?.display_name || profile?.username || 'Anonymous'

  // Insert into community_items
  const { data: catalogItem, error: insertError } = await supabase
    .from('community_items')
    .insert({
      type: 'recipe',
      name: recipe.name,
      description: recipe.description || null,
      category: recipe.category_id || 'custom',
      tags: [],
      content,
      submitted_by: user.id,
      submitted_by_name: authorName,
      status: visibility === 'unlisted' ? 'approved' : 'pending',
      bundled_wildcards: bundledWildcards,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ catalogItemId: catalogItem.id })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/recipes/publish/route.ts
git commit -m "feat(recipes): add publish API route with wildcard bundling"
```

---

## Phase 2: Clean Default State

### Task 5: Remove Starter Recipe Seeding

**Files:**
- Modify: `src/features/shot-creator/services/recipe.service.ts:520-580`

- [ ] **Step 1: Replace seedStarterRecipes with a no-op**

In `recipe.service.ts`, find the `seedStarterRecipes` method (around line 508) and replace it:

```typescript
  /**
   * Seed starter recipes for new users
   * @deprecated No longer seeds recipes — users add from catalog instead
   */
  async seedStarterRecipes(_userId: string): Promise<void> {
    // No-op: users now start with zero recipes and add from catalog
    return
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/services/recipe.service.ts
git commit -m "feat(recipes): disable auto-seeding, users start with clean slate"
```

---

### Task 6: Recipe Empty State Component

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeEmptyState.tsx`

- [ ] **Step 1: Create the empty state component**

```tsx
'use client'

import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RecipeEmptyStateProps {
  onBrowseCatalog: () => void
  onCreateRecipe: () => void
}

export function RecipeEmptyState({ onBrowseCatalog, onCreateRecipe }: RecipeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-cyan-400" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">No recipes yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Browse the catalog to add pre-made recipes, or create your own from scratch.
      </p>

      <div className="flex gap-3">
        <Button
          onClick={onBrowseCatalog}
          className="bg-cyan-600 hover:bg-cyan-500 text-white"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Browse Catalog
        </Button>
        <Button
          variant="outline"
          onClick={onCreateRecipe}
          className="border-border text-muted-foreground hover:text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Recipe
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeEmptyState.tsx
git commit -m "feat(recipes): add empty state component for zero-recipe users"
```

---

### Task 7: Update QuickAccessBar for Empty State

**Files:**
- Modify: `src/features/shot-creator/components/recipe/QuickAccessBar.tsx`

- [ ] **Step 1: Update empty state text and "+" action**

Replace the entire `QuickAccessBar.tsx` content:

```tsx
'use client'

import { useRecipeStore } from '../../store/recipe.store'
import { Button } from '@/components/ui/button'
import { X, FlaskConical } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useState } from 'react'

interface QuickAccessBarProps {
  onSelectRecipe: (recipeId: string) => void
  onOpenCatalog: () => void
  className?: string
}

export function QuickAccessBar({
  onSelectRecipe,
  onOpenCatalog,
  className,
}: QuickAccessBarProps) {
  const {
    quickAccessItems,
    removeFromQuickAccess,
    setActiveRecipe,
  } = useRecipeStore()

  const [isManaging, setIsManaging] = useState(false)

  const handleRecipeClick = (recipeId: string) => {
    setActiveRecipe(recipeId)
    onSelectRecipe(recipeId)
  }

  const recipeItems = quickAccessItems
    .filter((item) => item.type === 'recipe' && item.recipeId)
    .sort((a, b) => a.order - b.order)

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
        <FlaskConical className="w-3 h-3" />
        Recipes:
      </span>

      {recipeItems.length === 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenCatalog}
          className="h-7 px-3 text-xs text-muted-foreground hover:text-white"
        >
          + Add recipes from catalog
        </Button>
      ) : (
        <>
          {recipeItems.map((item) => (
            <div key={item.id} className="relative group">
              <Button
                variant="outline"
                size="sm"
                onClick={() => item.recipeId && handleRecipeClick(item.recipeId)}
                className={cn(
                  'h-7 px-3 text-xs font-medium',
                  'bg-card hover:bg-amber-500/20 border-border',
                  'border-l-2 border-l-amber-500',
                  'transition-all duration-150'
                )}
              >
                {item.label}
              </Button>

              {isManaging && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQuickAccess(item.id)
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/90"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => isManaging ? setIsManaging(false) : onOpenCatalog()}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
          >
            {isManaging ? 'Done' : '+'}
          </Button>

          {recipeItems.length > 0 && !isManaging && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsManaging(true)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-white"
            >
              Edit
            </Button>
          )}
        </>
      )}
    </div>
  )
}
```

Key changes:
- New prop `onOpenCatalog` replaces the old `setActiveTab('prompt-tools')` navigation
- Empty state says "Add recipes from catalog" and opens catalog modal
- "+" button opens catalog modal instead of navigating to Prompt Tools

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/QuickAccessBar.tsx
git commit -m "feat(recipes): update QuickAccessBar to open catalog instead of Prompt Tools"
```

---

## Phase 3: Recipe Catalog Modal

### Task 8: Catalog Card Component

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeCatalogCard.tsx`

- [ ] **Step 1: Create the catalog card**

```tsx
'use client'

import { Check, Plus, Star, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import type { CatalogRecipe } from '../../types/recipe-core.types'

interface RecipeCatalogCardProps {
  recipe: CatalogRecipe
  onAdd: (recipe: CatalogRecipe) => void
  onClick: (recipe: CatalogRecipe) => void
  isAdding?: boolean
}

export function RecipeCatalogCard({ recipe, onAdd, onClick, isAdding }: RecipeCatalogCardProps) {
  const stageCount = recipe.content?.stages?.length || 1

  return (
    <div
      onClick={() => onClick(recipe)}
      className={cn(
        'group relative rounded-xl border border-border bg-card',
        'hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5',
        'transition-all duration-200 cursor-pointer overflow-hidden'
      )}
    >
      {/* Preview image or placeholder */}
      <div className="aspect-[16/10] bg-muted/30 flex items-center justify-center relative overflow-hidden">
        {recipe.previewImageUrl ? (
          <img
            src={recipe.previewImageUrl}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FlaskConical className="w-10 h-10 text-muted-foreground/30" />
        )}

        {/* Featured badge */}
        {recipe.isFeatured && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-semibold">
            <Star className="w-3 h-3" />
            Featured
          </div>
        )}

        {/* Official badge */}
        {recipe.isOfficial && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-cyan-500/90 text-black text-[10px] font-semibold">
            Official
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate">{recipe.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
          {recipe.description || 'No description'}
        </p>

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted/50">{stageCount} stage{stageCount !== 1 ? 's' : ''}</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/50">{recipe.category}</span>
          {recipe.addCount > 0 && (
            <span>{recipe.addCount} added</span>
          )}
        </div>

        {/* Add button */}
        <div className="mt-3">
          {recipe.isAdded ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="w-full h-7 text-xs text-cyan-400 border-cyan-500/30"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Added
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onAdd(recipe)
              }}
              disabled={isAdding}
              className="w-full h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeCatalogCard.tsx
git commit -m "feat(recipes): add catalog card component"
```

---

### Task 9: Catalog Detail Panel

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeCatalogDetail.tsx`

- [ ] **Step 1: Create the detail panel**

```tsx
'use client'

import { X, Plus, Check, FlaskConical, Layers, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CatalogRecipe } from '../../types/recipe-core.types'
import { parseStageTemplate } from '../../types/recipe-utils'

interface RecipeCatalogDetailProps {
  recipe: CatalogRecipe
  onClose: () => void
  onAdd: (recipe: CatalogRecipe) => void
  isAdding?: boolean
}

export function RecipeCatalogDetail({ recipe, onClose, onAdd, isAdding }: RecipeCatalogDetailProps) {
  const stages = recipe.content?.stages || []
  const allFields = stages.flatMap((stage, idx) => parseStageTemplate(stage.template, idx))

  // Deduplicate fields by name
  const uniqueFields = allFields.filter(
    (field, idx, arr) => arr.findIndex(f => f.name === field.name) === idx
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {recipe.isFeatured && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
                  <Star className="w-3 h-3" /> Featured
                </span>
              )}
              {recipe.isOfficial && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-semibold">
                  Official
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{recipe.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              By {recipe.submittedByName} · {recipe.addCount} added · {recipe.category}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Recipe note */}
          {recipe.content?.recipeNote && (
            <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-sm text-cyan-300">{recipe.content.recipeNote}</p>
            </div>
          )}

          {/* Fields the user will fill out */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-cyan-400" />
              Fields ({uniqueFields.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {uniqueFields.map((field) => (
                <div
                  key={field.id}
                  className="px-3 py-2 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-white">{field.label}</span>
                    {field.required && <span className="text-[10px] text-red-400">*</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{field.type}</span>
                  {field.type === 'select' && field.options && (
                    <span className="text-[10px] text-muted-foreground ml-1">
                      ({field.options.length} options)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline visualization */}
          {stages.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Pipeline ({stages.length} stages)
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {stages.map((stage, idx) => (
                  <div key={stage.id || idx} className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-xs text-white">
                      Stage {idx + 1}: {stage.type || 'generation'}
                      {stage.toolId && ` (${stage.toolId})`}
                    </div>
                    {idx < stages.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bundled wildcards */}
          {recipe.bundledWildcards.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">
                Bundled Wildcards ({recipe.bundledWildcards.length})
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                These wildcard entries will be added to your library when you add this recipe.
              </p>
              <div className="flex flex-wrap gap-2">
                {recipe.bundledWildcards.map((wc, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded bg-muted/30 text-xs text-muted-foreground"
                  >
                    {wc.name} ({wc.content.length} entries)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {recipe.content?.suggestedModel && (
              <span className="px-2 py-1 rounded bg-muted/30">Model: {recipe.content.suggestedModel}</span>
            )}
            {recipe.content?.suggestedAspectRatio && (
              <span className="px-2 py-1 rounded bg-muted/30">Aspect: {recipe.content.suggestedAspectRatio}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border">
          {recipe.isAdded ? (
            <Button disabled className="w-full bg-muted text-cyan-400">
              <Check className="w-4 h-4 mr-2" />
              Already in your collection
            </Button>
          ) : (
            <Button
              onClick={() => onAdd(recipe)}
              disabled={isAdding}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAdding ? 'Adding to collection...' : 'Add to My Recipes'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeCatalogDetail.tsx
git commit -m "feat(recipes): add catalog detail panel with fields and pipeline visualization"
```

---

### Task 10: Catalog Modal

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeCatalogModal.tsx`

- [ ] **Step 1: Create the catalog modal**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import { recipeCatalogService } from '../../services/recipe-catalog.service'
import { RecipeCatalogCard } from './RecipeCatalogCard'
import { RecipeCatalogDetail } from './RecipeCatalogDetail'
import { useRecipeStore } from '../../store/recipe.store'
import type { CatalogRecipe } from '../../types/recipe-core.types'
import { DEFAULT_RECIPE_CATEGORIES } from '../../types/recipe-categories.types'

interface RecipeCatalogModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RecipeCatalogModal({ isOpen, onClose }: RecipeCatalogModalProps) {
  const [recipes, setRecipes] = useState<CatalogRecipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<CatalogRecipe | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const { refreshRecipes } = useRecipeStore()

  const categories = DEFAULT_RECIPE_CATEGORIES.filter(c => !c.isDefault || c.name !== 'Custom')

  const loadRecipes = useCallback(async () => {
    setIsLoading(true)
    const result = await recipeCatalogService.getCatalogRecipes({
      category: activeCategory || undefined,
      search: search || undefined,
    })
    setRecipes(result.recipes)
    setIsLoading(false)
  }, [activeCategory, search])

  useEffect(() => {
    if (isOpen) loadRecipes()
  }, [isOpen, loadRecipes])

  const handleAdd = async (recipe: CatalogRecipe) => {
    setAddingId(recipe.id)
    const result = await recipeCatalogService.addToCollection(recipe.id)
    if (result) {
      // Mark as added locally
      setRecipes(prev => prev.map(r =>
        r.id === recipe.id ? { ...r, isAdded: true, addCount: r.addCount + 1 } : r
      ))
      if (selectedRecipe?.id === recipe.id) {
        setSelectedRecipe({ ...selectedRecipe, isAdded: true, addCount: selectedRecipe.addCount + 1 })
      }
      // Refresh user's recipe list
      await refreshRecipes()
    }
    setAddingId(null)
  }

  if (!isOpen) return null

  // Group recipes: featured first, then by category
  const featured = recipes.filter(r => r.isFeatured)
  const byCategory = new Map<string, CatalogRecipe[]>()
  for (const recipe of recipes) {
    if (!recipe.isFeatured) {
      const cat = recipe.category || 'Other'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(recipe)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95">
        <h1 className="text-xl font-bold text-white">Recipe Catalog</h1>
        <button onClick={onClose} className="p-2 hover:bg-muted/50 rounded-lg">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Search + Filters */}
      <div className="px-6 py-3 border-b border-border bg-card/80 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveCategory(null)}
            className={cn(
              'h-8 px-3 text-xs shrink-0',
              !activeCategory ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted-foreground'
            )}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                'h-8 px-3 text-xs shrink-0',
                activeCategory === cat.name ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted-foreground'
              )}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">No recipes found</p>
            {search && (
              <Button variant="ghost" onClick={() => setSearch('')} className="mt-2 text-cyan-400">
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured section */}
            {featured.length > 0 && !activeCategory && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Featured</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featured.map(recipe => (
                    <RecipeCatalogCard
                      key={recipe.id}
                      recipe={recipe}
                      onAdd={handleAdd}
                      onClick={setSelectedRecipe}
                      isAdding={addingId === recipe.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Category sections */}
            {Array.from(byCategory.entries()).map(([category, categoryRecipes]) => (
              <div key={category}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">{category}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryRecipes.map(recipe => (
                    <RecipeCatalogCard
                      key={recipe.id}
                      recipe={recipe}
                      onAdd={handleAdd}
                      onClick={setSelectedRecipe}
                      isAdding={addingId === recipe.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedRecipe && (
        <RecipeCatalogDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onAdd={handleAdd}
          isAdding={addingId === selectedRecipe.id}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeCatalogModal.tsx
git commit -m "feat(recipes): add full-screen catalog modal with search, categories, and cards"
```

---

## Phase 4: Recipe Editor Modal

### Task 11: Template Editor Component (Left Pane)

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeTemplateEditor.tsx`

- [ ] **Step 1: Create the template editor with syntax highlighting**

```tsx
'use client'

import { useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecipeStage } from '../../types/recipe-stage.types'
import { RECIPE_TOOLS } from '../../types/recipe-tools.types'
import { RECIPE_ANALYSIS } from '../../types/recipe-analysis.types'

interface RecipeTemplateEditorProps {
  stages: RecipeStage[]
  recipeName: string
  recipeDescription: string
  recipeNote: string
  suggestedModel: string
  suggestedAspectRatio: string
  suggestedResolution: string
  categoryId: string
  requiresImage: boolean
  onStageTemplateChange: (stageId: string, template: string) => void
  onStageTypeChange: (stageId: string, type: 'generation' | 'tool' | 'analysis') => void
  onStageToolChange: (stageId: string, toolId: string) => void
  onAddStage: () => void
  onRemoveStage: (stageId: string) => void
  onMoveStage: (stageId: string, direction: 'up' | 'down') => void
  onMetadataChange: (field: string, value: string | boolean) => void
}

// Highlight <<FIELD:type>> tokens in the textarea using an overlay
function HighlightedOverlay({ text }: { text: string }) {
  const parts = useMemo(() => {
    const regex = /(<<[^>]+>>)/g
    return text.split(regex)
  }, [text])

  return (
    <div className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words font-mono text-sm leading-relaxed p-3 text-transparent">
      {parts.map((part, i) =>
        part.startsWith('<<') && part.endsWith('>>') ? (
          <span key={i} className="bg-cyan-500/20 text-cyan-300 rounded px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  )
}

export function RecipeTemplateEditor({
  stages,
  recipeName,
  recipeDescription,
  recipeNote,
  suggestedModel,
  suggestedAspectRatio,
  suggestedResolution,
  categoryId,
  requiresImage,
  onStageTemplateChange,
  onStageTypeChange,
  onStageToolChange,
  onAddStage,
  onRemoveStage,
  onMoveStage,
  onMetadataChange,
}: RecipeTemplateEditorProps) {
  const insertFieldRef = useRef<HTMLTextAreaElement | null>(null)

  const insertField = useCallback((type: string) => {
    const textarea = insertFieldRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const fieldName = type === 'select' ? 'FIELD_NAME:select(option1,option2,option3)' :
                      type === 'wildcard' ? 'FIELD_NAME:wildcard(wildcard_name,browse)' :
                      type === 'name' ? 'FIELD_NAME:name!' :
                      'FIELD_NAME:text'
    const insert = `<<${fieldName}>>`
    const newValue = textarea.value.substring(0, start) + insert + textarea.value.substring(end)

    // Find which stage this textarea belongs to and update
    const stageId = textarea.dataset.stageId
    if (stageId) {
      onStageTemplateChange(stageId, newValue)
    }

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + insert.length, start + insert.length)
    })
  }, [onStageTemplateChange])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Stages */}
      <div className="flex-1 space-y-4 p-4">
        {stages.map((stage, idx) => (
          <div key={stage.id} className="rounded-xl border border-border bg-muted/10">
            {/* Stage header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                <span className="text-xs font-semibold text-white">Stage {idx + 1}</span>

                {/* Stage type selector */}
                <select
                  value={stage.type || 'generation'}
                  onChange={(e) => onStageTypeChange(stage.id, e.target.value as 'generation' | 'tool' | 'analysis')}
                  className="h-6 px-2 text-[10px] bg-muted/30 border border-border rounded text-muted-foreground"
                >
                  <option value="generation">Generation</option>
                  <option value="tool">Tool</option>
                  <option value="analysis">Analysis</option>
                </select>

                {/* Tool/analysis selector */}
                {stage.type === 'tool' && (
                  <select
                    value={stage.toolId || ''}
                    onChange={(e) => onStageToolChange(stage.id, e.target.value)}
                    className="h-6 px-2 text-[10px] bg-muted/30 border border-border rounded text-muted-foreground"
                  >
                    <option value="">Select tool...</option>
                    {Object.values(RECIPE_TOOLS).map(tool => (
                      <option key={tool.id} value={tool.id}>{tool.name}</option>
                    ))}
                  </select>
                )}
                {stage.type === 'analysis' && (
                  <select
                    value={stage.analysisId || ''}
                    onChange={(e) => onStageToolChange(stage.id, e.target.value)}
                    className="h-6 px-2 text-[10px] bg-muted/30 border border-border rounded text-muted-foreground"
                  >
                    <option value="">Select analysis...</option>
                    {Object.values(RECIPE_ANALYSIS).map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-1">
                {stages.length > 1 && (
                  <>
                    <button
                      onClick={() => onMoveStage(stage.id, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-muted/50 rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => onMoveStage(stage.id, 'down')}
                      disabled={idx === stages.length - 1}
                      className="p-1 hover:bg-muted/50 rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => onRemoveStage(stage.id)}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Template textarea with syntax highlighting overlay */}
            <div className="relative">
              <HighlightedOverlay text={stage.template} />
              <textarea
                ref={el => { if (idx === 0) insertFieldRef.current = el }}
                data-stage-id={stage.id}
                value={stage.template}
                onChange={(e) => onStageTemplateChange(stage.id, e.target.value)}
                placeholder="Write your prompt template here. Use <<FIELD_NAME:type>> for variables..."
                className="w-full min-h-[160px] p-3 bg-transparent text-white font-mono text-sm leading-relaxed resize-y border-0 focus:outline-none focus:ring-0 relative z-10"
                style={{ caretColor: 'white' }}
              />
            </div>

            {/* Insert field buttons */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground mr-1">Insert:</span>
              {['text', 'name', 'select', 'wildcard'].map(type => (
                <button
                  key={type}
                  onClick={() => insertField(type)}
                  className="px-2 py-0.5 text-[10px] rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={onAddStage}
          className="w-full border-dashed border-border text-muted-foreground hover:text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Stage
        </Button>
      </div>

      {/* Recipe Settings */}
      <div className="border-t border-border p-4 space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Name *</label>
            <input
              value={recipeName}
              onChange={(e) => onMetadataChange('name', e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Category</label>
            <select
              value={categoryId}
              onChange={(e) => onMetadataChange('categoryId', e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">None</option>
              <option value="characters">Characters</option>
              <option value="scenes">Scenes</option>
              <option value="environments">Environments</option>
              <option value="narrative">Narrative</option>
              <option value="style-transfers">Style Transfers</option>
              <option value="products">Products</option>
              <option value="artists">Artists</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground">Description</label>
          <input
            value={recipeDescription}
            onChange={(e) => onMetadataChange('description', e.target.value)}
            placeholder="Brief description for the catalog..."
            className="w-full mt-0.5 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground">Recipe Note (shown to user when activated)</label>
          <textarea
            value={recipeNote}
            onChange={(e) => onMetadataChange('recipeNote', e.target.value)}
            placeholder="Instructions for using this recipe..."
            rows={2}
            className="w-full mt-0.5 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground">Model</label>
            <select
              value={suggestedModel}
              onChange={(e) => onMetadataChange('suggestedModel', e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Default</option>
              <option value="nano-banana-2">Nano Banana 2</option>
              <option value="z-image-turbo">Z-Image Turbo</option>
              <option value="flux-dev">Flux Dev</option>
              <option value="flux-schnell">Flux Schnell</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Aspect Ratio</label>
            <select
              value={suggestedAspectRatio}
              onChange={(e) => onMetadataChange('suggestedAspectRatio', e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Default</option>
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="21:9">21:9</option>
              <option value="3:2">3:2</option>
              <option value="2:3">2:3</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Resolution</label>
            <select
              value={suggestedResolution}
              onChange={(e) => onMetadataChange('suggestedResolution', e.target.value)}
              className="w-full mt-0.5 px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="">Default</option>
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresImage}
            onChange={(e) => onMetadataChange('requiresImage', e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Requires reference image</span>
        </label>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeTemplateEditor.tsx
git commit -m "feat(recipes): add template editor with syntax highlighting and field insertion"
```

---

### Task 12: Live Preview Component (Right Pane)

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeLivePreview.tsx`

- [ ] **Step 1: Create the live preview pane**

```tsx
'use client'

import { useMemo, useState } from 'react'
import type { RecipeStage } from '../../types/recipe-stage.types'
import { parseStageTemplate, buildRecipePrompts } from '../../types/recipe-utils'
import type { RecipeField, RecipeFieldValues } from '../../types/recipe-field.types'
import { FlaskConical } from 'lucide-react'

interface RecipeLivePreviewProps {
  stages: RecipeStage[]
  recipeName: string
}

export function RecipeLivePreview({ stages, recipeName }: RecipeLivePreviewProps) {
  const [testValues, setTestValues] = useState<RecipeFieldValues>({})

  // Parse all fields from all stages
  const allFields = useMemo(() => {
    const fields: RecipeField[] = []
    stages.forEach((stage, idx) => {
      const parsed = parseStageTemplate(stage.template, idx)
      for (const field of parsed) {
        // Deduplicate by field name
        if (!fields.find(f => f.name === field.name)) {
          fields.push(field)
        }
      }
    })
    return fields
  }, [stages])

  // Build the assembled prompt preview
  const assembledPrompt = useMemo(() => {
    if (stages.length === 0) return ''
    try {
      const fakeRecipe = {
        id: 'preview',
        name: recipeName,
        stages: stages.map((s, idx) => ({
          ...s,
          fields: parseStageTemplate(s.template, idx),
        })),
        isQuickAccess: false,
        createdAt: 0,
        updatedAt: 0,
      }
      const result = buildRecipePrompts(fakeRecipe, testValues)
      return result.prompts[0] || ''
    } catch {
      return '(error building prompt preview)'
    }
  }, [stages, testValues, recipeName])

  const requiredFields = allFields.filter(f => f.required)
  const optionalFields = allFields.filter(f => !f.required)

  if (allFields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <FlaskConical className="w-12 h-12 text-muted-foreground/20 mb-4" />
        <p className="text-sm text-muted-foreground">
          Add <code className="px-1.5 py-0.5 bg-muted/30 rounded text-cyan-400 text-xs">&lt;&lt;FIELD:type&gt;&gt;</code> tokens to your template to see the form preview.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Form Preview */}
      <div className="p-4 space-y-4 flex-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Form Preview — What users will see
        </h3>

        {/* Required fields */}
        {requiredFields.length > 0 && (
          <div className="space-y-3">
            {requiredFields.map(field => (
              <FieldPreview
                key={field.id}
                field={field}
                value={testValues[field.id] || ''}
                onChange={(val) => setTestValues(prev => ({ ...prev, [field.id]: val }))}
              />
            ))}
          </div>
        )}

        {/* Optional fields */}
        {optionalFields.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Optional</p>
            {optionalFields.map(field => (
              <FieldPreview
                key={field.id}
                field={field}
                value={testValues[field.id] || ''}
                onChange={(val) => setTestValues(prev => ({ ...prev, [field.id]: val }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Assembled Prompt Preview */}
      <div className="border-t border-border p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Assembled Prompt Preview
        </h3>
        <div className="p-3 rounded-lg bg-muted/20 border border-border font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {assembledPrompt || '(fill in fields above to see the assembled prompt)'}
        </div>
      </div>
    </div>
  )
}

// Individual field preview component
function FieldPreview({
  field,
  value,
  onChange,
}: {
  field: RecipeField
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-white flex items-center gap-1">
        {field.label}
        {field.required && <span className="text-red-400">*</span>}
        <span className="text-[10px] text-muted-foreground/60 ml-1">{field.type}</span>
      </label>

      {field.type === 'select' && field.options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">Select...</option>
          {field.options.map(opt => {
            // Check for category header
            if (opt.startsWith('---') && opt.endsWith('---')) {
              return (
                <option key={opt} disabled className="font-bold">
                  {opt.replace(/---/g, '').trim()}
                </option>
              )
            }
            return <option key={opt} value={opt}>{opt}</option>
          })}
        </select>
      ) : field.type === 'name' ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'Enter name...'}
          maxLength={30}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50"
        />
      ) : field.type === 'wildcard' ? (
        <div className="mt-1 px-2 py-1.5 text-sm bg-muted/20 border border-border rounded-lg text-muted-foreground/60 italic">
          Wildcard: {field.wildcardName || 'unknown'} ({field.wildcardMode || 'browse'})
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'Enter text...'}
          rows={2}
          className="w-full mt-1 px-2 py-1.5 text-sm bg-muted/30 border border-border rounded-lg text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-cyan-500/50 resize-none"
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeLivePreview.tsx
git commit -m "feat(recipes): add live form preview with assembled prompt display"
```

---

### Task 13: Recipe Editor Modal (Main Shell)

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeEditorModal.tsx`

- [ ] **Step 1: Create the editor modal shell**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { X, Save, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecipeTemplateEditor } from './RecipeTemplateEditor'
import { RecipeLivePreview } from './RecipeLivePreview'
import { useRecipeStore } from '../../store/recipe.store'
import type { Recipe, RecipeStage } from '../../types/recipe.types'
import { generateStageId } from '../../types/recipe-utils'

interface RecipeEditorModalProps {
  isOpen: boolean
  recipeId?: string | null  // null = create new
  onClose: () => void
  onTestRecipe?: (recipeId: string) => void
}

export function RecipeEditorModal({ isOpen, recipeId, onClose, onTestRecipe }: RecipeEditorModalProps) {
  const { getRecipe, addRecipe, updateRecipe, deleteRecipe } = useRecipeStore()

  const existingRecipe = recipeId ? getRecipe(recipeId) : null

  // Local editor state
  const [name, setName] = useState(existingRecipe?.name || '')
  const [description, setDescription] = useState(existingRecipe?.description || '')
  const [recipeNote, setRecipeNote] = useState(existingRecipe?.recipeNote || '')
  const [suggestedModel, setSuggestedModel] = useState(existingRecipe?.suggestedModel || '')
  const [suggestedAspectRatio, setSuggestedAspectRatio] = useState(existingRecipe?.suggestedAspectRatio || '')
  const [suggestedResolution, setSuggestedResolution] = useState(existingRecipe?.suggestedResolution || '')
  const [categoryId, setCategoryId] = useState(existingRecipe?.categoryId || '')
  const [requiresImage, setRequiresImage] = useState(existingRecipe?.requiresImage ?? true)
  const [stages, setStages] = useState<RecipeStage[]>(
    existingRecipe?.stages || [{
      id: generateStageId(),
      order: 0,
      type: 'generation',
      template: '',
      fields: [],
      referenceImages: [],
    }]
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleMetadataChange = useCallback((field: string, value: string | boolean) => {
    switch (field) {
      case 'name': setName(value as string); break
      case 'description': setDescription(value as string); break
      case 'recipeNote': setRecipeNote(value as string); break
      case 'suggestedModel': setSuggestedModel(value as string); break
      case 'suggestedAspectRatio': setSuggestedAspectRatio(value as string); break
      case 'suggestedResolution': setSuggestedResolution(value as string); break
      case 'categoryId': setCategoryId(value as string); break
      case 'requiresImage': setRequiresImage(value as boolean); break
    }
  }, [])

  const handleStageTemplateChange = useCallback((stageId: string, template: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, template } : s))
  }, [])

  const handleStageTypeChange = useCallback((stageId: string, type: 'generation' | 'tool' | 'analysis') => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, type } : s))
  }, [])

  const handleStageToolChange = useCallback((stageId: string, toolId: string) => {
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, toolId } : s))
  }, [])

  const handleAddStage = useCallback(() => {
    setStages(prev => [...prev, {
      id: generateStageId(),
      order: prev.length,
      type: 'generation' as const,
      template: '',
      fields: [],
      referenceImages: [],
    }])
  }, [])

  const handleRemoveStage = useCallback((stageId: string) => {
    setStages(prev => prev.filter(s => s.id !== stageId).map((s, i) => ({ ...s, order: i })))
  }, [])

  const handleMoveStage = useCallback((stageId: string, direction: 'up' | 'down') => {
    setStages(prev => {
      const idx = prev.findIndex(s => s.id === stageId)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
      return next.map((s, i) => ({ ...s, order: i }))
    })
  }, [])

  const handleSave = async () => {
    if (!name.trim()) return
    setIsSaving(true)

    const recipeData = {
      name: name.trim(),
      description: description.trim() || undefined,
      recipeNote: recipeNote.trim() || undefined,
      stages: stages.map(s => ({
        id: s.id,
        order: s.order,
        type: s.type || 'generation' as const,
        template: s.template,
        toolId: s.toolId,
        fields: [],
        referenceImages: s.referenceImages || [],
      })),
      suggestedModel: suggestedModel || undefined,
      suggestedAspectRatio: suggestedAspectRatio || undefined,
      suggestedResolution: suggestedResolution || undefined,
      categoryId: categoryId || undefined,
      requiresImage,
      isQuickAccess: false,
      source: 'created' as const,
    }

    if (existingRecipe) {
      await updateRecipe(existingRecipe.id, recipeData)
    } else {
      await addRecipe(recipeData)
    }

    setIsSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!existingRecipe || !confirm('Delete this recipe? This cannot be undone.')) return
    setIsDeleting(true)
    await deleteRecipe(existingRecipe.id)
    setIsDeleting(false)
    onClose()
  }

  const handleTest = async () => {
    // Save first, then activate in Shot Creator
    if (!name.trim()) return
    await handleSave()
    // The onTestRecipe callback will set the active recipe
    if (existingRecipe && onTestRecipe) {
      onTestRecipe(existingRecipe.id)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/95">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">
            {existingRecipe ? 'Edit Recipe' : 'Create Recipe'}
          </h1>
          {name && (
            <span className="text-sm text-muted-foreground">— {name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Template Editor */}
        <div className="w-1/2 border-r border-border overflow-hidden">
          <div className="h-full overflow-y-auto">
            <RecipeTemplateEditor
              stages={stages}
              recipeName={name}
              recipeDescription={description}
              recipeNote={recipeNote}
              suggestedModel={suggestedModel}
              suggestedAspectRatio={suggestedAspectRatio}
              suggestedResolution={suggestedResolution}
              categoryId={categoryId}
              requiresImage={requiresImage}
              onStageTemplateChange={handleStageTemplateChange}
              onStageTypeChange={handleStageTypeChange}
              onStageToolChange={handleStageToolChange}
              onAddStage={handleAddStage}
              onRemoveStage={handleRemoveStage}
              onMoveStage={handleMoveStage}
              onMetadataChange={handleMetadataChange}
            />
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="w-1/2 overflow-hidden">
          <RecipeLivePreview stages={stages} recipeName={name} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/95">
        <div>
          {existingRecipe && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {existingRecipe && onTestRecipe && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Test in Shot Creator
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeEditorModal.tsx
git commit -m "feat(recipes): add full-screen split-pane recipe editor modal"
```

---

## Phase 5: Integration

### Task 14: Wire Modals into Shot Creator

**Files:**
- Modify: `src/features/shot-creator/components/ShotCreator.tsx`

This is the most context-dependent task. The implementer needs to:

- [ ] **Step 1: Read the current ShotCreator component**

```bash
cat src/features/shot-creator/components/ShotCreator.tsx | head -80
```

Understand the current imports and state.

- [ ] **Step 2: Add imports and state for the new modals**

Add these imports at the top of `ShotCreator.tsx`:

```typescript
import { RecipeCatalogModal } from './recipe/RecipeCatalogModal'
import { RecipeEditorModal } from './recipe/RecipeEditorModal'
import { RecipeEmptyState } from './recipe/RecipeEmptyState'
```

Add state variables inside the component:

```typescript
const [isCatalogOpen, setIsCatalogOpen] = useState(false)
const [isEditorOpen, setIsEditorOpen] = useState(false)
const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
```

- [ ] **Step 3: Update QuickAccessBar props**

Find where `<QuickAccessBar>` is rendered and update it:

```tsx
<QuickAccessBar
  onSelectRecipe={handleSelectRecipe}
  onOpenCatalog={() => setIsCatalogOpen(true)}
/>
```

- [ ] **Step 4: Add empty state logic**

Find where the recipe form is rendered (RecipeFormInline). Wrap it with empty state logic:

```tsx
{/* When no recipes and no active recipe, show empty state */}
{recipes.length === 0 && !activeRecipeId ? (
  <RecipeEmptyState
    onBrowseCatalog={() => setIsCatalogOpen(true)}
    onCreateRecipe={() => {
      setEditingRecipeId(null)
      setIsEditorOpen(true)
    }}
  />
) : (
  // existing RecipeFormInline rendering
)}
```

The implementer should find the exact location by reading the component — it's around where `RecipeFormInline` is conditionally rendered.

- [ ] **Step 5: Render modals at the end of the component**

Before the closing `</div>` or fragment, add:

```tsx
<RecipeCatalogModal
  isOpen={isCatalogOpen}
  onClose={() => setIsCatalogOpen(false)}
/>
<RecipeEditorModal
  isOpen={isEditorOpen}
  recipeId={editingRecipeId}
  onClose={() => {
    setIsEditorOpen(false)
    setEditingRecipeId(null)
  }}
  onTestRecipe={(recipeId) => {
    setIsEditorOpen(false)
    setEditingRecipeId(null)
    handleSelectRecipe(recipeId)
  }}
/>
```

- [ ] **Step 6: Run build to verify**

```bash
rm -rf .next && npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/shot-creator/components/ShotCreator.tsx
git commit -m "feat(recipes): wire catalog and editor modals into Shot Creator"
```

---

### Task 15: Seed System Recipes to Community Catalog

**Files:**
- Modify: `src/app/api/admin/seed-recipes/route.ts` (already exists)

The admin seed endpoint already syncs `SAMPLE_RECIPES` to community. We just need to make sure it runs once so that all system recipes appear in the catalog.

- [ ] **Step 1: Verify the seed endpoint works**

```bash
curl -X POST http://localhost:3002/api/admin/seed-recipes -H "Content-Type: application/json" | jq
```

This should insert/sync all `SAMPLE_RECIPES` into both `user_recipes` (as system recipes) and `community_items` (as catalog entries). Check the response for counts.

- [ ] **Step 2: Verify catalog API returns recipes**

```bash
curl http://localhost:3002/api/recipes/catalog | jq '.total'
```

Expected: A number > 0 (matching the count of SAMPLE_RECIPES).

- [ ] **Step 3: Commit (if any fixes needed)**

```bash
git add -A && git commit -m "fix(recipes): ensure seed endpoint populates community catalog"
```

---

### Task 16: Clean Build and Final Verification

- [ ] **Step 1: Clean build**

```bash
rm -rf .next && npm run build
```

Expected: Build succeeds. No type errors, no lint errors.

- [ ] **Step 2: Manual smoke test**

Start dev server and verify:
1. Open Shot Creator (http://localhost:3002)
2. If user has no recipes → empty state appears with "Browse Catalog" and "Create Recipe" buttons
3. Click "Browse Catalog" → full-screen catalog modal opens with recipe cards
4. Click a recipe card → detail panel opens with fields, pipeline, metadata
5. Click "Add" → recipe appears in user's collection, catalog shows "Added ✓"
6. Close catalog → recipe now appears in recipe dropdown
7. Click "Create Recipe" → editor modal opens with split pane
8. Type `<<NAME:name!>>` in template → name field appears in live preview
9. Fill in test values → assembled prompt updates in real-time
10. Save recipe → appears in dropdown
11. Quick access bar "+" button → opens catalog

- [ ] **Step 3: Final commit and push**

```bash
git add -A && git commit -m "feat(recipes): recipe catalog and editor - complete implementation" && git push origin main
```

---

### Task 17: Database Migration for Source Tracking

**Files:**
- Create: `supabase/migrations/20260411_recipe_source_tracking.sql`

- [ ] **Step 1: Create migration**

```sql
-- Add source tracking columns to user_recipes
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'created';
ALTER TABLE user_recipes ADD COLUMN IF NOT EXISTS source_catalog_id UUID;

-- Backfill existing data
UPDATE user_recipes SET source = 'system' WHERE is_system = true;
UPDATE user_recipes SET source = 'created' WHERE is_system = false AND source = 'created';

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_user_recipes_source ON user_recipes(source);

COMMENT ON COLUMN user_recipes.source IS 'created | catalog | imported | system';
COMMENT ON COLUMN user_recipes.source_catalog_id IS 'References community_items.id for catalog-sourced recipes';
```

- [ ] **Step 2: Apply migration to production**

```bash
# Apply via Supabase dashboard or CLI
npx supabase db push
```

- [ ] **Step 3: Update recipe.service.ts to include source fields**

In `recipe.service.ts`, add `source` and `source_catalog_id` to the `DbRecipe` interface:

```typescript
// Add to DbRecipe interface:
source: string | null
source_catalog_id: string | null
```

Add to `dbRecipeToRecipe` conversion:

```typescript
source: (dbRecipe.source as Recipe['source']) || undefined,
sourceCatalogId: dbRecipe.source_catalog_id || undefined,
```

Add to `recipeToDbRecipe` conversion:

```typescript
source: recipe.source || 'created',
source_catalog_id: recipe.sourceCatalogId || null,
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260411_recipe_source_tracking.sql src/features/shot-creator/services/recipe.service.ts
git commit -m "feat(recipes): add source tracking migration and service updates"
```

---

### Task 18: My Recipes Management View

**Files:**
- Create: `src/features/shot-creator/components/recipe/RecipeManagement.tsx`

- [ ] **Step 1: Create the management component**

This is rendered inside the catalog modal as a "My Recipes" tab, or accessible via a gear icon.

```tsx
'use client'

import { useState } from 'react'
import { Pencil, Trash2, Pin, PinOff, Copy, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRecipeStore } from '../../store/recipe.store'
import { cn } from '@/utils/utils'

interface RecipeManagementProps {
  onEditRecipe: (recipeId: string) => void
  onClose: () => void
}

export function RecipeManagement({ onEditRecipe, onClose }: RecipeManagementProps) {
  const {
    recipes,
    quickAccessItems,
    deleteRecipe,
    duplicateRecipe,
    addToQuickAccess,
    removeFromQuickAccess,
  } = useRecipeStore()

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const userRecipes = recipes.filter(r => !r.isSystemOnly)

  const isQuickAccess = (recipeId: string) =>
    quickAccessItems.some(qa => qa.recipeId === recipeId)

  const getQuickAccessId = (recipeId: string) =>
    quickAccessItems.find(qa => qa.recipeId === recipeId)?.id

  const handleDelete = async (recipeId: string) => {
    if (!confirm('Delete this recipe?')) return
    setDeletingId(recipeId)
    await deleteRecipe(recipeId)
    setDeletingId(null)
  }

  const handleTogglePin = async (recipe: typeof userRecipes[0]) => {
    if (isQuickAccess(recipe.id)) {
      const qaId = getQuickAccessId(recipe.id)
      if (qaId) await removeFromQuickAccess(qaId)
    } else {
      const label = recipe.quickAccessLabel || recipe.name.substring(0, 10)
      await addToQuickAccess(recipe.id, label)
    }
  }

  const sourceLabel = (source?: string) => {
    switch (source) {
      case 'catalog': return 'From catalog'
      case 'imported': return 'Imported'
      case 'system': return 'System'
      default: return 'Created by you'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/95">
        <h1 className="text-xl font-bold text-white">My Recipes ({userRecipes.length})</h1>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {userRecipes.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No recipes in your collection yet.
          </div>
        ) : (
          <div className="space-y-2">
            {userRecipes.map(recipe => (
              <div
                key={recipe.id}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-xl',
                  'border border-border bg-card hover:border-cyan-500/30 transition-colors'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FlaskConical className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{recipe.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">
                        {sourceLabel(recipe.source)}
                      </span>
                      {recipe.stages.length > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground shrink-0">
                          {recipe.stages.length} stages
                        </span>
                      )}
                    </div>
                    {recipe.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{recipe.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTogglePin(recipe)}
                    className={cn(
                      'p-1.5 rounded hover:bg-muted/50',
                      isQuickAccess(recipe.id) ? 'text-amber-400' : 'text-muted-foreground'
                    )}
                    title={isQuickAccess(recipe.id) ? 'Unpin from quick access' : 'Pin to quick access'}
                  >
                    {isQuickAccess(recipe.id) ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => duplicateRecipe(recipe.id)}
                    className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"
                    title="Duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {!recipe.isSystem && (
                    <button
                      onClick={() => onEditRecipe(recipe.id)}
                      className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    disabled={deletingId === recipe.id}
                    className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into ShotCreator**

Add import and state in `ShotCreator.tsx`:

```typescript
import { RecipeManagement } from './recipe/RecipeManagement'

const [isManagementOpen, setIsManagementOpen] = useState(false)
```

Render the modal:

```tsx
<RecipeManagement
  isOpen={isManagementOpen}
  onClose={() => setIsManagementOpen(false)}
  onEditRecipe={(id) => {
    setIsManagementOpen(false)
    setEditingRecipeId(id)
    setIsEditorOpen(true)
  }}
/>
```

Add a gear icon button near the recipe dropdown that opens management:

```tsx
<button
  onClick={() => setIsManagementOpen(true)}
  className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground"
  title="Manage recipes"
>
  <Settings className="w-4 h-4" />
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/features/shot-creator/components/recipe/RecipeManagement.tsx src/features/shot-creator/components/ShotCreator.tsx
git commit -m "feat(recipes): add My Recipes management view with edit/delete/pin"
```

---

## Deferred to Phase 2

These spec items are intentionally deferred and tracked here:
- **Share links page** (`/recipes/share/{id}`) — preview page for shared recipe URLs
- **Publish button in editor footer** — wiring the publish API into the editor modal UI
- **Quick access label field** in editor settings
- **Unpublish flow** — author can unpublish from management view
- **"Browse Catalog" option at bottom of recipe dropdown** — minor UX enhancement

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Foundation | Tasks 1-4 | Types, catalog service, API routes, publish endpoint |
| 2: Clean Default | Tasks 5-7 | No auto-seeding, empty state component, updated quick access bar |
| 3: Catalog Modal | Tasks 8-10 | Browsable recipe catalog with cards, detail panel, search/filter |
| 4: Editor Modal | Tasks 11-13 | Split-pane editor with syntax highlighting and live preview |
| 5: Integration | Tasks 14-18 | Wire into Shot Creator, seed data, migration, management view, verify |
