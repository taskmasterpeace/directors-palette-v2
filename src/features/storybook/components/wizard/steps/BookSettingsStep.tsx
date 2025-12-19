"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/utils/utils"
import {
  PAGE_COUNT_OPTIONS,
  SENTENCES_PER_PAGE_OPTIONS,
  getCategoryById,
  getTopicById,
  type PageCount,
  type SentencesPerPage
} from "../../../types/education.types"

export function BookSettingsStep() {
  const { project, setBookSettings, setStoryIdeas, nextStep, previousStep } = useStorybookStore()

  const [pageCount, setPageCount] = useState<PageCount>((project?.pageCount as PageCount) || 8)
  const [sentencesPerPage, setSentencesPerPage] = useState<SentencesPerPage>((project?.sentencesPerPage as SentencesPerPage) || 3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = project?.educationCategory ? getCategoryById(project.educationCategory) : null
  const topic = project?.educationCategory && project?.educationTopic
    ? getTopicById(project.educationCategory, project.educationTopic)
    : null

  const handleGenerateIdeas = async () => {
    if (!project?.mainCharacterName || !project?.educationCategory || !project?.educationTopic) {
      setError("Missing required information")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Save settings first
      setBookSettings(pageCount, sentencesPerPage)

      // Generate story ideas
      const response = await fetch("/api/storybook/generate-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterName: project.mainCharacterName,
          characterAge: project.mainCharacterAge || 5,
          category: project.educationCategory,
          topic: project.educationTopic
        })
      })

      if (!response.ok) {
        throw new Error("Failed to generate story ideas")
      }

      const data = await response.json()
      setStoryIdeas(data.ideas)
      nextStep()
    } catch (err) {
      console.error("Error generating ideas:", err)
      setError("Failed to generate story ideas. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const totalSentences = pageCount * sentencesPerPage
  const estimatedWordCount = totalSentences * 12 // ~12 words per sentence for children's books

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Configure Your Book</h2>
        <p className="text-muted-foreground">
          {category?.icon} {category?.name} → {topic?.icon} {topic?.name}
        </p>
      </div>

      {/* Settings Cards */}
      <div className="flex-1 space-y-6">
        {/* Page Count */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Page Count</CardTitle>
            <p className="text-sm text-muted-foreground">How many pages should your book have?</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {PAGE_COUNT_OPTIONS.map((count) => (
                <Button
                  key={count}
                  variant="outline"
                  onClick={() => setPageCount(count)}
                  className={cn(
                    "flex-1 h-14 text-lg font-semibold transition-all",
                    pageCount === count
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  {count}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sentences Per Page */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">Sentences Per Page</CardTitle>
            <p className="text-sm text-muted-foreground">
              More sentences = denser text, better for older children
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {SENTENCES_PER_PAGE_OPTIONS.map((count) => (
                <Button
                  key={count}
                  variant="outline"
                  onClick={() => setSentencesPerPage(count)}
                  className={cn(
                    "flex-1 h-14 text-lg font-semibold transition-all",
                    sentencesPerPage === count
                      ? "bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  {count}
                </Button>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>← Simple (toddlers)</span>
              <span>Dense (early readers) →</span>
            </div>
          </CardContent>
        </Card>

        {/* Preview Summary */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-6">
            <h3 className="font-semibold text-white mb-3">Book Preview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Character</p>
                <p className="text-white font-medium">
                  {project?.mainCharacterName}, {project?.mainCharacterAge} years old
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Learning</p>
                <p className="text-white font-medium">{topic?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Pages</p>
                <p className="text-amber-400 font-medium">{pageCount} pages</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Words</p>
                <p className="text-amber-400 font-medium">~{estimatedWordCount} words</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-zinc-900/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {project?.mainCharacterName} will learn about {topic?.name?.toLowerCase()} in a
                {pageCount}-page story with {sentencesPerPage} sentence{sentencesPerPage > 1 ? "s" : ""} per page.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

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
          onClick={handleGenerateIdeas}
          disabled={isGenerating}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black gap-2 px-6"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Ideas...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate 4 Story Ideas
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
