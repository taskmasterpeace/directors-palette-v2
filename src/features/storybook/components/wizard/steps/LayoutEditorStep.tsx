"use client"

import { useState, useCallback, useEffect } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { usePageGeneration } from "../../../hooks/usePageGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  PanelLeft,
  PanelRight,
  Columns,
  Image as ImageIcon,
  Type,
  Layout,
  Eye,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"
import type { SpreadTextPosition, BookSpread } from "../../../types/storybook.types"
import { logger } from '@/lib/logger'

/**
 * LayoutEditorStep
 *
 * Allows users to design the layout of each spread in their storybook.
 * For each spread, users can:
 * - View the beat text and scene description
 * - Generate the spread image
 * - Choose text placement (left page, right page, both, or none)
 * - Preview how the spread will look
 */
export function LayoutEditorStep() {
  const {
    project,
    updateSpread,
    setSpreadTextPlacement,
    setSpreadGenerating,
    markSpreadGenerated,
    initializeSpreadsFromBeats,
  } = useStorybookStore()

  const { generateSpreadImage, isGenerating, error } = usePageGeneration()

  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  // Initialize spreads from beats if not already done
  useEffect(() => {
    if (project?.beats && project.beats.length > 0 && (!project.spreads || project.spreads.length === 0)) {
      initializeSpreadsFromBeats()
    }
  }, [project?.beats, project?.spreads, initializeSpreadsFromBeats])

  const spreads = project?.spreads || []
  const currentSpread = spreads[currentSpreadIndex]
  const totalSpreads = spreads.length

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (currentSpreadIndex > 0) {
      setCurrentSpreadIndex(currentSpreadIndex - 1)
    }
  }, [currentSpreadIndex])

  const handleNext = useCallback(() => {
    if (currentSpreadIndex < totalSpreads - 1) {
      setCurrentSpreadIndex(currentSpreadIndex + 1)
    }
  }, [currentSpreadIndex, totalSpreads])

  // Generate spread image
  const handleGenerateSpread = useCallback(async () => {
    if (!currentSpread || currentSpread.isGenerating) return

    setSpreadGenerating(currentSpread.id, true)

    try {
      const result = await generateSpreadImage(currentSpread)
      if (result.success && result.imageUrl) {
        markSpreadGenerated(currentSpread.id, result.imageUrl, result.rightImageUrl)
      }
    } catch (err) {
      logger.storybook.error('Failed to generate spread', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setSpreadGenerating(currentSpread.id, false)
    }
  }, [currentSpread, generateSpreadImage, setSpreadGenerating, markSpreadGenerated])

  // Text placement handlers
  const handleTextPlacement = useCallback((placement: SpreadTextPosition) => {
    if (!currentSpread) return

    let leftText: string | undefined
    let rightText: string | undefined

    if (placement === 'left') {
      leftText = currentSpread.text
      rightText = undefined
    } else if (placement === 'right') {
      leftText = undefined
      rightText = currentSpread.text
    } else if (placement === 'both') {
      // Split text roughly in half by sentences
      const sentences = currentSpread.text.split(/(?<=[.!?])\s+/)
      const midpoint = Math.ceil(sentences.length / 2)
      leftText = sentences.slice(0, midpoint).join(' ')
      rightText = sentences.slice(midpoint).join(' ')
    } else {
      leftText = undefined
      rightText = undefined
    }

    setSpreadTextPlacement(currentSpread.id, placement, leftText, rightText)
  }, [currentSpread, setSpreadTextPlacement])

  // Update custom text
  const handleUpdateLeftText = useCallback((text: string) => {
    if (!currentSpread) return
    updateSpread(currentSpread.id, { leftPageText: text })
  }, [currentSpread, updateSpread])

  const handleUpdateRightText = useCallback((text: string) => {
    if (!currentSpread) return
    updateSpread(currentSpread.id, { rightPageText: text })
  }, [currentSpread, updateSpread])

  if (!project || spreads.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center">
        <Layout className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="text-muted-foreground mb-2">No spreads to edit yet.</p>
        <p className="text-sm text-zinc-500">
          Complete the previous steps to generate your story beats.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Layout Editor</h2>
          <p className="text-sm text-zinc-400">
            Design the layout for each spread in your book
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-400 border-amber-500/30">
            Spread {currentSpreadIndex + 1} of {totalSpreads}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(showPreview && "bg-zinc-800")}
          >
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Left Panel - Spread Editor */}
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-zinc-800">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="w-4 h-4 text-amber-400" />
              Spread {currentSpreadIndex + 1}
              <span className="text-zinc-500 font-normal">
                (Pages {currentSpread?.leftPageNumber}–{currentSpread?.rightPageNumber})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ScrollArea className="h-[calc(100%-1rem)]">
              <div className="space-y-4">
                {/* Beat Text */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Story Text</label>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-sm text-white">
                    {currentSpread?.text}
                  </div>
                </div>

                {/* Scene Description */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Scene Description</label>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-300 italic">
                    {currentSpread?.sceneDescription}
                  </div>
                </div>

                {/* Image Generation */}
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Spread Image</label>
                  {currentSpread?.isGenerating ? (
                    <div className="flex items-center justify-center p-8 bg-zinc-800/50 rounded-lg">
                      <LoadingSpinner />
                      <span className="ml-2 text-sm text-zinc-400">Generating spread...</span>
                    </div>
                  ) : currentSpread?.leftImageUrl ? (
                    <div className="relative aspect-[2/1] rounded-lg overflow-hidden bg-zinc-800">
                      <Image
                        src={currentSpread.spreadImageUrl || currentSpread.leftImageUrl}
                        alt={`Spread ${currentSpreadIndex + 1}`}
                        fill
                        className="object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={handleGenerateSpread}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGenerateSpread}
                      disabled={isGenerating}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Spread Image
                    </Button>
                  )}
                  {error && (
                    <p className="text-xs text-red-400 mt-2">{error}</p>
                  )}
                </div>

                {/* Text Placement */}
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Text Placement</label>
                  <div className="grid grid-cols-4 gap-2">
                    <TextPlacementButton
                      placement="left"
                      icon={<PanelLeft className="w-4 h-4" />}
                      label="Left"
                      isSelected={currentSpread?.textPlacement === 'left'}
                      onClick={() => handleTextPlacement('left')}
                    />
                    <TextPlacementButton
                      placement="right"
                      icon={<PanelRight className="w-4 h-4" />}
                      label="Right"
                      isSelected={currentSpread?.textPlacement === 'right'}
                      onClick={() => handleTextPlacement('right')}
                    />
                    <TextPlacementButton
                      placement="both"
                      icon={<Columns className="w-4 h-4" />}
                      label="Both"
                      isSelected={currentSpread?.textPlacement === 'both'}
                      onClick={() => handleTextPlacement('both')}
                    />
                    <TextPlacementButton
                      placement="none"
                      icon={<ImageIcon className="w-4 h-4" />}
                      label="None"
                      isSelected={currentSpread?.textPlacement === 'none'}
                      onClick={() => handleTextPlacement('none')}
                    />
                  </div>
                </div>

                {/* Custom Text Editing (when "both" is selected) */}
                {currentSpread?.textPlacement === 'both' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Left Page Text</label>
                      <Textarea
                        value={currentSpread.leftPageText || ''}
                        onChange={(e) => handleUpdateLeftText(e.target.value)}
                        className="min-h-[80px] text-sm bg-zinc-800 border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1 block">Right Page Text</label>
                      <Textarea
                        value={currentSpread.rightPageText || ''}
                        onChange={(e) => handleUpdateRightText(e.target.value)}
                        className="min-h-[80px] text-sm bg-zinc-800 border-zinc-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Preview */}
        <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b border-zinc-800">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              Spread Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 h-full">
            <SpreadPreview spread={currentSpread} />
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentSpreadIndex === 0}
          className="text-muted-foreground hover:text-white gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Spread
        </Button>

        {/* Progress Dots */}
        <div className="flex items-center gap-1">
          {spreads.map((spread, idx) => (
            <button
              key={spread.id}
              onClick={() => setCurrentSpreadIndex(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === currentSpreadIndex
                  ? "bg-amber-500 w-4"
                  : spread.isGenerated
                    ? "bg-green-500"
                    : "bg-zinc-600 hover:bg-zinc-500"
              )}
            />
          ))}
        </div>

        <Button
          variant={currentSpreadIndex === totalSpreads - 1 ? "default" : "ghost"}
          onClick={handleNext}
          disabled={currentSpreadIndex === totalSpreads - 1}
          className={cn(
            "gap-2",
            currentSpreadIndex === totalSpreads - 1
              ? "bg-amber-500 hover:bg-amber-600 text-black"
              : "text-muted-foreground hover:text-white"
          )}
        >
          {currentSpreadIndex === totalSpreads - 1 ? "Finish Layout" : "Next Spread"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Text placement button
 */
interface TextPlacementButtonProps {
  placement: SpreadTextPosition
  icon: React.ReactNode
  label: string
  isSelected: boolean
  onClick: () => void
}

function TextPlacementButton({
  icon,
  label,
  isSelected,
  onClick,
}: TextPlacementButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
        "border",
        isSelected
          ? "bg-amber-500/20 border-amber-500 text-amber-400"
          : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  )
}

/**
 * Spread preview component
 */
interface SpreadPreviewProps {
  spread: BookSpread | undefined
}

function SpreadPreview({ spread }: SpreadPreviewProps) {
  if (!spread) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        No spread selected
      </div>
    )
  }

  const hasLeftImage = !!spread.leftImageUrl
  const hasRightImage = !!spread.rightImageUrl
  const hasLeftText = spread.textPlacement === 'left' || spread.textPlacement === 'both'
  const hasRightText = spread.textPlacement === 'right' || spread.textPlacement === 'both'

  return (
    <div className="flex gap-2 h-full">
      {/* Left Page */}
      <div className="flex-1 bg-white rounded-lg overflow-hidden relative shadow-lg">
        {hasLeftImage && spread.leftImageUrl && (
          <Image
            src={spread.leftImageUrl}
            alt="Left page"
            fill
            className="object-cover"
          />
        )}
        {!hasLeftImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
            <ImageIcon className="w-8 h-8 text-zinc-300" />
          </div>
        )}
        {hasLeftText && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-xs leading-relaxed">
              {spread.leftPageText || spread.text}
            </p>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs bg-black/50 text-white">
            p.{spread.leftPageNumber}
          </Badge>
        </div>
      </div>

      {/* Right Page */}
      <div className="flex-1 bg-white rounded-lg overflow-hidden relative shadow-lg">
        {hasRightImage && spread.rightImageUrl && (
          <Image
            src={spread.rightImageUrl}
            alt="Right page"
            fill
            className="object-cover"
          />
        )}
        {!hasRightImage && !hasLeftImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
            <ImageIcon className="w-8 h-8 text-zinc-300" />
          </div>
        )}
        {/* If we have a spread image but no separate right image, show continuation */}
        {hasLeftImage && !hasRightImage && spread.spreadImageUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-100">
            <Type className="w-6 h-6 text-zinc-400" />
          </div>
        )}
        {hasRightText && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-xs leading-relaxed">
              {spread.rightPageText}
            </p>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs bg-black/50 text-white">
            p.{spread.rightPageNumber}
          </Badge>
        </div>
      </div>
    </div>
  )
}
