"use client"

import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/utils/utils"
import { EDUCATION_CATEGORIES } from "../../../types/education.types"

// Custom story option - allows freeform story creation
const CUSTOM_CATEGORY = {
  id: 'custom',
  name: 'Custom Story',
  icon: '✨',
  description: 'Create any story you want',
}

export function CategorySelectionStep() {
  const { project, setEducationCategory, setEducationTopic, setStep, previousStep } = useStorybookStore()

  const selectedCategory = project?.educationCategory

  const handleSelectCategory = (categoryId: string) => {
    setEducationCategory(categoryId)
  }

  const handleContinue = () => {
    if (selectedCategory) {
      // If custom category, skip topic step and go directly to settings
      if (selectedCategory === 'custom') {
        setEducationTopic('custom') // Set a placeholder topic
        setStep('settings')
      } else {
        setStep('topic')
      }
    }
  }

  // Combine custom option with educational categories
  const allCategories = [CUSTOM_CATEGORY, ...EDUCATION_CATEGORIES]

  return (
    <div className="flex flex-col h-full">
      {/* Category Grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
        {allCategories.map((category) => (
          <Card
            key={category.id}
            onClick={() => handleSelectCategory(category.id)}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
              selectedCategory === category.id
                ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50"
                : category.id === 'custom'
                  ? "bg-gradient-to-br from-purple-900/50 to-pink-900/30 border-purple-700/50 hover:border-purple-500/70"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
            )}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">{category.icon}</div>
              <h3 className="font-semibold text-white mb-1">{category.name}</h3>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Selected Info */}
      {selectedCategory && (
        <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
          <p className="text-sm text-amber-400">
            Selected: <span className="font-semibold">
              {allCategories.find(c => c.id === selectedCategory)?.name}
            </span>
            {selectedCategory === 'custom' && (
              <span className="text-purple-400 ml-2">- You&apos;ll describe your story idea next</span>
            )}
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
          disabled={!selectedCategory}
          className="bg-amber-500 hover:bg-amber-600 text-black gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
