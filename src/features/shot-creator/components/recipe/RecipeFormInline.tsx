'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRecipeStore } from '../../store/recipe.store'
import { useShotCreatorStore } from '../../store/shot-creator.store'
// LoRAs are not used in recipe form — they require Klein 9B, but recipes use Nano Banana 2
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
  Upload,
  Image as ImageIcon,
  Trash2,
  ClipboardPaste,
  Dices,
  List,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { getAllFields } from '../../types/recipe.types'
import type { RecipeField } from '../../types/recipe-field.types'
import { useWildCardStore } from '../../store/wildcard.store'
import { useUnifiedGalleryStore } from '../../store/unified-gallery-store'
import { RecipeTextField } from './RecipeTextField'

// Paired recipes: image-based ↔ description-based
const RECIPE_PAIRS: Record<string, string> = {
  'Character Sheet': 'Character Sheet (From Description)',
  'Character Sheet (From Description)': 'Character Sheet',
  'Character Turnaround': 'Character Turnaround (From Description)',
  'Character Turnaround (From Description)': 'Character Turnaround',
}

export function RecipeFormInline() {
  const {
    activeRecipeId,
    activeFieldValues,
    setFieldValue,
    setActiveRecipe,
    getActiveRecipe,
    getVisibleRecipes,
    recipes: allRecipes,
  } = useRecipeStore()

  const {
    shotCreatorReferenceImages,
  } = useShotCreatorStore()


  const wildcardStore = useWildCardStore()
  const galleryGetAllRefs = useUnifiedGalleryStore(s => s.getAllReferences)
  const [wildcardModes, setWildcardModes] = useState<Record<string, 'browse' | 'random'>>({})
  const [wildcardSearches, setWildcardSearches] = useState<Record<string, string>>({})
  const [showRecipeSwitch, setShowRecipeSwitch] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const [focusedNameField, setFocusedNameField] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isOptionalOpen, setIsOptionalOpen] = useState(false)

  const { handleMultipleImageUpload, removeShotCreatorImage } = useReferenceImageManager(14)

  const activeRecipe = getActiveRecipe()

  // Paste support for reference images
  useEffect(() => {
    if (!activeRecipeId || !activeRecipe || activeRecipe.requiresImage === false) return
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        const dt = new DataTransfer()
        imageFiles.forEach(f => dt.items.add(f))
        handleMultipleImageUpload(dt.files)
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [activeRecipeId, activeRecipe, handleMultipleImageUpload])

  // Paste image from clipboard via button click
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read()
      const imageFiles: File[] = []
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const ext = imageType.split('/')[1] || 'png'
          const file = new File([blob], `pasted-image.${ext}`, { type: imageType })
          imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        const dt = new DataTransfer()
        imageFiles.forEach(f => dt.items.add(f))
        handleMultipleImageUpload(dt.files)
      }
    } catch {
      // Clipboard API not available or no image — ignore
    }
  }, [handleMultipleImageUpload])

  if (!activeRecipeId || !activeRecipe) return null

  // Check if this recipe has a paired variant (image ↔ description)
  const pairedName = RECIPE_PAIRS[activeRecipe.name]
  const pairedRecipe = pairedName ? allRecipes.find(r => r.name === pairedName) : null
  const isDescriptionMode = activeRecipe.name.includes('From Description')

  const switchMode = () => {
    if (pairedRecipe) {
      // Preserve field values when switching
      setActiveRecipe(pairedRecipe.id)
    }
  }

  const allFields = getAllFields(activeRecipe.stages)
  const requiredFields = allFields.filter(f => f.required)
  const optionalFields = allFields.filter(f => !f.required)
  const visibleOptionalFields = optionalFields.filter(f => !f.collapsed)
  const collapsedOptionalFields = optionalFields.filter(f => f.collapsed)
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
          <SelectLabel className="text-xs font-semibold text-amber-400 uppercase tracking-wider px-2 py-1.5">
            {group.label}
          </SelectLabel>
        )}
        {group.items.map(opt => (
          <SelectItem key={opt} value={opt} className="text-sm">{opt}</SelectItem>
        ))}
      </SelectGroup>
    ))
  }

  /**
   * Render a list of fields, grouping fields with the same `row` number
   * into a 2-column grid. Fields without `row` render full-width.
   * When `legacyAutoGridSelects` is true AND no field has an explicit row,
   * pair up 2+ select fields into a 2-column grid (backward compat).
   */
  const renderFieldRows = (fields: RecipeField[], legacyAutoGridSelects = false) => {
    const anyHasRow = fields.some(f => f.row !== undefined)

    if (!anyHasRow && legacyAutoGridSelects) {
      const selectFields = fields.filter(f => f.type === 'select')
      const otherFields = fields.filter(f => f.type !== 'select')
      return (
        <>
          {selectFields.length >= 2 ? (
            <div className="grid grid-cols-2 gap-3">
              {selectFields.map(field => (
                <div key={field.id}>{renderField(field)}</div>
              ))}
            </div>
          ) : (
            selectFields.map(field => (
              <div key={field.id}>{renderField(field)}</div>
            ))
          )}
          {otherFields.map(field => (
            <div key={field.id}>{renderField(field)}</div>
          ))}
        </>
      )
    }

    const rendered: React.ReactNode[] = []
    const seen = new Set<string>()
    for (const field of fields) {
      if (seen.has(field.id)) continue
      if (field.row !== undefined) {
        const rowFields = fields.filter(f => f.row === field.row)
        rowFields.forEach(f => seen.add(f.id))
        rendered.push(
          <div key={`row-${field.row}`} className="grid grid-cols-2 gap-3">
            {rowFields.map(f => (
              <div key={f.id}>{renderField(f)}</div>
            ))}
          </div>
        )
      } else {
        seen.add(field.id)
        rendered.push(<div key={field.id}>{renderField(field)}</div>)
      }
    }
    return <>{rendered}</>
  }

  // Render a single field
  const renderField = (field: RecipeField) => {
    const value = activeFieldValues[field.id] || ''

    switch (field.type) {
      case 'name': {
        // Collect available reference tags from uploaded images + gallery
        const uploadedTags = shotCreatorReferenceImages
          .flatMap(img => [...img.tags, ...(img.persistentTag ? [img.persistentTag] : [])])
          .filter(Boolean)
        const galleryRefs = galleryGetAllRefs()
        const availableTags = [...new Set([...uploadedTags, ...galleryRefs])]
        const showSuggestions = focusedNameField === field.id && showNameSuggestions && availableTags.length > 0
        // Strip leading @ for filtering so "@T" matches "Twork"
        const filterText = value.replace(/^@/, '').toLowerCase()
        const filteredTags = filterText
          ? availableTags.filter(t => t.toLowerCase().includes(filterText))
          : availableTags

        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            <div className="relative">
              <Input
                type="text"
                value={value}
                onChange={e => {
                  setFieldValue(field.id, e.target.value)
                  setShowNameSuggestions(true)
                }}
                onFocus={() => { setFocusedNameField(field.id); setShowNameSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
                placeholder={field.placeholder || 'Type a name or @ to pick from references'}
                className="h-10 text-sm bg-input border-border focus:border-amber-500 focus:ring-amber-500/20"
              />
              {/* Autocomplete suggestions from reference tags */}
              {showSuggestions && filteredTags.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
                  {filteredTags.map(tag => (
                    <button
                      key={tag}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setFieldValue(field.id, `@${tag}`)
                        setShowNameSuggestions(false)
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-foreground/80 hover:bg-secondary transition-colors flex items-center gap-2"
                    >
                      <span className="text-amber-400 text-xs">@</span>
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      }

      case 'text': {
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            <RecipeTextField
              value={value}
              onChange={(v) => setFieldValue(field.id, v)}
              placeholder={field.placeholder}
              isMissing={field.required && !value.trim()}
            />
          </div>
        )
      }

      case 'select':
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            <Select value={value} onValueChange={v => setFieldValue(field.id, v)}>
              <SelectTrigger className={cn(
                "h-10 text-sm bg-input border-border focus:border-amber-500 focus:ring-amber-500/20",
                !value && "text-muted-foreground"
              )}>
                <SelectValue placeholder={`Choose ${field.label.toLowerCase()}...`} />
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
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <div className="h-10 flex items-center px-3 text-xs text-muted-foreground bg-input border border-border rounded-md opacity-60">
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
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <div className="flex items-center gap-1">
                <div
                  onClick={reRoll}
                  className="h-10 flex items-center gap-2 px-3 rounded-md cursor-pointer text-sm bg-input border border-amber-500/30 hover:border-amber-500/50 transition-colors text-foreground select-none min-w-[140px] flex-1"
                  title="Click to re-roll"
                >
                  <Dices className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{truncated}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={toggleMode} className="h-10 w-10 p-0 shrink-0 text-muted-foreground hover:text-amber-400" title="Switch to browse mode">
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
            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
            <div className="flex items-center gap-1">
              <Select value={value} onValueChange={v => setFieldValue(field.id, v)}>
                <SelectTrigger className="h-10 text-sm bg-input border-border min-w-[140px]">
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
              <Button variant="ghost" size="sm" onClick={toggleMode} className="h-10 w-10 p-0 shrink-0 text-muted-foreground hover:text-amber-400" title="Switch to random mode">
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
    <div className="rounded-xl border border-amber-500/30 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 rounded-t-xl">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowRecipeSwitch(!showRecipeSwitch)}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-amber-400 transition-colors"
          >
            <span>{activeRecipe.name.replace(' (From Description)', '')}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {activeRecipe.stages.length > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
              {activeRecipe.stages.length} stages
            </span>
          )}
          {activeRecipe.suggestedModel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 font-medium">
              {activeRecipe.suggestedModel === 'nano-banana-2' ? 'NB2' : activeRecipe.suggestedModel}
            </span>
          )}

          {/* Recipe switcher dropdown */}
          {showRecipeSwitch && (
            <div className="absolute top-full left-0 mt-1 z-50 w-80 max-h-[360px] overflow-y-auto bg-popover border border-amber-500/20 rounded-lg shadow-xl">
              {recipes.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRecipe(r.id)
                    setShowRecipeSwitch(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 transition-colors border-b border-border/50 last:border-0',
                    r.id === activeRecipeId
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-foreground/80 hover:bg-amber-500/5'
                  )}
                >
                  <div className="text-sm font-medium">{r.name}</div>
                  {r.description && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveRecipe(null)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mode toggle + description */}
      <div className="px-4 pt-3 space-y-2">
        {/* Image / Description mode toggle */}
        {pairedRecipe && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Source:</span>
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                onClick={() => !isDescriptionMode || switchMode()}
                className={cn(
                  'px-3 py-1 text-xs font-medium transition-colors',
                  !isDescriptionMode
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <ImageIcon className="w-3 h-3 inline mr-1" />
                Image
              </button>
              <button
                onClick={() => isDescriptionMode || switchMode()}
                className={cn(
                  'px-3 py-1 text-xs font-medium transition-colors border-l border-border',
                  isDescriptionMode
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                Description
              </button>
            </div>
          </div>
        )}

        {/* Recipe note / description */}
        {activeRecipe.recipeNote && (
          <p className="text-xs text-muted-foreground italic">{activeRecipe.recipeNote}</p>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 space-y-4">
        {/* Image upload zone */}
        {needsImage && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative rounded-lg border-2 border-dashed transition-colors',
              isDragOver
                ? 'border-amber-500 bg-amber-500/10'
                : shotCreatorReferenceImages.length > 0
                  ? 'border-border bg-muted/30'
                  : 'border-border hover:border-amber-500/50 bg-muted/20'
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
                  {/* Add more / paste buttons */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                    title="Upload image"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePasteFromClipboard}
                    className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-amber-400 hover:border-amber-500/50 transition-colors"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="w-full py-5 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-amber-500/60" />
                </div>
                <p className="text-xs text-muted-foreground">Add a reference image</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                  <button
                    onClick={handlePasteFromClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    Paste
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/60">or drag & drop</p>
              </div>
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

        {/* Required fields — honor :rowN pairing */}
        <div className="space-y-3">
          {renderFieldRows(requiredFields)}
        </div>

        {/* Visible optional fields — honor :rowN; fall back to legacy select-pair if no annotations */}
        {visibleOptionalFields.length > 0 && (
          <div className="space-y-3">
            {renderFieldRows(visibleOptionalFields, true)}
          </div>
        )}

        {/* Collapsed optional fields inside a collapsible "Optional details" section */}
        {collapsedOptionalFields.length > 0 && (
          <div className="border border-border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setIsOptionalOpen(!isOptionalOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>
                Optional details
                <span className="ml-2 text-muted-foreground/60">
                  ({collapsedOptionalFields.length})
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  isOptionalOpen && 'rotate-180'
                )}
              />
            </button>
            {isOptionalOpen && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                {renderFieldRows(collapsedOptionalFields)}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
