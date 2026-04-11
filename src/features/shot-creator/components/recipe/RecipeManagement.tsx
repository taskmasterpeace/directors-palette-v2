'use client'

import { useState } from 'react'
import { Pencil, Trash2, Pin, PinOff, Copy, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRecipeStore } from '../../store/recipe.store'
import { cn } from '@/utils/utils'

interface RecipeManagementProps {
  isOpen: boolean
  onEditRecipe: (recipeId: string) => void
  onClose: () => void
}

export function RecipeManagement({ isOpen, onEditRecipe, onClose }: RecipeManagementProps) {
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

  if (!isOpen) return null

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
