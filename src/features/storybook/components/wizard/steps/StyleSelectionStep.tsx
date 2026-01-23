"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, Plus, Sparkles, X, Upload, Wand2, RefreshCw } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/utils/utils"
import Image from "next/image"
import { compressImage } from "@/utils/image-compression"
import { ErrorDialog } from "../ErrorDialog"

interface ExpandedStyle {
  originalStyle: string
  expandedStyle: string
  keywords: string[]
}

// Preset styles (can be expanded)
// To add new presets:
// 1. Generate a style guide image (9-panel grid showing the art style)
// 2. Save it to /public/storybook/styles/ as {id}-preset.jpg
// 3. Add entry to this array with id, name, preview path, and description
const PRESET_STYLES = [
  {
    id: 'watercolor',
    name: 'Watercolor',
    preview: '/storybook/styles/watercolor-preset.webp',
    description: 'Soft, dreamy watercolor illustrations',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    preview: '/storybook/styles/cartoon-preset.webp',
    description: 'Fun, vibrant cartoon style',
  },
  {
    id: 'storybook',
    name: 'Classic Storybook',
    preview: '/storybook/styles/storybook-preset.webp',
    description: 'Traditional children\'s book illustration',
  },
  {
    id: 'pixar',
    name: '3D Animated',
    preview: '/storybook/styles/pixar-preset.webp',
    description: 'Pixar-style 3D rendering',
  },
  {
    id: 'comic-book',
    name: 'Comic Book',
    preview: '/storybook/styles/comic-book-preset.jpg',
    description: 'Bold ink outlines, cel shading, vibrant colors',
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

  // Quick Style from Image state
  const [showQuickStyle, setShowQuickStyle] = useState(false)
  const [quickStyleImage, setQuickStyleImage] = useState<string | null>(null)
  const [quickStyleImageUrl, setQuickStyleImageUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzedStyle, setAnalyzedStyle] = useState<{ name: string; description: string; stylePrompt: string } | null>(null)
  const quickStyleFileRef = useRef<HTMLInputElement>(null)

  // LLM Style Expansion state
  const [expandedStyle, setExpandedStyle] = useState<ExpandedStyle | null>(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandError, setExpandError] = useState<string | null>(null)
  const [useExpandedDescription, setUseExpandedDescription] = useState(true)

  // Auto-expand toggle (persisted in localStorage)
  const [autoExpandEnabled, setAutoExpandEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('storybook-auto-expand')
      return saved !== 'false' // Default to true
    }
    return true
  })
  // State for error dialog
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: '',
    message: '',
  })

  // Persist toggle state
  useEffect(() => {
    localStorage.setItem('storybook-auto-expand', autoExpandEnabled.toString())
  }, [autoExpandEnabled])

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
        // Enhanced error messages based on HTTP status codes
        let errorMessage = 'Failed to expand style. You can still use your description.'

        if (response.status === 429) {
          errorMessage = 'AI assistant is busy. Please wait a moment and try again.'
        } else if (response.status >= 500) {
          errorMessage = 'AI service temporarily unavailable. You can still use your description.'
        } else if (response.status === 400) {
          errorMessage = 'Invalid style name. Please try a different style.'
        }

        setExpandError(errorMessage)
        return
      }

      const data: ExpandedStyle = await response.json()
      setExpandedStyle(data)

      // Auto-fill the description if user hasn't typed anything
      if (!customStyleDescription.trim()) {
        setCustomStyleDescription(data.expandedStyle)
      }
    } catch (err) {
      console.error('Error expanding style:', err)
      setExpandError('Network error. Please check your connection and try again.')
    } finally {
      setIsExpanding(false)
    }
  }, [customStyleName, customStyleDescription, project?.mainCharacterAge])

  // Auto-expand when style name changes (with debounce) - only if enabled
  useEffect(() => {
    if (!autoExpandEnabled) return // Respect toggle
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
  }, [customStyleName, autoExpandEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle reference image upload
  const handlePhotoUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    try {
      // Compress before upload
      const compressedFile = await compressImage(file)

      const formData = new FormData()
      formData.append('file', compressedFile)
      const response = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setReferenceImageUrl(data.url)
    } catch (err) {
      console.error('Upload error:', err)
      setErrorDialog({
        open: true,
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Upload failed. Please try a smaller image.',
      })
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
      description: style.description,
      styleGuideUrl: style.preview, // Use preset image as style guide
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

  // Quick Style: Handle image upload and convert to base64 for analysis
  const handleQuickStyleUpload = useCallback(async (file: File) => {
    setIsUploading(true)
    try {
      // Convert to base64 for the analyze API
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
      })
      reader.readAsDataURL(file)
      const base64 = await base64Promise
      setQuickStyleImage(base64)

      // Also upload to get a URL for style guide generation
      const compressedFile = await compressImage(file)
      const formData = new FormData()
      formData.append('file', compressedFile)
      const response = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      setQuickStyleImageUrl(data.url)
    } catch (err) {
      console.error('Quick style upload error:', err)
      setErrorDialog({
        open: true,
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Failed to upload image',
      })
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleQuickStyleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleQuickStyleUpload(file)
    e.target.value = ''
  }, [handleQuickStyleUpload])

  // Quick Style: Analyze the uploaded image
  const handleAnalyzeStyle = useCallback(async () => {
    if (!quickStyleImage) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/styles/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: quickStyleImage })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze style')
      }

      const data = await response.json()
      setAnalyzedStyle(data)
    } catch (err) {
      console.error('Style analysis error:', err)
      setErrorDialog({
        open: true,
        title: 'Analysis Failed',
        message: err instanceof Error ? err.message : 'Failed to analyze image style',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [quickStyleImage])

  // Quick Style: Generate style guide from analyzed style
  const handleGenerateQuickStyle = useCallback(async () => {
    if (!analyzedStyle || !quickStyleImageUrl) return

    const result = await generateStyleGuide(
      analyzedStyle.name,
      analyzedStyle.stylePrompt,
      quickStyleImageUrl
    )

    if (result.success) {
      setSelectedStyleId('custom')
      setShowQuickStyle(false)
      setQuickStyleImage(null)
      setQuickStyleImageUrl(null)
      setAnalyzedStyle(null)
    }
  }, [analyzedStyle, quickStyleImageUrl, generateStyleGuide])

  // Reset quick style state
  const resetQuickStyle = useCallback(() => {
    setShowQuickStyle(false)
    setQuickStyleImage(null)
    setQuickStyleImageUrl(null)
    setAnalyzedStyle(null)
  }, [])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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
      {!showCustomForm && !showQuickStyle ? (
        <div className="flex justify-center gap-4 pt-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowQuickStyle(true)}
            disabled={isGenerating}
          >
            <Upload className="w-4 h-4" />
            Style from Image
          </Button>
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
      ) : showQuickStyle ? (
        /* Quick Style from Image */
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                Create Style from Image
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetQuickStyle}
                disabled={isGenerating}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-zinc-400">
              Upload any image and we&apos;ll analyze its art style, then generate a style guide for your storybook.
            </p>

            <input
              ref={quickStyleFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQuickStyleFileChange}
            />

            {/* Step 1: Upload */}
            {!quickStyleImage ? (
              <div
                className={cn(
                  "border-2 border-dashed border-zinc-700 rounded-lg p-8",
                  "flex flex-col items-center justify-center gap-3",
                  "hover:border-amber-500/50 transition-colors cursor-pointer",
                  isUploading && "opacity-50 pointer-events-none"
                )}
                onClick={() => quickStyleFileRef.current?.click()}
              >
                {isUploading ? (
                  <LoadingSpinner color="muted" />
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-zinc-500" />
                    <span className="text-zinc-400 font-medium">Click to upload an image</span>
                    <span className="text-xs text-zinc-500">PNG, JPG, WebP up to 10MB</span>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview uploaded image */}
                <div className="flex items-start gap-4">
                  <div
                    className="relative w-40 h-40 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer hover:border-amber-500/50 transition-colors shrink-0"
                    onClick={() => quickStyleFileRef.current?.click()}
                  >
                    <Image
                      src={quickStyleImage}
                      alt="Reference image"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs text-white">Change</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Step 2: Analyze */}
                    {!analyzedStyle ? (
                      <div className="space-y-2">
                        <p className="text-sm text-zinc-400">
                          Click &quot;Analyze Style&quot; to identify the art style in this image.
                        </p>
                        <Button
                          onClick={handleAnalyzeStyle}
                          disabled={isAnalyzing || isGenerating}
                          className="gap-2"
                        >
                          {isAnalyzing ? (
                            <>
                              <LoadingSpinner size="sm" color="current" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              Analyze Style
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      /* Step 3: Review & Generate */
                      <div className="space-y-3">
                        <div className="p-3 bg-zinc-800/50 rounded-lg border border-amber-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-white">Style Detected</span>
                          </div>
                          <h4 className="font-semibold text-amber-400">{analyzedStyle.name}</h4>
                          <p className="text-sm text-zinc-400 mt-1">{analyzedStyle.description}</p>
                        </div>
                        <Button
                          onClick={handleGenerateQuickStyle}
                          disabled={isGenerating}
                          className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          {isGenerating ? (
                            <>
                              <LoadingSpinner size="sm" color="current" />
                              {progress || 'Generating...'}
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate Style Guide
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </CardContent>
        </Card>
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

            {/* AI Style Assistant Toggle */}
            <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Wand2 className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white">AI Style Assistant</span>
                  <p className="text-xs text-zinc-500">Auto-expands style names as you type</p>
                </div>
              </div>
              <Switch
                checked={autoExpandEnabled}
                onCheckedChange={setAutoExpandEnabled}
              />
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
                    <LoadingSpinner size="sm" color="current" />
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
                    <LoadingSpinner color="muted" />
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
                  <LoadingSpinner size="sm" color="current" />
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

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        title={errorDialog.title}
        message={errorDialog.message}
        variant="error"
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
      />
    </div>
  )
}
