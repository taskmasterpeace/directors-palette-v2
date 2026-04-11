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
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
          {uniqueFields.length > 0 && (
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
          )}

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
