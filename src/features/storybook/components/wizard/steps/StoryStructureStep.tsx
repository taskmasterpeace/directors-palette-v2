"use client"

import { useCallback, useMemo } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Info } from "lucide-react"
import { cn } from "@/utils/utils"
import {
  STORY_STRUCTURES,
  getStoryStructure,
} from "../../../data/story-structures.data"
import type { StoryStructure, AgeRange } from "../../../types/story-structure.types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * StoryStructureStep
 *
 * Allows users to select a narrative framework for their story.
 * Different structures (Story Spine, Hero's Journey, etc.) produce
 * stories with different lengths and narrative beats.
 */
export function StoryStructureStep() {
  const { project, setStoryStructure } = useStorybookStore()

  const selectedStructureId = project?.storyStructureId
  const targetAge = project?.targetAge || 5

  // Filter structures suitable for the target age
  const suitableStructures = useMemo(() => {
    // Map age to age range
    let ageRange: AgeRange = '3-5'
    if (targetAge <= 4) ageRange = '2-4'
    else if (targetAge <= 5) ageRange = '3-5'
    else if (targetAge <= 7) ageRange = '5-7'
    else if (targetAge <= 8) ageRange = '6-8'
    else if (targetAge <= 10) ageRange = '8-10'
    else ageRange = '9-12'

    // Sort structures: suitable first, then others
    return STORY_STRUCTURES.sort((a, b) => {
      const aHasAge = a.ageRanges.includes(ageRange)
      const bHasAge = b.ageRanges.includes(ageRange)
      if (aHasAge && !bHasAge) return -1
      if (!aHasAge && bHasAge) return 1
      return 0
    })
  }, [targetAge])

  const handleSelectStructure = useCallback(
    (structure: StoryStructure) => {
      setStoryStructure(structure.id)
    },
    [setStoryStructure]
  )

  const selectedStructure = selectedStructureId
    ? getStoryStructure(selectedStructureId)
    : null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">
          Choose Your Story Structure
        </h2>
        <p className="text-sm text-zinc-400">
          Each structure creates a different narrative flow. Pick one that fits
          your story.
        </p>
      </div>

      {/* Structure Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suitableStructures.map((structure) => (
          <StructureCard
            key={structure.id}
            structure={structure}
            isSelected={selectedStructureId === structure.id}
            targetAge={targetAge}
            onSelect={() => handleSelectStructure(structure)}
          />
        ))}
      </div>

      {/* Selected Structure Details */}
      {selectedStructure && (
        <div className="mt-6 p-4 bg-zinc-900/50 border border-amber-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{selectedStructure.icon}</span>
            <h3 className="text-lg font-semibold text-white">
              {selectedStructure.name}
            </h3>
            <Badge variant="secondary" className="ml-auto">
              {selectedStructure.beatCount} beats
            </Badge>
          </div>

          <p className="text-sm text-zinc-300 mb-4">
            {selectedStructure.longDescription}
          </p>

          {/* Beat Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-zinc-400">Story Beats:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedStructure.beats.map((beat, index) => (
                <TooltipProvider key={beat.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 cursor-help">
                        <span className="text-amber-400 font-medium">
                          {index + 1}.
                        </span>
                        <span>{beat.name}</span>
                        {beat.canBeSpread && (
                          <span className="text-amber-400" title="Can be a 2-page spread">
                            ↔
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium mb-1">{beat.purpose}</p>
                      <p className="text-xs text-zinc-400">
                        {beat.promptGuidance}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Best For */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-zinc-500">Best for:</span>
            {selectedStructure.bestFor.map((item) => (
              <Badge key={item} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tip */}
      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-zinc-400">
          <span className="text-amber-400 font-medium">Tip:</span> For younger
          children (ages 2-5), Story Spine or Kishōtenketsu work best. For older
          children who enjoy adventures, try the Hero&apos;s Journey.
        </p>
      </div>
    </div>
  )
}

/**
 * Individual structure card
 */
interface StructureCardProps {
  structure: StoryStructure
  isSelected: boolean
  targetAge: number
  onSelect: () => void
}

function StructureCard({
  structure,
  isSelected,
  targetAge,
  onSelect,
}: StructureCardProps) {
  // Check if this structure is suitable for the target age
  let ageRange: AgeRange = '3-5'
  if (targetAge <= 4) ageRange = '2-4'
  else if (targetAge <= 5) ageRange = '3-5'
  else if (targetAge <= 7) ageRange = '5-7'
  else if (targetAge <= 8) ageRange = '6-8'
  else if (targetAge <= 10) ageRange = '8-10'
  else ageRange = '9-12'

  const isSuitable = structure.ageRanges.includes(ageRange)

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:scale-[1.02] relative",
        "bg-zinc-900/50 border-zinc-800",
        isSelected && "ring-2 ring-amber-500 border-amber-500",
        !isSuitable && "opacity-60"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{structure.icon}</span>
            <div>
              <h3 className="font-semibold text-white">{structure.name}</h3>
              <p className="text-xs text-zinc-500">{structure.origin}</p>
            </div>
          </div>
          {isSelected && (
            <div className="bg-amber-500 rounded-full p-1">
              <Check className="w-4 h-4 text-black" />
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
          {structure.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {structure.beatCount} beats
          </Badge>
          <Badge
            variant={isSuitable ? "default" : "outline"}
            className={cn(
              "text-xs",
              isSuitable
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "text-zinc-500"
            )}
          >
            Ages {structure.ageRanges.join(", ")}
          </Badge>
        </div>

        {/* Page count suggestions */}
        <div className="mt-2 text-xs text-zinc-500">
          Works well with {structure.suggestedPageCounts.join(", ")} pages
        </div>

        {/* Not recommended badge */}
        {!isSuitable && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="text-xs text-zinc-500">
              Advanced
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
