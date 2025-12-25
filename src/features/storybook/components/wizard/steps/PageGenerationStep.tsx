"use client"

import { useState, useCallback } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Images,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Grid3X3,
  LayoutTemplate,
  PanelLeft,
  PanelRight,
  ImageIcon,
  Type,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"
import type { TextPosition, PageLayout } from "../../../types/storybook.types"
import { PAGE_LAYOUTS } from "../../../types/storybook.types"

export function PageGenerationStep() {
  const {
    project,
    currentPageIndex,
    setCurrentPageIndex,
    updatePage,
    selectVariation,
    setPageTextPosition,
  } = useStorybookStore()

  const { generatePageVariations, isGenerating, progress, error } = useStorybookGeneration()

  const [selectedVariation, setSelectedVariation] = useState<number | null>(null)
  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null)

  const pages = project?.pages || []
  const currentPage = pages[currentPageIndex]

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
      setSelectedVariation(null)
    }
  }

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
      setSelectedVariation(null)
    }
  }

  const handleSelectVariation = (index: number) => {
    setSelectedVariation(index)
    if (currentPage?.variationUrls?.[index]) {
      selectVariation(currentPage.id, index, currentPage.variationUrls[index])
    }
  }

  const handleGenerateVariations = useCallback(async () => {
    if (!currentPage) return

    setGeneratingPageId(currentPage.id)

    try {
      const result = await generatePageVariations(currentPage.id)
      if (!result.success) {
        console.error('Generation failed:', result.error)
      }
    } finally {
      setGeneratingPageId(null)
    }
  }, [currentPage, generatePageVariations])

  // Use actual variations if available, otherwise show placeholder grid
  const variations = currentPage?.variationUrls?.length === 9
    ? currentPage.variationUrls
    : null

  // Check if this page is currently generating
  const isCurrentPageGenerating = generatingPageId === currentPage?.id && isGenerating

  if (!currentPage) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">No pages to generate. Go back and add a story.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Images className="w-6 h-6 text-amber-400" />
          Generate Page Illustrations
        </h2>
      </div>

      {/* Page Navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPageIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex gap-2">
          {pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => {
                setCurrentPageIndex(index)
                setSelectedVariation(null)
              }}
              className={cn(
                "w-8 h-8 rounded-full text-sm font-medium transition-all",
                index === currentPageIndex
                  ? "bg-amber-500 text-black"
                  : page.imageUrl
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPageIndex === pages.length - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Page Text & Controls */}
        <div className="space-y-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Page {currentPageIndex + 1} Text</Label>
                <Textarea
                  value={currentPage.text}
                  onChange={(e) => updatePage(currentPage.id, { text: e.target.value })}
                  className="min-h-[150px] bg-zinc-800/50 border-zinc-700 font-serif"
                />
              </div>

              {/* Page Layout */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-amber-400" />
                  Page Layout
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { layout: 'image-with-text' as PageLayout, icon: ImageIcon, label: 'Image+Text' },
                    { layout: 'image-left-text-right' as PageLayout, icon: PanelLeft, label: 'Img | Text' },
                    { layout: 'text-left-image-right' as PageLayout, icon: PanelRight, label: 'Text | Img' },
                    { layout: 'image-only' as PageLayout, icon: ImageIcon, label: 'Image Only' },
                    { layout: 'text-only' as PageLayout, icon: Type, label: 'Text Only' },
                  ] as const).map(({ layout, icon: Icon, label }) => (
                    <Button
                      key={layout}
                      variant={(currentPage.layout || 'image-with-text') === layout ? "default" : "outline"}
                      size="sm"
                      onClick={() => updatePage(currentPage.id, { layout })}
                      className={cn(
                        "flex-col h-auto py-2 gap-1",
                        (currentPage.layout || 'image-with-text') === layout && "bg-amber-500 text-black"
                      )}
                      title={PAGE_LAYOUTS[layout].description}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{label}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  {PAGE_LAYOUTS[currentPage.layout || 'image-with-text'].description}
                </p>
              </div>

              {/* Text Position */}
              <div className="space-y-2">
                <Label>Text Position</Label>
                <div className="flex gap-2">
                  {[
                    { pos: 'top' as TextPosition, icon: ArrowUp, label: 'Top' },
                    { pos: 'bottom' as TextPosition, icon: ArrowDown, label: 'Bottom' },
                    { pos: 'left' as TextPosition, icon: ArrowLeft, label: 'Left' },
                    { pos: 'right' as TextPosition, icon: ArrowRight, label: 'Right' },
                    { pos: 'none' as TextPosition, icon: X, label: 'None' },
                  ].map(({ pos, icon: Icon }) => (
                    <Button
                      key={pos}
                      variant={currentPage.textPosition === pos ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPageTextPosition(currentPage.id, pos)}
                      className={cn(
                        currentPage.textPosition === pos && "bg-amber-500 text-black"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Error message */}
              {error && generatingPageId === currentPage.id && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerateVariations}
                disabled={isCurrentPageGenerating}
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
              >
                {isCurrentPageGenerating ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    {progress || 'Generating...'}
                  </>
                ) : variations ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Regenerate Variations
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate 9 Variations
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Selected Preview */}
          {currentPage.imageUrl && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-4">
                <Label className="mb-2 block">Selected Image</Label>
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={currentPage.imageUrl}
                    alt={`Page ${currentPageIndex + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: 3x3 Variation Grid */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <Label className="mb-3 block">Choose a Variation</Label>

            {/* Grid Image Preview (before frame extraction) */}
            {currentPage.gridImageUrl && !variations && (
              <div className="mb-4">
                <div className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700">
                  <Image
                    src={currentPage.gridImageUrl}
                    alt="Generated 3x3 grid"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-xs text-amber-400 mt-2 text-center">
                  Frame extraction coming soon - for now, view the grid above
                </p>
              </div>
            )}

            {/* Variations Grid */}
            {variations ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {variations.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectVariation(index)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        selectedVariation === index || currentPage.selectedVariationIndex === index
                          ? "border-amber-500 ring-2 ring-amber-500/50"
                          : "border-zinc-700 hover:border-zinc-500"
                      )}
                    >
                      <Image
                        src={url}
                        alt={`Variation ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {(selectedVariation === index || currentPage.selectedVariationIndex === index) && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <Check className="w-8 h-8 text-amber-400" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                        {index + 1}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-3 text-center">
                  Click to select a variation for this page
                </p>
              </>
            ) : !currentPage.gridImageUrl && (
              <div
                className={cn(
                  "aspect-square rounded-lg border border-zinc-700 bg-zinc-800/30",
                  "flex flex-col items-center justify-center gap-3"
                )}
              >
                {isCurrentPageGenerating ? (
                  <>
                    <LoadingSpinner size="xl" />
                    <span className="text-sm text-amber-400">{progress || 'Generating 9 variations...'}</span>
                  </>
                ) : (
                  <>
                    <Grid3X3 className="w-12 h-12 text-zinc-600" />
                    <span className="text-sm text-zinc-500">
                      Click &quot;Generate 9 Variations&quot; to create options
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
