'use client'

import { useRecipeStore } from '../../store/recipe.store'
import { Button } from '@/components/ui/button'
import { X, FlaskConical } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useState } from 'react'
import { useLayoutStore } from '@/store/layout.store'

interface QuickAccessBarProps {
  onSelectRecipe: (recipeId: string) => void
  className?: string
}

export function QuickAccessBar({
  onSelectRecipe,
  className,
}: QuickAccessBarProps) {
  const {
    quickAccessItems,
    removeFromQuickAccess,
    setActiveRecipe,
  } = useRecipeStore()
  const { setActiveTab } = useLayoutStore()

  const [isManaging, setIsManaging] = useState(false)

  // Handle clicking a recipe
  const handleRecipeClick = (recipeId: string) => {
    setActiveRecipe(recipeId)
    onSelectRecipe(recipeId)
  }

  // Filter to only show recipes
  const recipeItems = quickAccessItems
    .filter((item) => item.type === 'recipe' && item.recipeId)
    .sort((a, b) => a.order - b.order)

  // Navigate to Prompt Tools to add recipes
  const handleAddRecipe = () => {
    setActiveTab('prompt-tools')
  }

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
          onClick={handleAddRecipe}
          className="h-7 px-3 text-xs text-muted-foreground hover:text-white"
        >
          + Add recipes in Prompt Tools
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

              {/* Remove button when managing */}
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

          {/* Add more / Edit toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => isManaging ? setIsManaging(false) : handleAddRecipe()}
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
