"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useGenerationStateStore } from "../../../store/generation.store"
import { useCoverGeneration } from "../../../hooks/useCoverGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sparkles,
  Check,
  RefreshCw,
  X,
  BookOpen,
  User,
  Wand2,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"

/**
 * TitlePageStep
 *
 * Allows users to generate and select from 4 title page variations:
 * - 2 "Portrait" compositions (character waist-up, welcoming)
 * - 2 "Story Element" compositions (character in scene)
 *
 * The selected title page becomes the interior title page of the book.
 */
export function TitlePageStep() {
  const { project } = useStorybookStore()

  const {
    pendingTitlePageVariations,
    isGeneratingTitlePageVariations,
    titlePageGenerationError,
    setPendingTitlePageVariations,
    setGeneratingTitlePageVariations,
    selectTitlePageVariation,
    setTitlePageGenerationError,
  } = useGenerationStateStore()

  const { generateTitlePageVariations } = useCoverGeneration()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handleGenerateVariations = async () => {
    setGeneratingTitlePageVariations(true)
    setTitlePageGenerationError(undefined)

    const results = await generateTitlePageVariations()
    const successfulUrls = results
      .filter(r => r.success)
      .map(r => r.imageUrl!)

    if (successfulUrls.length > 0) {
      setPendingTitlePageVariations(successfulUrls)
      setSelectedIndex(null)
    } else {
      setTitlePageGenerationError('Failed to generate title page variations. Please try again.')
    }

    setGeneratingTitlePageVariations(false)
  }

  const handleSelectVariation = (url: string, index: number) => {
    setSelectedIndex(index)
    selectTitlePageVariation(url)
  }

  const handleClearVariations = () => {
    setPendingTitlePageVariations([])
    setSelectedIndex(null)
  }

  // Determine composition type for labeling
  const getCompositionLabel = (index: number): string => {
    // Index 0, 1 = Portrait; Index 2, 3 = Story Element
    if (index < 2) return "Portrait"
    return "Story Scene"
  }

  const hasExistingTitlePage = !!project?.titlePageImageUrl
  const hasVariationsToShow = pendingTitlePageVariations.length > 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Title Page Design</h2>
        <p className="text-zinc-400">
          Generate interior title page options for your book. This is the first page readers see when they open your book.
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <User className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Portrait Style</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Character looking warmly at the reader, welcoming them into the story.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Story Scene Style</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Character in a scene that hints at the adventure to come.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          {/* Current Title Page Display (if exists and no variations pending) */}
          {hasExistingTitlePage && !hasVariationsToShow && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-green-400 font-medium flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Title Page Selected
                </p>
              </div>

              <div className="relative w-full max-w-sm mx-auto bg-zinc-800/50 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50 aspect-[3/4]">
                <Image
                  src={project.titlePageImageUrl!}
                  alt="Selected title page"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>

              <div className="text-center space-y-2">
                <Button
                  onClick={handleGenerateVariations}
                  disabled={isGeneratingTitlePageVariations}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                  size="lg"
                >
                  {isGeneratingTitlePageVariations ? (
                    <>
                      <LoadingSpinner size="sm" color="current" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Generate New Options
                    </>
                  )}
                </Button>
                <p className="text-xs text-zinc-500">
                  Generate 4 new title page options to choose from
                </p>
              </div>
            </div>
          )}

          {/* No Title Page Yet - Generate Button */}
          {!hasExistingTitlePage && !hasVariationsToShow && (
            <div className="text-center py-12 space-y-6">
              <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center">
                <Wand2 className="w-10 h-10 text-zinc-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Create Your Title Page</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  We&apos;ll generate 4 unique title page options using your character and style guide.
                  You&apos;ll get 2 portrait-style and 2 story scene variations.
                </p>
              </div>

              {titlePageGenerationError && (
                <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/50 rounded-lg p-3 max-w-md mx-auto">
                  {titlePageGenerationError}
                </div>
              )}

              <Button
                onClick={handleGenerateVariations}
                disabled={isGeneratingTitlePageVariations || !project?.style?.styleGuideUrl}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                size="lg"
              >
                {isGeneratingTitlePageVariations ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    Generating 4 Variations...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Title Pages
                  </>
                )}
              </Button>

              {!project?.style?.styleGuideUrl && (
                <p className="text-xs text-amber-400">
                  ⚠️ Style guide required. Please generate a style guide first.
                </p>
              )}

              {isGeneratingTitlePageVariations && (
                <p className="text-xs text-zinc-500">
                  Creating 4 unique compositions... This may take a moment.
                </p>
              )}
            </div>
          )}

          {/* Variation Selection Grid */}
          {hasVariationsToShow && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-amber-400 font-medium">
                  ✨ 4 Title Page Options Generated
                </p>
                <p className="text-xs text-zinc-500">
                  Click any option to select it as your title page
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {pendingTitlePageVariations.map((url, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectVariation(url, index)}
                    className={cn(
                      "relative bg-zinc-800/50 rounded-lg overflow-hidden cursor-pointer aspect-[3/4]",
                      "border-2 transition-all hover:scale-[1.02] hover:shadow-xl",
                      selectedIndex === index || url === project?.titlePageImageUrl
                        ? "border-amber-500 ring-2 ring-amber-500 shadow-lg shadow-amber-500/20"
                        : "border-zinc-700 hover:border-amber-400"
                    )}
                  >
                    <Image
                      src={url}
                      alt={`Title page option ${index + 1}`}
                      fill
                      className="object-contain p-1"
                    />

                    {/* Composition label */}
                    <div className={cn(
                      "absolute top-2 left-2 text-white text-xs px-2 py-1 rounded",
                      index < 2 ? "bg-amber-600/80" : "bg-purple-600/80"
                    )}>
                      {getCompositionLabel(index)} #{(index % 2) + 1}
                    </div>

                    {/* Selected indicator */}
                    {(selectedIndex === index || url === project?.titlePageImageUrl) && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-black rounded-full p-1.5 shadow-lg">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity",
                      "flex items-end justify-center pb-3"
                    )}>
                      <span className="text-white text-xs font-medium">
                        {(selectedIndex === index || url === project?.titlePageImageUrl) ? 'Selected' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleClearVariations}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateVariations}
                  variant="outline"
                  disabled={isGeneratingTitlePageVariations}
                  className="gap-2"
                >
                  {isGeneratingTitlePageVariations ? (
                    <>
                      <LoadingSpinner size="sm" color="current" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate All
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {titlePageGenerationError && !isGeneratingTitlePageVariations && (
            <div className="mt-4 text-center">
              <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/50 rounded-lg p-4 inline-block">
                {titlePageGenerationError}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-zinc-900/30 border-zinc-800">
        <CardContent className="p-4">
          <h4 className="font-semibold text-white text-sm mb-2">💡 Tips for Title Pages</h4>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• The title page is the first interior page - it sets the tone for your book</li>
            <li>• Portrait style works well for character-driven stories</li>
            <li>• Story scene style is great for adventure or journey narratives</li>
            <li>• You can add the title text later in the PDF or KDP editor</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
