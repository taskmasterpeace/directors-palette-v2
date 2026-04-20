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

/**
 * Collect up to `max` reference image URLs from a recipe's stages.
 * Used as a fallback preview when the recipe has no explicit previewImageUrl.
 */
function collectStageRefs(recipe: CatalogRecipe, max = 4): string[] {
  const urls: string[] = []
  for (const stage of recipe.content?.stages ?? []) {
    for (const ref of stage.referenceImages ?? []) {
      if (ref.url && !urls.includes(ref.url)) {
        urls.push(ref.url)
        if (urls.length >= max) return urls
      }
    }
  }
  return urls
}

export function RecipeCatalogCard({ recipe, onAdd, onClick, isAdding }: RecipeCatalogCardProps) {
  const stageCount = recipe.content?.stages?.length || 1
  const stageRefs = collectStageRefs(recipe, 4)
  const hasPreview = Boolean(recipe.previewImageUrl) || stageRefs.length > 0

  return (
    <div
      onClick={() => onClick(recipe)}
      className={cn(
        'group relative rounded-xl border border-border bg-card',
        'hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5',
        'transition-all duration-200 cursor-pointer overflow-hidden'
      )}
    >
      {/* Preview area — only reserve space if we actually have a preview to show */}
      {hasPreview && (
        <div className="aspect-[16/10] bg-muted/30 relative overflow-hidden">
          {recipe.previewImageUrl ? (
            <img
              src={recipe.previewImageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
          ) : stageRefs.length > 0 ? (
            <div
              className={cn(
                'w-full h-full grid gap-0.5',
                stageRefs.length === 1 && 'grid-cols-1',
                stageRefs.length === 2 && 'grid-cols-2',
                stageRefs.length === 3 && 'grid-cols-3',
                stageRefs.length >= 4 && 'grid-cols-2 grid-rows-2'
              )}
            >
              {stageRefs.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
          ) : null}

          {recipe.isFeatured && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-semibold">
              <Star className="w-3 h-3" />
              Featured
            </div>
          )}

          {recipe.isOfficial && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-cyan-500/90 text-black text-[10px] font-semibold">
              Official
            </div>
          )}
        </div>
      )}

      {/* Slim header strip when there's no preview — keeps card compact */}
      {!hasPreview && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border">
          <FlaskConical className="w-4 h-4 text-muted-foreground/50" />
          <div className="flex items-center gap-1.5">
            {recipe.isFeatured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-semibold">
                <Star className="w-3 h-3" />
                Featured
              </span>
            )}
            {recipe.isOfficial && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/90 text-black text-[10px] font-semibold">
                Official
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate">{recipe.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
          {recipe.description || 'No description'}
        </p>

        <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted/50">{stageCount} stage{stageCount !== 1 ? 's' : ''}</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/50">{recipe.category}</span>
          {recipe.addCount > 0 && (
            <span>{recipe.addCount} added</span>
          )}
        </div>

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
