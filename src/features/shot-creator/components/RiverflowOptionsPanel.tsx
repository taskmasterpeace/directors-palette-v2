'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronUp, X, Upload, Type, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getModelCost } from '@/config'

// Riverflow state managed locally in this panel
export interface RiverflowState {
  detailRefs: string[]
  fontUrls: string[]
  fontTexts: string[]
  resolution: '1K' | '2K' | '4K'
  transparency: boolean
  enhancePrompt: boolean
  maxIterations: 1 | 2 | 3
}

const DEFAULT_STATE: RiverflowState = {
  detailRefs: [],
  fontUrls: [],
  fontTexts: [],
  resolution: '1K',
  transparency: false,
  enhancePrompt: true,
  maxIterations: 3,
}

interface RiverflowOptionsPanelProps {
  onChange: (state: RiverflowState) => void
  referenceImageCount: number
}

export function RiverflowOptionsPanel({ onChange, referenceImageCount }: RiverflowOptionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [state, setState] = useState<RiverflowState>(DEFAULT_STATE)
  const [uploadingFont, setUploadingFont] = useState(false)
  const [newFontText, setNewFontText] = useState('')

  // Call onChange on mount with default state
  useEffect(() => {
    onChange(DEFAULT_STATE)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update parent when state changes
  const updateState = useCallback((updates: Partial<RiverflowState>) => {
    const newState = { ...state, ...updates }
    setState(newState)
    onChange(newState)
  }, [state, onChange])

  // Handle font file upload
  const handleFontUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
      toast.error('Invalid font file. Use TTF, OTF, WOFF, or WOFF2.')
      return
    }

    // Check limit
    if (state.fontUrls.length >= 2) {
      toast.error('Maximum 2 fonts allowed')
      return
    }

    setUploadingFont(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-font', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Upload failed')
      }

      const data = await response.json()
      updateState({
        fontUrls: [...state.fontUrls, data.url],
        fontTexts: [...state.fontTexts, newFontText || file.name.replace(/\.[^.]+$/, '')],
      })
      setNewFontText('')
      toast.success(`Font "${file.name}" uploaded`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload font')
    } finally {
      setUploadingFont(false)
      e.target.value = '' // Reset input
    }
  }, [state, newFontText, updateState])

  // Calculate cost
  const baseCost = getModelCost('riverflow-2-pro', state.resolution)
  const baseCostPts = Math.round(baseCost * 100)
  const fontCostPts = state.fontUrls.length * 5
  const totalCostPts = baseCostPts + fontCostPts

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-4 h-auto"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🌊</span>
            <span className="font-medium">Advanced Riverflow Options</span>
            {(state.detailRefs.length > 0 || state.fontUrls.length > 0) && (
              <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                {state.detailRefs.length + state.fontUrls.length} items
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{totalCostPts} pts</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-6">
        {/* Source Images Note */}
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm">
          <span className="font-medium">{referenceImageCount}</span> reference image{referenceImageCount !== 1 ? 's' : ''} will be used as source images (init_images)
        </div>

        {/* Logo Cleanup Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <Label>Logo Cleanup References (up to 4)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Upload clean versions of logos or labels. Riverflow will use these to fix blurry or hallucinated text.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <ImageUrlInput
            placeholder="Enter clean logo/label URL..."
            onAdd={(url) => {
              if (state.detailRefs.length < 4) {
                updateState({ detailRefs: [...state.detailRefs, url] })
              }
            }}
            disabled={state.detailRefs.length >= 4}
          />

          {state.detailRefs.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {state.detailRefs.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Logo ${index + 1}`}
                    className="w-full aspect-square object-cover rounded border"
                  />
                  <button
                    onClick={() => updateState({
                      detailRefs: state.detailRefs.filter((_, i) => i !== index)
                    })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand Fonts Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-muted-foreground" />
            <Label>Brand Fonts (up to 2) - +5 pts each</Label>
          </div>

          {state.fontUrls.length < 2 && (
            <div className="flex gap-2">
              <Input
                placeholder="Text to render with this font..."
                value={newFontText}
                onChange={(e) => setNewFontText(e.target.value.slice(0, 300))}
                className="flex-1"
                maxLength={300}
              />
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  onChange={handleFontUpload}
                  className="hidden"
                  disabled={uploadingFont}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingFont}
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    {uploadingFont ? 'Uploading...' : <><Upload className="w-4 h-4 mr-2" />Upload Font</>}
                  </span>
                </Button>
              </label>
            </div>
          )}

          {state.fontUrls.length > 0 && (
            <div className="space-y-2">
              {state.fontUrls.map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-background rounded border"
                >
                  <Type className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={state.fontTexts[index] || ''}
                    onChange={(e) => {
                      const newTexts = [...state.fontTexts]
                      newTexts[index] = e.target.value.slice(0, 300)
                      updateState({ fontTexts: newTexts })
                    }}
                    placeholder="Font text..."
                    className="flex-1"
                    maxLength={300}
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(state.fontTexts[index] || '').length}/300
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => updateState({
                      fontUrls: state.fontUrls.filter((_, i) => i !== index),
                      fontTexts: state.fontTexts.filter((_, i) => i !== index),
                    })}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select
              value={state.resolution}
              onValueChange={(value) => updateState({ resolution: value as '1K' | '2K' | '4K' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1K">1K - 27 pts</SelectItem>
                <SelectItem value="2K">2K - 27 pts</SelectItem>
                <SelectItem value="4K">4K - 60 pts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reasoning</Label>
            <Select
              value={String(state.maxIterations)}
              onValueChange={(value) => updateState({ maxIterations: Number(value) as 1 | 2 | 3 })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Quick (1)</SelectItem>
                <SelectItem value="2">Balanced (2)</SelectItem>
                <SelectItem value="3">Thorough (3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="rf-transparency"
              checked={state.transparency}
              onCheckedChange={(checked) => updateState({ transparency: checked })}
            />
            <Label htmlFor="rf-transparency" className="text-sm cursor-pointer">
              Transparent BG
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="rf-enhance"
              checked={state.enhancePrompt}
              onCheckedChange={(checked) => updateState({ enhancePrompt: checked })}
            />
            <Label htmlFor="rf-enhance" className="text-sm cursor-pointer">
              AI enhancement
            </Label>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-sm flex justify-between">
          <span>Total Cost</span>
          <span className="font-medium">
            {baseCostPts} base{fontCostPts > 0 ? ` + ${fontCostPts} fonts` : ''} = {totalCostPts} pts
          </span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Helper component
function ImageUrlInput({
  placeholder,
  onAdd,
  disabled,
}: {
  placeholder: string
  onAdd: (url: string) => void
  disabled: boolean
}) {
  const [url, setUrl] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (url.trim()) {
          onAdd(url.trim())
          setUrl('')
        }
      }}
      className="flex gap-2"
    >
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button type="submit" variant="outline" disabled={disabled || !url.trim()}>
        Add
      </Button>
    </form>
  )
}
