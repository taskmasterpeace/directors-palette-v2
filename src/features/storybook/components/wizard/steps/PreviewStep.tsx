"use client"

import { useState, useRef } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import {
  useStorybookGeneration,
  getAspectRatioForBookFormat,
  aspectRatioToCss,
} from "../../../hooks/useStorybookGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  Check,
  RefreshCw,
  Ruler,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"
import { AudioPlayer } from "../../AudioPlayer"
import { BookViewer, BookViewerRef } from "../../BookViewer"
import { getThumbnailDimensions } from "../../../utils/book-dimensions"
import { KDPPageValidator } from "../../KDPPageValidator"
import { PaperTypeSelector } from "../../PaperTypeSelector"
import { PrintGuidesLegend } from "../../PrintGuidesOverlay"
import type { KDPPaperType } from "../../../types/storybook.types"

export function PreviewStep() {
  const {
    project,
    updatePage,
    updateProject,
    pendingCoverVariations,
    isGeneratingCoverVariations,
    coverGenerationError,
    setPendingCoverVariations,
    setGeneratingCoverVariations,
    selectCoverVariation,
    setCoverGenerationError,
  } = useStorybookStore()

  // Handle paper type change
  const handlePaperTypeChange = (paperType: KDPPaperType) => {
    updateProject({ paperType })
  }

  const { generateBookCover, generateCoverVariations } = useStorybookGeneration()

  const [currentPreviewPage, setCurrentPreviewPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState<'interior' | 'cover' | 'both' | null>(null)
  const [pdfExportError, setPdfExportError] = useState<string | null>(null)
  const [showPrintGuides, setShowPrintGuides] = useState(false)
  const bookRef = useRef<BookViewerRef>(null)

  const pages = project?.pages || []

  // Calculate thumbnail dimensions based on book format
  const thumbnailDims = getThumbnailDimensions(project?.bookFormat || 'square')

  const handlePageChange = (pageIndex: number) => {
    setCurrentPreviewPage(pageIndex)
  }

  const handleThumbnailClick = (index: number) => {
    setCurrentPreviewPage(index)
    bookRef.current?.flipToPage(index)
  }

  const handlePrevPage = () => {
    bookRef.current?.flipPrev()
  }

  const handleNextPage = () => {
    bookRef.current?.flipNext()
  }

  const handleAudioGenerated = (pageId: string, audioUrl: string) => {
    updatePage(pageId, { audioUrl })
  }

  const handleGenerateVariations = async () => {
    setGeneratingCoverVariations(true)
    setCoverGenerationError(undefined)

    const results = await generateCoverVariations()
    const successfulUrls = results
      .filter(r => r.success)
      .map(r => r.imageUrl!)

    if (successfulUrls.length > 0) {
      setPendingCoverVariations(successfulUrls)
    } else {
      setCoverGenerationError('Failed to generate cover variations. Please try again.')
    }

    setGeneratingCoverVariations(false)
  }

  const handleSelectCover = (url: string) => {
    selectCoverVariation(url)
  }

  const handleRetryGeneration = async () => {
    setCoverGenerationError(undefined)
    const result = await generateBookCover()

    if (result.success) {
      updateProject({ coverImageUrl: result.imageUrl })
    } else {
      setCoverGenerationError(result.error || 'Failed to generate cover')
    }
  }

  const handleExportPDF = async (exportType: 'interior' | 'cover' | 'both') => {
    if (!project) return

    setIsExportingPDF(exportType)
    setPdfExportError(null)

    try {
      const response = await fetch('/api/storybook/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project,
          type: exportType,
          options: {
            includeBleed: true,
            quality: 'print',
          },
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'PDF export failed')
        } else {
          throw new Error(`PDF export failed (HTTP ${response.status})`)
        }
      }

      // Get the PDF blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project.title || 'storybook'}-${exportType}.pdf`
      document.body.appendChild(a)
      a.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('PDF export error:', error)
      setPdfExportError(error instanceof Error ? error.message : 'Failed to export PDF')
    } finally {
      setIsExportingPDF(null)
    }
  }

  // Fullscreen mode rendering
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        {/* Close button */}
        <Button
          onClick={() => setIsFullscreen(false)}
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/10 z-10"
        >
          <X className="w-8 h-8" />
        </Button>

        {/* Navigation buttons in fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevPage}
          disabled={currentPreviewPage === 0}
          className="absolute left-4 text-white hover:bg-white/10"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextPage}
          disabled={currentPreviewPage === pages.length - 1}
          className="absolute right-4 text-white hover:bg-white/10"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>

        {/* Book viewer - larger in fullscreen */}
        <div className="h-[95vh] flex items-center justify-center">
          {pages.length > 0 ? (
            <BookViewer
              ref={bookRef}
              pages={pages}
              title={project?.title || "My Storybook"}
              author={project?.author}
              coverUrl={project?.coverImageUrl}
              currentPage={currentPreviewPage}
              onPageChange={handlePageChange}
              bookFormat={project?.bookFormat || 'square'}
              showPrintGuides={showPrintGuides}
            />
          ) : (
            <div className="text-center text-zinc-400">
              <p>No pages to preview yet</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Main Book Preview Area */}
      <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
        <CardContent className="p-6">
          {/* Viewer controls */}
          <div className="flex justify-end gap-2 mb-2">
            <Button
              variant={showPrintGuides ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowPrintGuides(!showPrintGuides)}
              className={cn(
                "gap-2",
                showPrintGuides
                  ? "bg-amber-500 hover:bg-amber-600 text-black"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Ruler className="w-4 h-4" />
              {showPrintGuides ? "Hide" : "Show"} Print Guides
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="gap-2 text-zinc-400 hover:text-white"
            >
              <Maximize2 className="w-4 h-4" />
              Fullscreen
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4">
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevPage}
              disabled={currentPreviewPage === 0}
              className="hidden md:flex"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            {/* Book Viewer */}
            <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-lg p-4 min-h-[500px] flex items-center justify-center">
              {pages.length > 0 ? (
                <BookViewer
                  ref={bookRef}
                  pages={pages}
                  title={project?.title || "My Storybook"}
                  author={project?.author}
                  coverUrl={project?.coverImageUrl}
                  currentPage={currentPreviewPage}
                  onPageChange={handlePageChange}
                  bookFormat={project?.bookFormat || 'square'}
                  showPrintGuides={showPrintGuides}
                />
              ) : (
                <div className="text-center text-zinc-500">
                  <Image
                    src="/storybook/step-preview.webp"
                    alt="Preview placeholder"
                    width={400}
                    height={533}
                    className="opacity-50 rounded-lg"
                  />
                  <p className="mt-4">No pages to preview yet</p>
                </div>
              )}
            </div>

            {/* Next Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextPage}
              disabled={currentPreviewPage >= pages.length - 1}
              className="hidden md:flex"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex justify-center gap-4 mt-4 md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPreviewPage === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="flex items-center text-zinc-400 text-sm">
              Page {currentPreviewPage + 1} of {pages.length || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPreviewPage >= pages.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Page Counter */}
          <div className="text-center mt-4 text-zinc-500 text-sm hidden md:block">
            Page {currentPreviewPage + 1} of {pages.length || 1} • Click pages or use arrows to navigate
          </div>

          {/* Print Guides Legend */}
          {showPrintGuides && (
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <PrintGuidesLegend className="justify-center" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 justify-center overflow-x-auto py-2">
        {pages.map((page, index) => (
          <button
            key={page.id}
            onClick={() => handleThumbnailClick(index)}
            className={cn(
              "relative rounded overflow-hidden border-2 transition-all flex-shrink-0",
              index === currentPreviewPage
                ? "border-amber-500 ring-2 ring-amber-500/50"
                : "border-zinc-700 hover:border-zinc-500"
            )}
            style={{
              width: `${thumbnailDims.width}px`,
              height: `${thumbnailDims.height}px`,
            }}
          >
            {page.imageUrl ? (
              <Image
                src={page.imageUrl}
                alt={`Page ${index + 1}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-500 text-xs">{index + 1}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Audio Player */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-4">Narration</h3>
          <AudioPlayer
            pages={pages.map(p => ({
              id: p.id,
              text: p.text,
              audioUrl: p.audioUrl,
            }))}
            currentPageIndex={currentPreviewPage}
            onPageChange={(index) => {
              setCurrentPreviewPage(index)
              bookRef.current?.flipToPage(index)
            }}
            projectId={project?.id}
            autoAdvance={true}
            onAudioGenerated={handleAudioGenerated}
          />
        </CardContent>
      </Card>

      {/* Book Cover Section */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Book Cover</h3>
              <p className="text-sm text-zinc-400 mt-1">
                {project?.coverImageUrl
                  ? pendingCoverVariations.length > 0
                    ? 'Choose your favorite design'
                    : `Generated for ages ${project.targetAge}+`
                  : 'Cover will be generated automatically'}
              </p>
            </div>
            {project?.coverImageUrl && !pendingCoverVariations.length && (
              <div className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                {getAspectRatioForBookFormat(project.bookFormat)} format
              </div>
            )}
          </div>

          {/* Default Cover Display */}
          {project?.coverImageUrl && !pendingCoverVariations.length && (
            <div className="space-y-6">
              <div className="relative w-full max-w-sm mx-auto bg-zinc-800/50 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50"
                   style={{ aspectRatio: aspectRatioToCss(getAspectRatioForBookFormat(project.bookFormat)) }}>
                <Image
                  src={project.coverImageUrl}
                  alt="Book cover"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs text-zinc-500">
                  {project.characters.length > 1
                    ? `Featuring ${project.characters.slice(0, 3).map(c => c.name).join(', ')}`
                    : project.mainCharacterName
                      ? `Featuring ${project.mainCharacterName}`
                      : 'Your personalized book cover'
                  }
                </p>

                <Button
                  onClick={handleGenerateVariations}
                  disabled={isGeneratingCoverVariations}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                  size="lg"
                >
                  {isGeneratingCoverVariations ? (
                    <>
                      <LoadingSpinner size="sm" color="current" />
                      Generating 3 Variations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate More Options
                    </>
                  )}
                </Button>
                <p className="text-xs text-zinc-600">
                  {isGeneratingCoverVariations
                    ? 'Creating unique cover designs...'
                    : 'Get 3 alternative cover designs to choose from'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Variation Selection Grid */}
          {pendingCoverVariations.length > 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-amber-400 font-medium">
                  ✨ 4 Cover Options Generated
                </p>
                <p className="text-xs text-zinc-500">
                  Click any cover to select it as your book cover
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Current cover + 3 variations */}
                {[project?.coverImageUrl, ...pendingCoverVariations].map((url, index) => (
                  <div
                    key={index}
                    onClick={() => url && handleSelectCover(url)}
                    className={cn(
                      "relative bg-zinc-800/50 rounded-lg overflow-hidden cursor-pointer",
                      "border-2 transition-all hover:scale-105 hover:shadow-xl",
                      url === project?.coverImageUrl
                        ? "border-amber-500 ring-2 ring-amber-500 shadow-lg shadow-amber-500/20"
                        : "border-zinc-700 hover:border-amber-400"
                    )}
                    style={{ aspectRatio: aspectRatioToCss(getAspectRatioForBookFormat(project?.bookFormat)) }}
                  >
                    {url && (
                      <>
                        <Image
                          src={url}
                          alt={`Cover option ${index + 1}`}
                          fill
                          className="object-contain p-1"
                        />
                        {/* Option number */}
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          Option {index + 1}
                        </div>
                      </>
                    )}

                    {/* Selected indicator */}
                    {url === project?.coverImageUrl && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-black rounded-full p-1.5 shadow-lg">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity",
                      "flex items-end justify-center pb-2"
                    )}>
                      <span className="text-white text-xs font-medium">
                        {url === project?.coverImageUrl ? 'Selected' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setPendingCoverVariations([])}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {coverGenerationError && !project?.coverImageUrl && (
            <div className="space-y-4 text-center py-8">
              <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/50 rounded-lg p-4">
                {coverGenerationError}
              </div>
              <Button
                onClick={handleRetryGeneration}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Options */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-4">Download Options</h3>

          {/* PDF Export Error */}
          {pdfExportError && (
            <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/50 rounded-lg p-3 mb-4">
              {pdfExportError}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              All Pages (ZIP)
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Character Sheets
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Style Guide
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleExportPDF('interior')}
              disabled={isExportingPDF !== null || pages.length === 0}
            >
              {isExportingPDF === 'interior' ? (
                <>
                  <LoadingSpinner size="sm" color="current" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Interior PDF
                </>
              )}
            </Button>
          </div>

          {/* KDP Page Validator */}
          {project && (
            <div className="mt-6 pt-6 border-t border-zinc-700">
              <KDPPageValidator project={project} defaultExpanded={false} />
            </div>
          )}

          {/* Paper Type Selector */}
          {project && (
            <div className="mt-6 pt-6 border-t border-zinc-700">
              <PaperTypeSelector
                value={project.paperType || 'premium-color'}
                onChange={handlePaperTypeChange}
                pageCount={project.pages?.length || project.kdpPageCount || 24}
              />
            </div>
          )}

          {/* KDP Export Section */}
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-white">Amazon KDP Export</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Print-ready files for publishing
                </p>
              </div>
              <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                300 DPI + Bleed
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="gap-2 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10"
                onClick={() => handleExportPDF('interior')}
                disabled={isExportingPDF !== null || pages.length === 0}
              >
                {isExportingPDF === 'interior' ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Interior PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10"
                onClick={() => handleExportPDF('cover')}
                disabled={isExportingPDF !== null || !project?.coverImageUrl}
              >
                {isExportingPDF === 'cover' ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Cover Wrap PDF
                  </>
                )}
              </Button>
              <Button
                variant="default"
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                onClick={() => handleExportPDF('both')}
                disabled={isExportingPDF !== null || pages.length === 0 || !project?.coverImageUrl}
              >
                {isExportingPDF === 'both' ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download All
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-zinc-500 mt-3 text-center">
              Files are formatted for Amazon KDP print-on-demand with proper bleed margins
            </p>

            {/* KDP Quick Links */}
            <div className="mt-4 pt-4 border-t border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2 text-center">
                📚 Finish your book on Amazon KDP:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <a
                  href="https://kdp.amazon.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  KDP Dashboard
                </a>
                <span className="text-zinc-600">•</span>
                <a
                  href="https://kdp.amazon.com/cover-calculator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  Cover Calculator
                </a>
                <span className="text-zinc-600">•</span>
                <a
                  href="https://kdp.amazon.com/en_US/help/topic/G201834190"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  Formatting Guide
                </a>
                <span className="text-zinc-600">•</span>
                <a
                  href="https://kdp.amazon.com/en_US/help/topic/G201834170"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  Free ISBN
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
