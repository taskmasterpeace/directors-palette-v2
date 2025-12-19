"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Palette, Check, Plus, Sparkles, Loader2, X, Upload, Wand2, RefreshCw } from "lucide-react"
import { cn } from "@/utils/utils"
import Image from "next/image"

interface ExpandedStyle {
  originalStyle: string
  expandedStyle: string
  keywords: string[]
}

// Preset styles (can be expanded)
const PRESET_STYLES = [
  {
    id: 'watercolor',
    name: 'Watercolor',
    preview: '/storybook/step-style.webp',
    description: 'Soft, dreamy watercolor illustrations',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    preview: '/storybook/step-characters.webp',
    description: 'Fun, vibrant cartoon style',
  },
  {
    id: 'storybook',
    name: 'Classic Storybook',
    preview: '/storybook/step-pages.webp',
    description: 'Traditional children\'s book illustration',
  },
  {
    id: 'pixar',
    name: '3D Animated',
    preview: '/storybook/step-preview.webp',
    description: 'Pixar-style 3D rendering',
  },
]

export function StyleSelectionStep() {
  const { project, setStyle } = useStorybookStore()
  const { generateStyleGuide, isGenerating, progress, error } = useStorybookGeneration()

  const [selectedStyleId, setSelectedStyleId] = useState(project?.style?.presetId || '')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customStyleName, setCustomStyleName] = useState('')
  const [customStyleDescription, setCustomStyleDescription] = useState('')
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // LLM Style Expansion state
  const [expandedStyle, setExpandedStyle] = useState<ExpandedStyle | null>(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)
  const [useExpandedDescription, setUseExpandedDescription] = useState(true)

  // Expand style using LLM
  const handleExpandStyle = useCallback(async () => {
    if (!customStyleName.trim()) return

    setIsExpanding(true)
    setExpandError(null)

    try {
      const response = await fetch('/api/storybook/expand-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          styleName: customStyleName.trim(),
          characterAge: project?.mainCharacterAge || 5
        })
      })

      if (!response.ok) {
        throw new Error('Failed to expand style')
      }

      const data: ExpandedStyle = await response.json()
      setExpandedStyle(data)

      // Auto-fill the description if user hasn't typed anything
      if (!customStyleDescription.trim()) {
        setCustomStyleDescription(data.expandedStyle)
      }
    } catch (err) {
      console.error('Error expanding style:', err)
      setExpandError('Failed to expand style. You can still use your description.')
    } finally {
      setIsExpanding(false)
    }
  }, [customStyleName, customStyleDescription, project?.mainCharacterAge])

  // Auto-expand when style name changes (with debounce)
  useEffect(() => {
    if (!customStyleName.trim() || customStyleName.length < 3) {
      setExpandedStyle(null)
      return
    }

    const timer = setTimeout(() => {
      // Only auto-expand if we don't have an expansion yet or the name changed
      if (!expandedStyle || expandedStyle.originalStyle !== customStyleName.trim()) {
        handleExpandStyle()
      }
    }, 800) // Debounce 800ms

    return () => clearTimeout(timer)
  }, [customStyleName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle reference image upload
  const handlePhotoUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setReferenceImageUrl(data.url)
    } catch (err) {
      console.error('Error uploading reference image:', err)
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePhotoUpload(file)
    e.target.value = ''
  }, [handlePhotoUpload])

  const handleSelectStyle = useCallback((style: typeof PRESET_STYLES[0]) => {
    setSelectedStyleId(style.id)
    setShowCustomForm(false)
    setStyle({
      id: style.id,
      name: style.name,
      isPreset: true,
      presetId: style.id,
    })
  }, [setStyle])

  const handleGenerateCustomStyle = useCallback(async () => {
    if (!customStyleName.trim()) return

    // Use expanded description if available and user wants it, otherwise use custom description
    const descriptionToUse = useExpandedDescription && expandedStyle?.expandedStyle
      ? expandedStyle.expandedStyle
      : customStyleDescription.trim() || undefined

    const result = await generateStyleGuide(
      customStyleName.trim(),
      descriptionToUse,
      referenceImageUrl || undefined
    )

    if (result.success) {
      setSelectedStyleId('custom')
      setShowCustomForm(false)
      setReferenceImageUrl(null) // Reset after successful generation
      setExpandedStyle(null) // Reset expanded style
    }
  }, [customStyleName, customStyleDescription, referenceImageUrl, generateStyleGuide, useExpandedDescription, expandedStyle])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Palette className="w-6 h-6 text-amber-400" />
          Choose Your Style
        </h2>
        <p className="text-zinc-400">
          Select an art style for your illustrations. This will be applied to all pages.
        </p>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PRESET_STYLES.map((style) => (
          <Card
            key={style.id}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              "bg-zinc-900/50 border-zinc-800 overflow-hidden",
              selectedStyleId === style.id && "ring-2 ring-amber-500 border-amber-500",
              isGenerating && "pointer-events-none opacity-50"
            )}
            onClick={() => handleSelectStyle(style)}
          >
            <div className="relative aspect-video">
              <Image
                src={style.preview}
                alt={style.name}
                fill
                className="object-cover"
              />
              {selectedStyleId === style.id && (
                <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                  <div className="bg-amber-500 rounded-full p-2">
                    <Check className="w-6 h-6 text-black" />
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <h3 className="font-semibold text-white">{style.name}</h3>
              <p className="text-xs text-zinc-400 mt-1">{style.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Style Section */}
      {!showCustomForm ? (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowCustomForm(true)}
            disabled={isGenerating}
          >
            <Plus className="w-4 h-4" />
            Create Custom Style
          </Button>
        </div>
      ) : (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Create Custom Style
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomForm(false)}
                disabled={isGenerating}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="styleName">Style Name</Label>
              <div className="flex gap-2">
                <Input
                  id="styleName"
                  placeholder="e.g., LEGO, Watercolor, Pixar, Anime"
                  value={customStyleName}
                  onChange={(e) => setCustomStyleName(e.target.value)}
                  className="bg-zinc-800/50 border-zinc-700 flex-1"
                  disabled={isGenerating}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleExpandStyle}
                  disabled={isExpanding || isGenerating || !customStyleName.trim()}
                  className="shrink-0"
                  title="Expand style with AI"
                >
                  {isExpanding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {isExpanding && (
                <p className="text-xs text-amber-400 animate-pulse">Expanding style with AI...</p>
              )}
            </div>

            {/* Expanded Style Preview */}
            {expandedStyle && !isExpanding && (
              <div className="space-y-3 p-4 bg-zinc-800/30 rounded-lg border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">AI-Enhanced Description</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExpandStyle}
                    disabled={isExpanding}
                    className="h-6 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate
                  </Button>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                  {expandedStyle.expandedStyle}
                </p>

                {expandedStyle.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {expandedStyle.keywords.map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-zinc-700/50 text-zinc-300 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useExpandedDescription}
                    onChange={(e) => setUseExpandedDescription(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-zinc-400">Use AI-enhanced description for generation</span>
                </label>
              </div>
            )}

            {expandError && (
              <p className="text-xs text-amber-400">{expandError}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="styleDescription">
                Custom Description {expandedStyle ? '(Optional - override AI)' : '(Optional)'}
              </Label>
              <Textarea
                id="styleDescription"
                placeholder={expandedStyle
                  ? "Leave empty to use AI-enhanced description, or type your own..."
                  : "Describe the visual characteristics: color palette, mood, texture..."
                }
                value={customStyleDescription}
                onChange={(e) => {
                  setCustomStyleDescription(e.target.value)
                  // If user types something, disable auto-use of expanded
                  if (e.target.value.trim()) {
                    setUseExpandedDescription(false)
                  }
                }}
                className="bg-zinc-800/50 border-zinc-700 min-h-[80px]"
                disabled={isGenerating}
              />
            </div>

            {/* Reference Image Upload */}
            <div className="space-y-2">
              <Label>Reference Image (Optional)</Label>
              <p className="text-xs text-zinc-500">Upload an image to match its visual style</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {referenceImageUrl ? (
                <div
                  className="relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer hover:border-amber-500/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image
                    src={referenceImageUrl}
                    alt="Reference image"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-xs text-white">Change</span>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "w-32 h-32 rounded-lg border-2 border-dashed border-zinc-700",
                    "flex flex-col items-center justify-center gap-1",
                    "hover:border-amber-500/50 transition-colors cursor-pointer",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Upload</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
              onClick={handleGenerateCustomStyle}
              disabled={!customStyleName.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progress || 'Generating...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Style Guide
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Custom Style Preview */}
      {project?.style?.styleGuideUrl && !project.style.isPreset && (
        <Card className="bg-zinc-900/50 border-amber-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white">Custom Style: {project.style.name}</span>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <Image
                src={project.style.styleGuideUrl}
                alt="Generated style guide"
                fill
                className="object-cover"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Style Info */}
      {selectedStyleId && selectedStyleId !== 'custom' && (
        <div className="text-center text-sm text-zinc-400">
          Selected: <span className="text-amber-400 font-medium">
            {PRESET_STYLES.find(s => s.id === selectedStyleId)?.name}
          </span>
        </div>
      )}
    </div>
  )
}
