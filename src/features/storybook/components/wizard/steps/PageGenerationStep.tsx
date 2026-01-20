"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "../../RichTextEditor"
import { DraggableTextEditor } from "../../DraggableTextEditor"
import {
  Images,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
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
    setPageTextPosition,
    updateProject,
  } = useStorybookStore()

  const { generatePage, generateDualPage, generateBookCover, isGenerating, progress, error } = useStorybookGeneration()

  const [generatingPageId, setGeneratingPageId] = useState<string | null>(null)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [regeneratingProgress, setRegeneratingProgress] = useState<string>('')
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)
  // Auto-spread mode: generate pairs of pages as spreads (50% cost savings)
  const [useSpreadMode, setUseSpreadMode] = useState(true)

  // Memoize pages to prevent dependency changes on every render
  const pages = useMemo(() => project?.pages || [], [project?.pages])
  const currentPage = pages[currentPageIndex]

  // Define cover generation handler before useEffect
  const handleGenerateDefaultCover = useCallback(async () => {
    if (isGeneratingCover) return

    setIsGeneratingCover(true)
    setRegeneratingProgress('Generating book cover...')

    try {
      const result = await generateBookCover()
      if (result.success) {
        updateProject({ coverImageUrl: result.imageUrl })
        setRegeneratingProgress('Book cover generated successfully!')
        setTimeout(() => setRegeneratingProgress(''), 3000)
      } else {
        setRegeneratingProgress('Failed to generate cover. You can retry from the Preview step.')
        setTimeout(() => setRegeneratingProgress(''), 5000)
      }
    } finally {
      setIsGeneratingCover(false)
    }
  }, [generateBookCover, updateProject, isGeneratingCover])

  // Auto-generate cover when all pages are complete
  useEffect(() => {
    const allPagesComplete = pages.length > 0 && pages.every(p => p.imageUrl)
    const noCoverYet = !project?.coverImageUrl

    if (allPagesComplete && noCoverYet && !isGeneratingCover) {
      handleGenerateDefaultCover()
    }
  }, [pages, project?.coverImageUrl, isGeneratingCover, handleGenerateDefaultCover])

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1)
    }
  }

  const handleGeneratePage = useCallback(async () => {
    if (!currentPage) return

    setGeneratingPageId(currentPage.id)

    try {
      const result = await generatePage(currentPage.id)
      if (!result.success) {
        console.error('Generation failed:', result.error)
      }
    } finally {
      setGeneratingPageId(null)
    }
  }, [currentPage, generatePage])

  const handleRegenerateAllPages = useCallback(async () => {
    if (!pages || pages.length === 0) return

    setRegeneratingAll(true)

    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        setRegeneratingProgress(`Regenerating page ${i + 1} of ${pages.length}...`)
        setGeneratingPageId(page.id)
        setCurrentPageIndex(i) // Show progress by navigating to current page

        const result = await generatePage(page.id)
        if (!result.success) {
          console.error(`Generation failed for page ${i + 1}:`, result.error)
          // Continue with next page even if one fails
        }

        // Small delay between pages to avoid overwhelming the API
        if (i < pages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setRegeneratingProgress('All pages regenerated successfully!')
      setTimeout(() => setRegeneratingProgress(''), 3000)
    } catch (err) {
      console.error('Error regenerating all pages:', err)
      setRegeneratingProgress('Error during regeneration')
      setTimeout(() => setRegeneratingProgress(''), 3000)
    } finally {
      setRegeneratingAll(false)
      setGeneratingPageId(null)
    }
  }, [pages, generatePage, setCurrentPageIndex])

  const handleGenerateAllPages = useCallback(async () => {
    if (!pages || pages.length === 0) return

    // Only generate pages that don't have images yet
    const pagesToGenerate = pages.filter(p => !p.imageUrl)
    if (pagesToGenerate.length === 0) {
      setRegeneratingProgress('All pages already have images! Use "Regenerate All" to remake them.')
      setTimeout(() => setRegeneratingProgress(''), 3000)
      return
    }

    setRegeneratingAll(true)

    try {
      if (useSpreadMode) {
        // SPREAD MODE: Generate pairs of consecutive pages as spreads (50% cost savings)
        // Pair pages by their position in the full page list, not just ungenerated ones
        const pageIndices = pagesToGenerate.map(p => pages.findIndex(pg => pg.id === p.id))

        // Group consecutive pairs
        let i = 0
        let generatedCount = 0
        while (i < pagesToGenerate.length) {
          const currentPageIndex = pageIndices[i]
          const currentPage = pagesToGenerate[i]

          // Check if next page in pagesToGenerate is consecutive in the full list
          const nextPageInList = i + 1 < pagesToGenerate.length ? pagesToGenerate[i + 1] : null
          const nextPageIndex = nextPageInList ? pages.findIndex(pg => pg.id === nextPageInList.id) : -1
          const isConsecutive = nextPageIndex === currentPageIndex + 1

          if (isConsecutive && nextPageInList) {
            // Generate as spread (2 pages at once)
            setRegeneratingProgress(`Generating pages ${currentPageIndex + 1}-${nextPageIndex + 1} as spread... (${generatedCount + 1}/${Math.ceil(pagesToGenerate.length / 2)} spreads)`)
            setGeneratingPageId(currentPage.id)
            setCurrentPageIndex(currentPageIndex)

            const result = await generateDualPage(currentPage.id, nextPageInList.id)
            if (!result.success) {
              console.error(`Spread generation failed for pages ${currentPageIndex + 1}-${nextPageIndex + 1}:`, result.error)
            }

            i += 2 // Skip both pages
            generatedCount++
          } else {
            // Generate as single page (odd page out or non-consecutive)
            setRegeneratingProgress(`Generating page ${currentPageIndex + 1} (single)... (${generatedCount + 1} images)`)
            setGeneratingPageId(currentPage.id)
            setCurrentPageIndex(currentPageIndex)

            const result = await generatePage(currentPage.id)
            if (!result.success) {
              console.error(`Generation failed for page ${currentPageIndex + 1}:`, result.error)
            }

            i += 1
            generatedCount++
          }

          // Small delay between generations
          if (i < pagesToGenerate.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        const spreadCount = Math.floor(pagesToGenerate.length / 2)
        const singleCount = pagesToGenerate.length % 2
        setRegeneratingProgress(`Generated ${pagesToGenerate.length} pages (${spreadCount} spreads${singleCount ? ' + 1 single' : ''}) - 50% savings!`)
        setTimeout(() => setRegeneratingProgress(''), 4000)
      } else {
        // SINGLE MODE: Generate each page individually
        for (let i = 0; i < pagesToGenerate.length; i++) {
          const page = pagesToGenerate[i]
          const pageIndex = pages.findIndex(p => p.id === page.id)
          setRegeneratingProgress(`Generating page ${pageIndex + 1} of ${pages.length}... (${i + 1}/${pagesToGenerate.length} remaining)`)
          setGeneratingPageId(page.id)
          setCurrentPageIndex(pageIndex)

          const result = await generatePage(page.id)
          if (!result.success) {
            console.error(`Generation failed for page ${pageIndex + 1}:`, result.error)
          }

          if (i < pagesToGenerate.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }

        setRegeneratingProgress(`Successfully generated ${pagesToGenerate.length} pages!`)
        setTimeout(() => setRegeneratingProgress(''), 3000)
      }
    } catch (err) {
      console.error('Error generating all pages:', err)
      setRegeneratingProgress('Error during generation')
      setTimeout(() => setRegeneratingProgress(''), 3000)
    } finally {
      setRegeneratingAll(false)
      setGeneratingPageId(null)
    }
  }, [pages, generatePage, generateDualPage, setCurrentPageIndex, useSpreadMode])

  // Check if this page is currently generating
  const isCurrentPageGenerating = generatingPageId === currentPage?.id && isGenerating

  // Check if there are pages without images
  const hasUngeneratedPages = pages.some(p => !p.imageUrl)

  if (!currentPage) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">No pages to generate. Go back and add a story.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Spread Mode Toggle + Batch Generation Buttons */}
      <div className="flex flex-col items-center gap-3">
        {/* Spread Mode Toggle */}
        <div className="flex items-center gap-3 bg-zinc-800/50 rounded-lg px-4 py-2 border border-zinc-700">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-amber-400" />
            <Label htmlFor="spread-mode" className="text-sm font-medium cursor-pointer">
              Spread Mode
            </Label>
          </div>
          <Switch
            id="spread-mode"
            checked={useSpreadMode}
            onCheckedChange={setUseSpreadMode}
            className="data-[state=checked]:bg-amber-500"
          />
          <span className="text-xs text-zinc-400">
            {useSpreadMode ? '2 pages per image (50% savings)' : 'Single pages'}
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        {/* Generate All Pages - for first-time batch generation */}
        {hasUngeneratedPages && (
          <Button
            onClick={handleGenerateAllPages}
            disabled={regeneratingAll || pages.length === 0}
            className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 touch-manipulation"
          >
            {regeneratingAll ? (
              <>
                <LoadingSpinner size="sm" color="current" />
                {regeneratingProgress}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate All Pages ({pages.filter(p => !p.imageUrl).length} remaining)
              </>
            )}
          </Button>
        )}

        {/* Regenerate All - for remaking existing pages */}
        <Button
          onClick={handleRegenerateAllPages}
          disabled={regeneratingAll || pages.length === 0}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold px-6 touch-manipulation"
        >
          {regeneratingAll ? (
            <>
              <LoadingSpinner size="sm" color="current" />
              {regeneratingProgress}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Regenerate All {pages.length} Pages
            </>
          )}
        </Button>
      </div>

      {/* Progress Message */}
      {regeneratingProgress && !regeneratingAll && (
        <div className="text-center">
          <p className="text-sm text-green-400">{regeneratingProgress}</p>
        </div>
      )}

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
              onClick={() => setCurrentPageIndex(index)}
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
                <RichTextEditor
                  value={currentPage.richText || currentPage.text}
                  onChange={(html, plainText) => updatePage(currentPage.id, {
                    richText: html,
                    text: plainText // Keep plain text for TTS
                  })}
                  placeholder={`Enter the story text for page ${currentPageIndex + 1}...`}
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
                onClick={handleGeneratePage}
                disabled={isCurrentPageGenerating}
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
              >
                {isCurrentPageGenerating ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    {progress || 'Generating...'}
                  </>
                ) : currentPage.imageUrl ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Regenerate Page
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Page Image
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

        {/* Right: Page Preview with Draggable Text */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <Label className="mb-3 block">Page Preview - Position Your Text</Label>

            {currentPage.imageUrl ? (
              <DraggableTextEditor
                imageUrl={currentPage.imageUrl}
                richText={currentPage.richText}
                text={currentPage.text}
                position={currentPage.textBoxPosition}
                onPositionChange={(position) => updatePage(currentPage.id, { textBoxPosition: position })}
              />
            ) : (
              <div
                className={cn(
                  "aspect-video rounded-lg border border-zinc-700 bg-zinc-800/30",
                  "flex flex-col items-center justify-center gap-3"
                )}
              >
                {isCurrentPageGenerating ? (
                  <>
                    <LoadingSpinner size="xl" />
                    <span className="text-sm text-amber-400">{progress || 'Generating page...'}</span>
                  </>
                ) : (
                  <>
                    <Images className="w-12 h-12 text-zinc-600" />
                    <span className="text-sm text-zinc-500">
                      Click &quot;Generate Page Image&quot; to create illustration
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
