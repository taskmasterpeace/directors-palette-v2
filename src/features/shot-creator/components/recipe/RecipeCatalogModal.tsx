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

  // Show user-facing categories only (exclude Custom and system-only)
  const categories = DEFAULT_RECIPE_CATEGORIES.filter(c => c.name !== 'Custom' && !c.isSystemOnly)

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
      setRecipes(prev => prev.map(r =>
        r.id === recipe.id ? { ...r, isAdded: true, addCount: r.addCount + 1 } : r
      ))
      if (selectedRecipe?.id === recipe.id) {
        setSelectedRecipe({ ...selectedRecipe, isAdded: true, addCount: selectedRecipe.addCount + 1 })
      }
      await refreshRecipes()
    }
    setAddingId(null)
  }

  if (!isOpen) return null

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
