"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  BookCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from "lucide-react"
import { cn } from "@/utils/utils"
import Image from "next/image"

export function PreviewStep() {
  const { project } = useStorybookStore()
  const [currentPreviewPage, setCurrentPreviewPage] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  const pages = project?.pages || []
  const currentPage = pages[currentPreviewPage]

  const handlePrevious = () => {
    if (currentPreviewPage > 0) {
      setCurrentPreviewPage(currentPreviewPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPreviewPage < pages.length - 1) {
      setCurrentPreviewPage(currentPreviewPage + 1)
    }
  }

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
    // TODO: Implement auto-advance and narration
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <BookCheck className="w-6 h-6 text-amber-400" />
          Preview Your Storybook
        </h2>
        <p className="text-zinc-400">
          {project?.title || "Untitled Storybook"}
        </p>
      </div>

      {/* Main Preview Area */}
      <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
        <CardContent className="p-0">
          {/* Book View */}
          <div className="relative aspect-[16/9] bg-gradient-to-b from-zinc-800 to-zinc-900">
            {currentPage?.imageUrl ? (
              <Image
                src={currentPage.imageUrl}
                alt={`Page ${currentPreviewPage + 1}`}
                fill
                className="object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/storybook/step-preview.webp"
                  alt="Preview placeholder"
                  fill
                  className="object-cover opacity-50"
                />
              </div>
            )}

            {/* Text Overlay */}
            {currentPage && currentPage.textPosition !== 'none' && (
              <div
                className={cn(
                  "absolute bg-black/60 backdrop-blur-sm p-4 max-w-[80%]",
                  currentPage.textPosition === 'top' && "top-4 left-1/2 -translate-x-1/2",
                  currentPage.textPosition === 'bottom' && "bottom-4 left-1/2 -translate-x-1/2",
                  currentPage.textPosition === 'left' && "left-4 top-1/2 -translate-y-1/2 max-w-[40%]",
                  currentPage.textPosition === 'right' && "right-4 top-1/2 -translate-y-1/2 max-w-[40%]"
                )}
              >
                <p className="text-white font-serif text-lg leading-relaxed">
                  {currentPage.text}
                </p>
              </div>
            )}

            {/* Navigation Arrows */}
            <button
              onClick={handlePrevious}
              disabled={currentPreviewPage === 0}
              className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full",
                "bg-black/50 hover:bg-black/70 transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentPreviewPage === pages.length - 1}
              className={cn(
                "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full",
                "bg-black/50 hover:bg-black/70 transition-colors",
                "disabled:opacity-30 disabled:cursor-not-allowed"
              )}
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>

            {/* Page Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full">
              <span className="text-white text-sm">
                Page {currentPreviewPage + 1} of {pages.length || 1}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail Strip */}
      <div className="flex gap-2 justify-center overflow-x-auto py-2">
        {pages.map((page, index) => (
          <button
            key={page.id}
            onClick={() => setCurrentPreviewPage(index)}
            className={cn(
              "relative w-20 h-12 rounded overflow-hidden border-2 transition-all flex-shrink-0",
              index === currentPreviewPage
                ? "border-amber-500 ring-2 ring-amber-500/50"
                : "border-zinc-700 hover:border-zinc-500"
            )}
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

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={togglePlayback}
          className="gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Play Slideshow
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>
      </div>

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
