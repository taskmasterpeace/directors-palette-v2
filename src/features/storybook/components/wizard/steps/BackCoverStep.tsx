"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useCoverGeneration } from "../../../hooks/useCoverGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Sparkles,
  Check,
  RefreshCw,
  X,
  FileText,
  Image as ImageIcon,
  Palette,
  Sunset,
  Wand2,
  Edit3,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"

/**
 * BackCoverStep
 *
 * Allows users to:
 * 1. Generate and edit a back cover synopsis (AI-generated marketing text)
 * 2. Generate and select from 4 back cover image variations:
 *    - 2 "Closing Scene" compositions (character in triumphant/peaceful moment)
 *    - 2 "Decorative" compositions (decorative pattern with character vignette)
 *
 * The selected back cover becomes part of the cover wrap PDF.
 */
export function BackCoverStep() {
  const {
    project,
    pendingBackCoverVariations,
    isGeneratingBackCoverSynopsis,
    isGeneratingBackCoverVariations,
    backCoverGenerationError,
    setPendingBackCoverVariations,
    setGeneratingBackCoverSynopsis,
    setGeneratingBackCoverVariations,
    selectBackCoverVariation,
    setBackCoverSynopsis,
    setBackCoverGenerationError,
  } = useStorybookStore()

  const { generateSynopsis, generateBackCoverVariations } = useCoverGeneration()

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [editedSynopsis, setEditedSynopsis] = useState<string>(project?.backCoverSynopsis || "")
  const [isEditingSynopsis, setIsEditingSynopsis] = useState(false)

  // Handle synopsis generation
  const handleGenerateSynopsis = async () => {
    setGeneratingBackCoverSynopsis(true)
    setBackCoverGenerationError(undefined)

    const result = await generateSynopsis()

    if (result.success && result.synopsis) {
      setBackCoverSynopsis(result.synopsis)
      setEditedSynopsis(result.synopsis)
    } else {
      setBackCoverGenerationError(result.error || 'Failed to generate synopsis')
    }

    setGeneratingBackCoverSynopsis(false)
  }

  // Handle synopsis save
  const handleSaveSynopsis = () => {
    setBackCoverSynopsis(editedSynopsis)
    setIsEditingSynopsis(false)
  }

  // Handle image variation generation
  const handleGenerateVariations = async () => {
    setGeneratingBackCoverVariations(true)
    setBackCoverGenerationError(undefined)

    const results = await generateBackCoverVariations()
    const successfulUrls = results
      .filter(r => r.success)
      .map(r => r.imageUrl!)

    if (successfulUrls.length > 0) {
      setPendingBackCoverVariations(successfulUrls)
      setSelectedIndex(null)
    } else {
      setBackCoverGenerationError('Failed to generate back cover variations. Please try again.')
    }

    setGeneratingBackCoverVariations(false)
  }

  const handleSelectVariation = (url: string, index: number) => {
    setSelectedIndex(index)
    selectBackCoverVariation(url)
  }

  const handleClearVariations = () => {
    setPendingBackCoverVariations([])
    setSelectedIndex(null)
  }

  // Determine composition type for labeling
  const getCompositionLabel = (index: number): string => {
    // Index 0, 1 = Closing Scene; Index 2, 3 = Decorative
    if (index < 2) return "Closing Scene"
    return "Decorative"
  }

  const getCompositionIcon = (index: number) => {
    if (index < 2) return <Sunset className="w-3 h-3" />
    return <Palette className="w-3 h-3" />
  }

  const hasExistingSynopsis = !!project?.backCoverSynopsis
  const hasExistingBackCover = !!project?.backCoverImageUrl
  const hasVariationsToShow = pendingBackCoverVariations.length > 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Back Cover Design</h2>
        <p className="text-zinc-400">
          Create your back cover synopsis and artwork. This appears on the back of your printed book.
        </p>
      </div>

      {/* Synopsis Section */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Synopsis</h3>
                <p className="text-xs text-zinc-400">
                  The compelling text that appears on your back cover
                </p>
              </div>
            </div>
            {hasExistingSynopsis && !isEditingSynopsis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingSynopsis(true)}
                className="gap-1 text-zinc-400 hover:text-white"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>

          {/* No Synopsis Yet */}
          {!hasExistingSynopsis && !isEditingSynopsis && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-zinc-500" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-zinc-400">
                  Generate a compelling synopsis that will make readers want to read your book
                </p>
              </div>
              <Button
                onClick={handleGenerateSynopsis}
                disabled={isGeneratingBackCoverSynopsis}
                className="gap-2"
              >
                {isGeneratingBackCoverSynopsis ? (
                  <>
                    <LoadingSpinner size="sm" color="current" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Synopsis
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Display/Edit Synopsis */}
          {(hasExistingSynopsis || isEditingSynopsis) && (
            <div className="space-y-3">
              {isEditingSynopsis ? (
                <>
                  <Label className="text-sm text-zinc-400">Edit your synopsis:</Label>
                  <Textarea
                    value={editedSynopsis}
                    onChange={(e) => setEditedSynopsis(e.target.value)}
                    className="min-h-[120px] bg-zinc-800 border-zinc-700"
                    placeholder="Write a compelling 2-4 sentence synopsis..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditedSynopsis(project?.backCoverSynopsis || "")
                        setIsEditingSynopsis(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveSynopsis}
                      className="gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-white leading-relaxed">
                    {project?.backCoverSynopsis}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSynopsis}
                  disabled={isGeneratingBackCoverSynopsis}
                  className="gap-1"
                >
                  {isGeneratingBackCoverSynopsis ? (
                    <>
                      <LoadingSpinner size="sm" color="current" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards for Image Compositions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Sunset className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Closing Scene</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Character in a peaceful, triumphant moment - suggests a happy resolution.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-700">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Palette className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Decorative</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Elegant pattern with small character vignette - prioritizes text readability.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Selection Section */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ImageIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Back Cover Image</h3>
              <p className="text-xs text-zinc-400">
                Optional artwork for your back cover
              </p>
            </div>
          </div>

          {/* Current Back Cover Display (if exists and no variations pending) */}
          {hasExistingBackCover && !hasVariationsToShow && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm text-green-400 font-medium flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Back Cover Selected
                </p>
              </div>

              <div className="relative w-full max-w-sm mx-auto bg-zinc-800/50 rounded-xl overflow-hidden shadow-2xl border border-zinc-700/50 aspect-[3/4]">
                <Image
                  src={project.backCoverImageUrl!}
                  alt="Selected back cover"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>

              <div className="text-center space-y-2">
                <Button
                  onClick={handleGenerateVariations}
                  disabled={isGeneratingBackCoverVariations}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                  size="lg"
                >
                  {isGeneratingBackCoverVariations ? (
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
              </div>
            </div>
          )}

          {/* No Back Cover Yet - Generate Button */}
          {!hasExistingBackCover && !hasVariationsToShow && (
            <div className="text-center py-12 space-y-6">
              <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center">
                <Wand2 className="w-10 h-10 text-zinc-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Create Back Cover Art</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Generate 4 unique back cover options using your character and style guide.
                  You&apos;ll get 2 closing scene and 2 decorative variations.
                </p>
              </div>

              {backCoverGenerationError && (
                <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/50 rounded-lg p-3 max-w-md mx-auto">
                  {backCoverGenerationError}
                </div>
              )}

              <div className="flex flex-col gap-3 items-center">
                <Button
                  onClick={handleGenerateVariations}
                  disabled={isGeneratingBackCoverVariations || !project?.style?.styleGuideUrl}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold"
                  size="lg"
                >
                  {isGeneratingBackCoverVariations ? (
                    <>
                      <LoadingSpinner size="sm" color="current" />
                      Generating 4 Variations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Back Covers
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-zinc-300"
                  onClick={() => {
                    // Skip - user can proceed without back cover image
                    // The store already allows backCoverImageUrl to be undefined
                  }}
                >
                  Skip - Use Solid Color
                </Button>
              </div>

              {!project?.style?.styleGuideUrl && (
                <p className="text-xs text-amber-400">
                  Style guide required. Please generate a style guide first.
                </p>
              )}

              {isGeneratingBackCoverVariations && (
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
                  4 Back Cover Options Generated
                </p>
                <p className="text-xs text-zinc-500">
                  Click any option to select it as your back cover
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {pendingBackCoverVariations.map((url, index) => (
                  <div
                    key={index}
                    onClick={() => handleSelectVariation(url, index)}
                    className={cn(
                      "relative bg-zinc-800/50 rounded-lg overflow-hidden cursor-pointer aspect-[3/4]",
                      "border-2 transition-all hover:scale-[1.02] hover:shadow-xl",
                      selectedIndex === index || url === project?.backCoverImageUrl
                        ? "border-amber-500 ring-2 ring-amber-500 shadow-lg shadow-amber-500/20"
                        : "border-zinc-700 hover:border-amber-400"
                    )}
                  >
                    <Image
                      src={url}
                      alt={`Back cover option ${index + 1}`}
                      fill
                      className="object-contain p-1"
                    />

                    {/* Composition label */}
                    <div className={cn(
                      "absolute top-2 left-2 text-white text-xs px-2 py-1 rounded flex items-center gap-1",
                      index < 2 ? "bg-orange-600/80" : "bg-purple-600/80"
                    )}>
                      {getCompositionIcon(index)}
                      {getCompositionLabel(index)} #{(index % 2) + 1}
                    </div>

                    {/* Selected indicator */}
                    {(selectedIndex === index || url === project?.backCoverImageUrl) && (
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
                        {(selectedIndex === index || url === project?.backCoverImageUrl) ? 'Selected' : 'Click to select'}
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
                  disabled={isGeneratingBackCoverVariations}
                  className="gap-2"
                >
                  {isGeneratingBackCoverVariations ? (
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
          {backCoverGenerationError && !isGeneratingBackCoverVariations && (
            <div className="mt-4 text-center">
              <div className="text-red-400 text-sm bg-red-950/20 border border-red-900/50 rounded-lg p-4 inline-block">
                {backCoverGenerationError}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-zinc-900/30 border-zinc-800">
        <CardContent className="p-4">
          <h4 className="font-semibold text-white text-sm mb-2">Tips for Back Covers</h4>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>A compelling synopsis hooks readers in 2-4 sentences without spoiling the ending</li>
            <li>Closing scene images work well for emotional or adventure stories</li>
            <li>Decorative designs are ideal when you have longer synopsis text</li>
            <li>Amazon KDP requires a barcode area in the bottom-left corner of the back cover</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
