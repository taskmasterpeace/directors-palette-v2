"use client"

import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/utils/utils"
import {
  getTopicsForAge,
  isTopicAppropriateForAge,
  getCategoryById
} from "../../../types/education.types"

export function TopicSelectionStep() {
  const { project, setEducationTopic, nextStep, previousStep } = useStorybookStore()

  const selectedCategory = project?.educationCategory
  const selectedTopic = project?.educationTopic
  const characterAge = project?.mainCharacterAge || 5

  const category = selectedCategory ? getCategoryById(selectedCategory) : null
  const _availableTopics = selectedCategory ? getTopicsForAge(selectedCategory, characterAge) : []
  const allTopics = category?.topics || []

  const handleSelectTopic = (topicId: string) => {
    // Only allow selection of age-appropriate topics
    const topic = allTopics.find(t => t.id === topicId)
    if (topic && isTopicAppropriateForAge(topic, characterAge)) {
      setEducationTopic(topicId)
    }
  }

  const handleContinue = () => {
    if (selectedTopic) {
      nextStep()
    }
  }

  if (!category) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-muted-foreground">Please select a category first</p>
        <Button variant="ghost" onClick={previousStep} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Categories
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Topic Grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allTopics.map((topic) => {
          const isAvailable = isTopicAppropriateForAge(topic, characterAge)
          const isSelected = selectedTopic === topic.id

          return (
            <Card
              key={topic.id}
              onClick={() => handleSelectTopic(topic.id)}
              className={cn(
                "p-4 transition-all duration-200",
                isAvailable
                  ? "cursor-pointer hover:scale-[1.02]"
                  : "cursor-not-allowed opacity-40",
                isSelected
                  ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50"
                  : isAvailable
                    ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                    : "bg-zinc-900/30 border-zinc-800"
              )}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{topic.icon || "📌"}</div>
                <h3 className={cn(
                  "font-semibold mb-1",
                  isAvailable ? "text-white" : "text-zinc-500"
                )}>
                  {topic.name}
                </h3>
                <p className={cn(
                  "text-xs",
                  isAvailable ? "text-muted-foreground" : "text-zinc-600"
                )}>
                  {topic.description}
                </p>
                {!isAvailable && (
                  <p className="text-xs text-zinc-600 mt-2">
                    Ages {topic.ageRanges.join(", ")}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Selected Info */}
      {selectedTopic && (
        <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
          <p className="text-sm text-amber-400">
            Selected: <span className="font-semibold">
              {allTopics.find(t => t.id === selectedTopic)?.name}
            </span>
            {" - "}
            <span className="text-amber-300/80">
              {allTopics.find(t => t.id === selectedTopic)?.description}
            </span>
          </p>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={previousStep}
          className="text-muted-foreground hover:text-white gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!selectedTopic}
          className="bg-amber-500 hover:bg-amber-600 text-black gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
