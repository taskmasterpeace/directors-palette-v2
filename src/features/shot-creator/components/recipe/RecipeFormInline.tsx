'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRecipeStore } from '../../store/recipe.store'
import { useShotCreatorStore } from '../../store/shot-creator.store'
import { useReferenceImageManager } from '../../hooks/useReferenceImageManager'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  ChevronDown,
  ChevronUp,
  Upload,
  Image as ImageIcon,
  Trash2,
  Dices,
  List,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { getAllFields } from '../../types/recipe.types'
import type { RecipeField } from '../../types/recipe-field.types'
import { useWildCardStore } from '../../store/wildcard.store'

export function RecipeFormInline() {
  const {
    activeRecipeId,
    activeFieldValues,
    setFieldValue,
    setActiveRecipe,
    getActiveRecipe,
    getVisibleRecipes,
  } = useRecipeStore()

  const {
    shotCreatorReferenceImages,
  } = useShotCreatorStore()

  const wildcardStore = useWildCardStore()
  const [wildcardModes, setWildcardModes] = useState<Record<string, 'browse' | 'random'>>({})
  const [wildcardSearches, setWildcardSearches] = useState<Record<string, string>>({})
  const [showOptional, setShowOptional] = useState(false)
  const [showRecipeSwitch, setShowRecipeSwitch] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const { handleMultipleImageUpload, removeShotCreatorImage } = useReferenceImageManager(14)

  const activeRecipe = getActiveRecipe()

  // Auto-expand textarea fields
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(36, el.scrollHeight)}px`
  }, [])

  // Re-auto-resize when field values change
  useEffect(() => {
    Object.values(textareaRefs.current).forEach(el => autoResize(el))
  }, [activeFieldValues, autoResize])

  if (!activeRecipeId || !activeRecipe) return null

  const allFields = getAllFields(activeRecipe.stages)
  const requiredFields = allFields.filter(f => f.required)
  const optionalFields = allFields.filter(f => !f.required)
  const needsImage = activeRecipe.requiresImage !== false
  const recipes = getVisibleRecipes()

  // Drag handlers for image upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files?.length > 0) {
      const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
      if (imageFiles.length > 0) {
        const dt = new DataTransfer()
        imageFiles.forEach(f => dt.items.add(f))
        handleMultipleImageUpload(dt.files)
      }
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      handleMultipleImageUpload(e.target.files)
      e.target.value = ''
    }
  }

  // Render select options with header grouping
  const renderSelectOptions = (options?: string[]) => {
    if (!options) return null
    const safeOptions = options.filter(opt => opt !== '')
    const hasHeaders = safeOptions.some(opt => opt.startsWith('---') && opt.endsWith('---'))

    if (!hasHeaders) {
      return safeOptions.map(opt => (
        <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
      ))
    }

    const groups: { label: string; items: string[] }[] = []
    let currentGroup: { label: string; items: string[] } | null = null
    for (const opt of safeOptions) {
      if (opt.startsWith('---') && opt.endsWith('---')) {
        currentGroup = { label: opt.slice(3, -3).trim(), items: [] }
        groups.push(currentGroup)
      } else if (currentGroup) {
        currentGroup.items.push(opt)
      } else {
        if (!groups.length || groups[0].label !== '') groups.unshift({ label: '', items: [] })
        groups[0].items.push(opt)
      }
    }
    return groups.map((group, gi) => (
      <SelectGroup key={gi}>
        {group.label && (
          <SelectLabel className="text-xs font-semibold text-cyan-400 uppercase tracking-wider px-2 py-1.5">
            {group.label}
          </SelectLabel>
        )}
        {group.items.map(opt => (
          <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
        ))}
      </SelectGroup>
    ))
  }

  // Render a single field
  const renderField = (field: RecipeField) => {
    const value = activeFieldValues[field.id] || ''

    switch (field.type) {
      case 'name':
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{field.label}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-medium text-sm">@</span>
              <Input
                type="text"
                value={value}
                onChange={e => setFieldValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="h-10 text-sm bg-slate-800/50 border-slate-700 pl-7 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
            </div>
          </div>
        )

      case 'text':
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{field.label}</label>
            <textarea
              ref={el => {
                textareaRefs.current[field.id] = el
                if (el) autoResize(el)
              }}
              value={value}
              onChange={e => {
                setFieldValue(field.id, e.target.value)
                autoResize(e.target)
              }}
              placeholder={field.placeholder}
              rows={1}
              className={cn(
                'w-full rounded-md text-sm bg-slate-800/50 border border-slate-700 px-3 py-2',
                'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none',
                'resize-none overflow-hidden transition-colors',
                'placeholder:text-slate-500'
              )}
              style={{ minHeight: '36px' }}
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{field.label}</label>
            <Select value={value} onValueChange={v => setFieldValue(field.id, v)}>
              <SelectTrigger className="h-10 text-sm bg-slate-800/50 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>{renderSelectOptions(field.options)}</SelectContent>
            </Select>
          </div>
        )

      case 'wildcard': {
        const wc = field.wildcardName ? wildcardStore.getWildCardByName(field.wildcardName) : undefined
        const entries = wc ? wc.content.split('\n').map(e => e.trim()).filter(Boolean) : []
        const mode = wildcardModes[field.id] || field.wildcardMode || 'browse'
        const search = wildcardSearches[field.id] || ''

        if (!wc) {
          return (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">{field.label}</label>
              <div className="h-10 flex items-center px-3 text-xs text-muted-foreground bg-slate-800/50 border border-slate-700 rounded-md opacity-60">
                Wildcard &apos;{field.wildcardName}&apos; not available
              </div>
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
            setFieldValue(field.id, entries[Math.floor(Math.random() * entries.length)])
          }
          if (!value && entries.length > 0) {
            setTimeout(() => setFieldValue(field.id, entries[Math.floor(Math.random() * entries.length)]), 0)
          }
          const display = value || 'Rolling...'
          const truncated = display.length > 80 ? display.slice(0, 80) + '...' : display
          return (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">{field.label}</label>
              <div className="flex items-center gap-1">
                <div
                  onClick={reRoll}
                  className="h-10 flex items-center gap-2 px-3 rounded-md cursor-pointer text-sm bg-slate-800/50 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors text-cyan-200 select-none min-w-[140px] flex-1"
                  title="Click to re-roll"
                >
                  <Dices className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{truncated}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={toggleMode} className="h-10 w-10 p-0 shrink-0 text-muted-foreground hover:text-cyan-400" title="Switch to browse mode">
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        }

        // Browse mode
        const filteredEntries = search ? entries.filter(e => e.toLowerCase().includes(search.toLowerCase())) : entries
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">{field.label}</label>
            <div className="flex items-center gap-1">
              <Select value={value} onValueChange={v => setFieldValue(field.id, v)}>
                <SelectTrigger className="h-10 text-sm bg-slate-800/50 border-slate-700 min-w-[140px]">
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {entries.length >= 15 && (
                    <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setWildcardSearches(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="h-7 text-xs bg-card border-border"
                        onKeyDown={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                  {filteredEntries.map(entry => {
                    const t = entry.length > 80 ? entry.slice(0, 80) + '...' : entry
                    return <SelectItem key={entry} value={entry} className="text-sm">{t}</SelectItem>
                  })}
                  {filteredEntries.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                  )}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={toggleMode} className="h-10 w-10 p-0 shrink-0 text-muted-foreground hover:text-cyan-400" title="Switch to random mode">
                <Dices className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/60 border-b border-slate-700/60">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowRecipeSwitch(!showRecipeSwitch)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-200 hover:text-white transition-colors"
          >
            <span>{activeRecipe.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
          {activeRecipe.stages.length > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">
              {activeRecipe.stages.length} stages
            </span>
          )}

          {/* Recipe switcher dropdown */}
          {showRecipeSwitch && (
            <div className="absolute top-full left-0 mt-1 z-50 w-64 max-h-[300px] overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
              {recipes.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRecipe(r.id)
                    setShowRecipeSwitch(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors',
                    r.id === activeRecipeId
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveRecipe(null)}
          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Image upload zone */}
        {needsImage && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-lg border-2 border-dashed transition-colors',
              isDragOver
                ? 'border-cyan-400 bg-cyan-500/10'
                : shotCreatorReferenceImages.length > 0
                  ? 'border-slate-700 bg-slate-800/30'
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
            )}
          >
            {shotCreatorReferenceImages.length > 0 ? (
              /* Show uploaded images */
              <div className="p-3">
                <div className="flex flex-wrap gap-2">
                  {shotCreatorReferenceImages.map((img, idx) => (
                    <div key={img.id} className="relative group w-16 h-16 rounded-lg overflow-hidden">
                      <img
                        src={img.preview || img.url}
                        alt={`Reference ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeShotCreatorImage(img.id)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  {/* Add more button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:border-slate-400 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state */
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-6 flex flex-col items-center gap-2 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-300">Drop your character photo here</p>
                  <p className="text-xs text-slate-500 mt-0.5">or click to upload</p>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        {/* Required fields */}
        {requiredFields.map(field => (
          <div key={field.id}>{renderField(field)}</div>
        ))}

        {/* Optional fields expander */}
        {optionalFields.length > 0 && (
          <div>
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showOptional ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              More options ({optionalFields.length})
            </button>
            {showOptional && (
              <div className="mt-3 space-y-4">
                {optionalFields.map(field => (
                  <div key={field.id}>{renderField(field)}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recipe note */}
      {activeRecipe.recipeNote && (
        <div className="px-4 pb-3">
          <p className="text-xs text-slate-500 italic">{activeRecipe.recipeNote}</p>
        </div>
      )}
    </div>
  )
}
