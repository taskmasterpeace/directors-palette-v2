'use client'

import { useRecipeStore } from '../../store/recipe.store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Check, AlertCircle, Image as ImageIcon, ImageOff, Dices, List } from 'lucide-react'
import { cn } from '@/utils/utils'
import { RecipeField, getAllFields, calculateRecipeCost } from '../../types/recipe.types'
import { useWildCardStore } from '../../store/wildcard.store'
import { useState } from 'react'

interface RecipeFormFieldsProps {
  className?: string
}

export function RecipeFormFields({
  className,
}: RecipeFormFieldsProps) {
  const {
    activeRecipeId,
    activeFieldValues,
    setFieldValue,
    setActiveRecipe,
    getActiveRecipe,
    getActiveValidation,
  } = useRecipeStore()

  const wildcardStore = useWildCardStore()
  const [wildcardModes, setWildcardModes] = useState<Record<string, 'browse' | 'random'>>({})
  const [wildcardSearches, setWildcardSearches] = useState<Record<string, string>>({})

  const activeRecipe = getActiveRecipe()
  const validation = getActiveValidation()

  // Handle cancel (deselect recipe)
  const handleCancel = () => {
    setActiveRecipe(null)
  }

  // Don't render if no active recipe
  if (!activeRecipeId || !activeRecipe) {
    return null
  }

  // Get all fields from all stages
  const allFields = getAllFields(activeRecipe.stages)

  // Render select options, supporting ---Header--- category separators
  const renderSelectOptions = (options?: string[]) => {
    if (!options) return null

    // Filter out empty strings — Radix Select crashes on empty value
    const safeOptions = options.filter(opt => opt !== '')

    // Check if any option uses the ---Header--- pattern
    const hasHeaders = safeOptions.some(opt => opt.startsWith('---') && opt.endsWith('---'))

    if (!hasHeaders) {
      // Flat list — no grouping
      return safeOptions.map((opt) => (
        <SelectItem key={opt} value={opt} className="text-sm">
          {opt}
        </SelectItem>
      ))
    }

    // Group options under headers
    const groups: { label: string; items: string[] }[] = []
    let currentGroup: { label: string; items: string[] } | null = null

    for (const opt of safeOptions) {
      if (opt.startsWith('---') && opt.endsWith('---')) {
        // This is a category header
        currentGroup = { label: opt.slice(3, -3).trim(), items: [] }
        groups.push(currentGroup)
      } else if (currentGroup) {
        currentGroup.items.push(opt)
      } else {
        // Items before any header go into an unnamed group
        if (!groups.length || groups[0].label !== '') {
          groups.unshift({ label: '', items: [] })
        }
        groups[0].items.push(opt)
      }
    }

    return groups.map((group, gi) => (
      <SelectGroup key={gi}>
        {group.label && (
          <SelectLabel className="text-xs font-semibold text-amber-400 uppercase tracking-wider px-2 py-1.5">
            {group.label}
          </SelectLabel>
        )}
        {group.items.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-sm">
            {opt}
          </SelectItem>
        ))}
      </SelectGroup>
    ))
  }

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
              {renderSelectOptions(field.options)}
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

      case 'wildcard': {
        const wc = field.wildcardName ? wildcardStore.getWildCardByName(field.wildcardName) : undefined
        const entries = wc
          ? wc.content.split('\n').map(e => e.trim()).filter(Boolean)
          : []
        const mode = wildcardModes[field.id] || field.wildcardMode || 'browse'
        const search = wildcardSearches[field.id] || ''

        if (!wc) {
          return (
            <div className="h-9 flex items-center px-3 text-xs text-muted-foreground bg-card border border-border rounded-md opacity-60">
              Wildcard &apos;{field.wildcardName}&apos; not available
            </div>
          )
        }

        const toggleMode = () => {
          const next = mode === 'browse' ? 'random' : 'browse'
          setWildcardModes(prev => ({ ...prev, [field.id]: next }))
          if (next === 'random' && !value && entries.length > 0) {
            const rand = entries[Math.floor(Math.random() * entries.length)]
            setTimeout(() => setFieldValue(field.id, rand), 0)
          }
        }

        if (mode === 'random') {
          const reRoll = () => {
            if (entries.length === 0) return
            const rand = entries[Math.floor(Math.random() * entries.length)]
            setFieldValue(field.id, rand)
          }
          // Auto-set random value if none exists
          if (!value && entries.length > 0) {
            const rand = entries[Math.floor(Math.random() * entries.length)]
            setTimeout(() => setFieldValue(field.id, rand), 0)
          }
          const displayValue = value || 'Rolling...'
          const truncated = displayValue.length > 80 ? displayValue.slice(0, 80) + '...' : displayValue
          return (
            <div className="flex items-center gap-1">
              <div
                onClick={reRoll}
                className={cn(
                  'h-9 flex items-center gap-2 px-3 rounded-md cursor-pointer text-sm',
                  'bg-card border border-amber-500/30 hover:border-amber-500/50 transition-colors',
                  'text-amber-200 select-none min-w-[140px]',
                  isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
                )}
                title="Click to re-roll"
              >
                <Dices className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">{truncated}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMode}
                className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-amber-400"
                title="Switch to browse mode"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          )
        }

        // Browse mode
        const filteredEntries = search
          ? entries.filter(e => e.toLowerCase().includes(search.toLowerCase()))
          : entries
        return (
          <div className="flex items-center gap-1">
            <Select
              value={value}
              onValueChange={(v) => setFieldValue(field.id, v)}
            >
              <SelectTrigger
                className={cn(
                  'h-9 text-sm bg-card border-border min-w-[140px]',
                  isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
                )}
              >
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {entries.length >= 15 && (
                  <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={search}
                      onChange={(e) =>
                        setWildcardSearches(prev => ({ ...prev, [field.id]: e.target.value }))
                      }
                      className="h-7 text-xs bg-card border-border"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                {filteredEntries.map((entry) => {
                  const truncated = entry.length > 80 ? entry.slice(0, 80) + '...' : entry
                  return (
                    <SelectItem key={entry} value={entry} className="text-sm">
                      {truncated}
                    </SelectItem>
                  )
                })}
                {filteredEntries.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                )}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMode}
              className="h-9 w-9 p-0 shrink-0 text-muted-foreground hover:text-amber-400"
              title="Switch to random mode"
            >
              <Dices className="w-4 h-4" />
            </Button>
          </div>
        )
      }

      case 'text':
      default:
        // Larger resizable textarea, label in placeholder
        return (
          <Textarea
            value={value}
            onChange={(e) => setFieldValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={cn(
              'min-h-[36px] text-sm bg-card border-border resize-y',
              isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
            )}
          />
        )
    }
  }

  // Group fields by type for smarter layout
  // - name and select fields go together in one row (compact)
  // - text fields get their own row (large)
  const compactFields = allFields.filter((f) => f.type === 'name' || f.type === 'select' || f.type === 'wildcard')
  const textFields = allFields.filter((f) => f.type === 'text')

  return (
    <div
      className={cn(
        'bg-card/50 border border-amber-500/30 rounded-lg p-3 space-y-3',
        className
      )}
    >
      {/* Header - Compact */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-amber-400">{activeRecipe.name}</span>
          {activeRecipe.stages.length > 1 && (
            <Badge variant="secondary" className="text-xs py-0">
              {activeRecipe.stages.length} stages
            </Badge>
          )}
          {activeRecipe.requiresImage === false ? (
            <Badge variant="outline" className="text-xs py-0 border-zinc-600 text-zinc-400">
              <ImageOff className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">No image</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs py-0 border-blue-500/30 text-blue-400">
              <ImageIcon className="w-3 h-3 sm:mr-1" />
              <span className="hidden sm:inline">Image req.</span>
            </Badge>
          )}
          {allFields.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {allFields.filter(f => f.required).length} req / {allFields.filter(f => !f.required).length} opt
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="h-5 w-5 p-0 shrink-0 text-muted-foreground hover:text-white"
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

      {/* Footer: Validation status, Cost & Aspect Ratio */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {validation && !validation.isValid ? (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle className="w-3 h-3" />
              Required: {validation.missingFields.join(', ')}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Check className="w-3 h-3" />
              Ready to Generate
            </div>
          )}

          {/* Cost Display */}
          <span className="text-xs text-muted-foreground">
            Cost:{' '}
            <span className="text-amber-400">
              {calculateRecipeCost(activeRecipe.stages) > 0
                ? `${calculateRecipeCost(activeRecipe.stages)} pts`
                : 'Model-based'}
            </span>
          </span>
        </div>

        {/* Suggested Aspect Ratio */}
        {activeRecipe.suggestedAspectRatio && (
          <span className="text-xs text-muted-foreground">
            Aspect: <span className="text-amber-400">{activeRecipe.suggestedAspectRatio}</span>
          </span>
        )}
      </div>
    </div>
  )
}
