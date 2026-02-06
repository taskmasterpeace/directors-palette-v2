'use client'

import React, { useState, useCallback } from 'react'
import { X, Upload, Type, ImageIcon, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/utils'
import { useAdhubStore } from '../store/adhub.store'
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

export function RiverflowInputPanel() {
  const {
    riverflowSourceImages,
    riverflowDetailRefs,
    riverflowFontUrls,
    riverflowFontTexts,
    riverflowSettings,
    addRiverflowSourceImage,
    removeRiverflowSourceImage,
    addRiverflowDetailRef,
    removeRiverflowDetailRef,
    addRiverflowFont,
    removeRiverflowFont,
    updateRiverflowFontText,
    setRiverflowSettings,
  } = useAdhubStore()

  const [uploadingFont, setUploadingFont] = useState(false)
  const [newFontText, setNewFontText] = useState('')

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
    if (riverflowFontUrls.length >= 2) {
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
      addRiverflowFont(data.url, newFontText || file.name.replace(/\.[^.]+$/, ''))
      setNewFontText('')
      toast.success(`Font "${file.name}" uploaded`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload font')
    } finally {
      setUploadingFont(false)
      e.target.value = '' // Reset input
    }
  }, [riverflowFontUrls.length, newFontText, addRiverflowFont])

  // Handle image URL input
  const handleAddSourceImage = (url: string) => {
    if (!url.trim()) return
    if (riverflowSourceImages.length >= 10) {
      toast.error('Maximum 10 product photos allowed')
      return
    }
    addRiverflowSourceImage(url.trim())
  }

  const handleAddDetailRef = (url: string) => {
    if (!url.trim()) return
    if (riverflowDetailRefs.length >= 4) {
      toast.error('Maximum 4 logo cleanup references allowed')
      return
    }
    addRiverflowDetailRef(url.trim())
  }

  return (
    <div className="space-y-6 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
      <div className="flex items-center gap-2">
        <span className="text-xl">🌊</span>
        <h3 className="font-semibold">Riverflow Pro Options</h3>
      </div>

      {/* Product Photos Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          <Label>Product Photos (up to 10)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                Upload product photos to include in your ad. These become source images for the composition.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <ImageUrlInput
          placeholder="Enter product photo URL..."
          onAdd={handleAddSourceImage}
          disabled={riverflowSourceImages.length >= 10}
        />

        {riverflowSourceImages.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {riverflowSourceImages.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-full aspect-square object-cover rounded border"
                />
                <button
                  onClick={() => removeRiverflowSourceImage(url)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
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
                Upload clean versions of logos or labels. Riverflow will use these to fix blurry or hallucinated text in the output.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <ImageUrlInput
          placeholder="Enter clean logo/label URL..."
          onAdd={handleAddDetailRef}
          disabled={riverflowDetailRefs.length >= 4}
        />

        {riverflowDetailRefs.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {riverflowDetailRefs.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Logo ${index + 1}`}
                  className="w-full aspect-square object-cover rounded border"
                />
                <button
                  onClick={() => removeRiverflowDetailRef(url)}
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
          <Label>Brand Fonts (up to 2)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Upload TTF, OTF, or WOFF fonts. Enter text you want rendered with each font (max 300 characters).
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {riverflowFontUrls.length < 2 && (
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
                disabled={uploadingFont || riverflowFontUrls.length >= 2}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingFont}
                className="cursor-pointer"
                asChild
              >
                <span>
                  {uploadingFont ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Font
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        )}

        {riverflowFontUrls.length > 0 && (
          <div className="space-y-2">
            {riverflowFontUrls.map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-background rounded border"
              >
                <Type className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  value={riverflowFontTexts[index] || ''}
                  onChange={(e) => updateRiverflowFontText(index, e.target.value.slice(0, 300))}
                  placeholder="Font text..."
                  className="flex-1"
                  maxLength={300}
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  {(riverflowFontTexts[index] || '').length}/300
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRiverflowFont(index)}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="space-y-4 pt-2 border-t">
        <h4 className="font-medium text-sm">Settings</h4>

        <div className="grid grid-cols-2 gap-4">
          {/* Resolution */}
          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select
              value={riverflowSettings.resolution}
              onValueChange={(value) => setRiverflowSettings({ resolution: value as '1K' | '2K' | '4K' })}
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

          {/* Reasoning Depth */}
          <div className="space-y-2">
            <Label>Reasoning Depth</Label>
            <Select
              value={String(riverflowSettings.maxIterations)}
              onValueChange={(value) => setRiverflowSettings({ maxIterations: Number(value) as 1 | 2 | 3 })}
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
          {/* Transparent Background */}
          <div className="flex items-center gap-2">
            <Switch
              id="transparency"
              checked={riverflowSettings.transparency}
              onCheckedChange={(checked) => setRiverflowSettings({ transparency: checked })}
            />
            <Label htmlFor="transparency" className="text-sm cursor-pointer">
              Transparent background
            </Label>
          </div>

          {/* AI Enhancement */}
          <div className="flex items-center gap-2">
            <Switch
              id="enhancePrompt"
              checked={riverflowSettings.enhancePrompt}
              onCheckedChange={(checked) => setRiverflowSettings({ enhancePrompt: checked })}
            />
            <Label htmlFor="enhancePrompt" className="text-sm cursor-pointer">
              AI prompt enhancement
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for image URL input
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onAdd(url.trim())
      setUrl('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
