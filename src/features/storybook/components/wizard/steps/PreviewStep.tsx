"use client"

import { useState, useRef } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from "lucide-react"
import { cn } from "@/utils/utils"
import Image from "next/image"
import { AudioPlayer } from "../../AudioPlayer"
import { BookViewer, BookViewerRef } from "../../BookViewer"
import { getThumbnailDimensions } from "../../../utils/book-dimensions"

export function PreviewStep() {
  const { project, updatePage } = useStorybookStore()
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
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
          {/* Fullscreen button */}
          <div className="flex justify-end mb-2">
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

      {/* Download Options */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <h3 className="font-semibold text-white mb-4">Download Options</h3>
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
            <Button variant="outline" className="gap-2" disabled>
              <Download className="w-4 h-4" />
              PDF (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
