'use client'

import { useRecipeStore } from '../../store/recipe.store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/utils'
import { RecipeField, getAllFields } from '../../types/recipe.types'

interface RecipeFormFieldsProps {
  onApplyPrompt: (prompts: string[]) => void
  className?: string
}

export function RecipeFormFields({
  onApplyPrompt,
  className,
}: RecipeFormFieldsProps) {
  const {
    activeRecipeId,
    activeFieldValues,
    setFieldValue,
    setActiveRecipe,
    getActiveRecipe,
    getActiveValidation,
    buildActivePrompts,
  } = useRecipeStore()

  const activeRecipe = getActiveRecipe()
  const validation = getActiveValidation()

  // Handle applying the recipe
  const handleApply = () => {
    const prompts = buildActivePrompts()
    if (prompts && prompts.length > 0) {
      onApplyPrompt(prompts)
      setActiveRecipe(null) // Close the form
    }
  }

  // Handle cancel
  const handleCancel = () => {
    setActiveRecipe(null)
  }

  // Don't render if no active recipe
  if (!activeRecipeId || !activeRecipe) {
    return null
  }

  // Get all fields from all stages
  const allFields = getAllFields(activeRecipe.stages)

  // Render a field based on its type
  const renderField = (field: RecipeField) => {
    const value = activeFieldValues[field.id] || ''
    const isMissing = field.required && !value.trim()

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(v) => setFieldValue(field.id, v)}
          >
            <SelectTrigger
              className={cn(
                'h-9 text-sm bg-card border-border',
                isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
              )}
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-sm">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'name':
        // Small input (~12 chars visible), label in placeholder
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={cn(
              'h-9 text-sm bg-card border-border w-[140px]',
              isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
            )}
          />
        )

      case 'text':
      default:
        // Larger resizable textarea, label in placeholder
        return (
          <Textarea
            value={value}
            onChange={(e) => setFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={cn(
              'min-h-[60px] text-sm bg-card border-border resize-y',
              isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
            )}
          />
        )
    }
  }

  // Group fields by type for smarter layout
  // - name and select fields go together in one row (compact)
  // - text fields get their own row (large)
  const compactFields = allFields.filter((f) => f.type === 'name' || f.type === 'select')
  const textFields = allFields.filter((f) => f.type === 'text')

  return (
    <div
      className={cn(
        'bg-card/50 border border-amber-500/30 rounded-lg p-3 space-y-3',
        className
      )}
    >
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Recipe:</span>
          <span className="text-xs font-medium text-amber-400">{activeRecipe.name}</span>
          {activeRecipe.stages.length > 1 && (
            <Badge variant="secondary" className="text-xs py-0">
              {activeRecipe.stages.length} stages
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-5 w-5 p-0 text-muted-foreground hover:text-white"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Compact fields row (name + select on same line) */}
      {compactFields.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {compactFields.map((field) => (
            <div key={field.id} className={field.type === 'select' ? 'min-w-[140px]' : ''}>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}

      {/* Text fields (each gets its own row) */}
      {textFields.length > 0 && (
        <div className="space-y-2">
          {textFields.map((field) => (
            <div key={field.id}>
              {renderField(field)}
            </div>
          ))}
        </div>
      )}

      {/* Footer: Validation, Aspect Ratio, & Apply */}
      <div className="flex items-center justify-between pt-2 border-t border-border gap-2">
        <div className="flex items-center gap-3">
          {validation && !validation.isValid ? (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle className="w-3 h-3" />
              Required: {validation.missingFields.join(', ')}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" />
              Ready
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Suggested Aspect Ratio - Near Apply */}
          {activeRecipe.suggestedAspectRatio && (
            <span className="text-xs text-muted-foreground">
              <span className="text-amber-400">{activeRecipe.suggestedAspectRatio}</span>
            </span>
          )}

          <Button
            size="sm"
            onClick={handleApply}
            disabled={validation ? !validation.isValid : false}
            className="h-8 px-6 text-sm bg-amber-500 hover:bg-amber-600 text-black font-medium"
          >
            Apply Recipe
          </Button>
        </div>
      </div>
    </div>
  )
}
