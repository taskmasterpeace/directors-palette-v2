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
