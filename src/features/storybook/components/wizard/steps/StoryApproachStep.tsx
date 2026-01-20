"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, RefreshCw, BookOpen } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import {
  getCategoryById,
  getTopicById,
  type StoryIdea
} from "../../../types/education.types"

export function StoryApproachStep() {
  const {
    project,
    storyIdeas,
    setStoryIdeas,
    selectStoryApproach,
    setGeneratedStory,
    setExtractedElements,
    nextStep,
    previousStep
  } = useStorybookStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const _category = project?.educationCategory ? getCategoryById(project.educationCategory) : null
  const _topic = project?.educationCategory && project?.educationTopic
    ? getTopicById(project.educationCategory, project.educationTopic)
    : null

  const handleSelectIdea = async (idea: StoryIdea) => {
    if (isGenerating) return

    setSelectedId(idea.id)
    setIsGenerating(true)
    setError(null)

    try {
      // Save selected approach
      selectStoryApproach(idea.id, idea.title, idea.summary)

      // Determine if this is a custom story
      const isCustomStory = project?.educationCategory === 'custom'

      // Generate full story with ALL customization options
      const storyResponse = await fetch("/api/storybook/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: project?.mainCharacterName,
          characterAge: project?.mainCharacterAge || 5,
          characterDescription: project?.characters?.[0]?.description,  // Pass main character description
          category: project?.educationCategory,
          topic: project?.educationTopic,
          pageCount: project?.pageCount || 12,
          sentencesPerPage: project?.sentencesPerPage || 3,
          approach: idea.approach,
          approachTitle: idea.title,
          approachSummary: idea.summary,
          // Pass customization options (these were being ignored before!)
          setting: project?.storySetting || project?.customSetting,
          customElements: project?.customElements,
          customNotes: isCustomStory ? undefined : project?.customNotes,
          // For custom stories, pass the story idea
          customStoryIdea: isCustomStory ? project?.customNotes : undefined,
          // Pass additional story characters (default to empty array)
          storyCharacters: project?.storyCharacters || []
        })
      })

      if (!storyResponse.ok) {
        throw new Error("Failed to generate story")
      }

      const storyData = await storyResponse.json()
      setGeneratedStory(storyData)

      // Extract characters and locations
      const extractResponse = await fetch("/api/storybook/extract-elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: storyData.title,
          pages: storyData.pages,
          mainCharacterName: project?.mainCharacterName
        })
      })

      if (extractResponse.ok) {
        const extractData = await extractResponse.json()
        setExtractedElements({
          characters: extractData.characters,
          locations: extractData.locations
        })
      }

      nextStep()
    } catch (err) {
      console.error("Error generating story:", err)
      setError("Failed to generate story. Please try again.")
      setSelectedId(null)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (isRegenerating || isGenerating) return

    setIsRegenerating(true)
    setError(null)

    const isCustomStory = project?.educationCategory === 'custom'

    try {
      const response = await fetch("/api/storybook/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: project?.mainCharacterName,
          characterAge: project?.mainCharacterAge || 5,
          category: project?.educationCategory,
          topic: project?.educationTopic,
          // Include customization options
          setting: project?.storySetting || project?.customSetting,
          customElements: project?.customElements,
          customNotes: isCustomStory ? undefined : project?.customNotes,
          customStoryIdea: isCustomStory ? project?.customNotes : undefined,
          // Pass additional story characters (default to empty array)
          storyCharacters: project?.storyCharacters || []
        })
      })

      if (!response.ok) {
        throw new Error("Failed to regenerate ideas")
      }

      const data = await response.json()
      setStoryIdeas(data.ideas)
      setSelectedId(null)
    } catch (err) {
      console.error("Error regenerating ideas:", err)
      setError("Failed to regenerate ideas. Please try again.")
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!storyIdeas || storyIdeas.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground mb-4">No story ideas generated yet.</p>
        <Button variant="ghost" onClick={previousStep}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Story Ideas Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        {storyIdeas.map((idea) => {
          const isSelected = selectedId === idea.id
          const isDisabled = isGenerating && !isSelected

          return (
            <Card
              key={idea.id}
              onClick={() => handleSelectIdea(idea)}
              className={cn(
                "transition-all duration-200 overflow-hidden",
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:scale-[1.01]",
                isSelected
                  ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{idea.approachIcon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                        {idea.approach}
                      </span>
                      {isSelected && isGenerating && (
                        <LoadingSpinner size="xs" />
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-lg mb-2 truncate">
                      {idea.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {idea.summary}
                    </p>
                  </div>
                </div>

                {isSelected && isGenerating && (
                  <div className="mt-4 pt-4 border-t border-amber-500/30">
                    <div className="flex items-center gap-2 text-amber-400">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm">Generating your story...</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Instructions */}
      {!isGenerating && (
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4 inline-block mr-1" />
            Click a story to generate it. You can always edit it in the next step.
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={previousStep}
          disabled={isGenerating}
          className="text-muted-foreground hover:text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={isGenerating || isRegenerating}
          className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 gap-2"
        >
          {isRegenerating ? (
            <>
              <LoadingSpinner size="sm" color="current" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              New Ideas
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
