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
