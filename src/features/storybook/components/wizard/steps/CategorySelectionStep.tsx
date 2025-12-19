"use client"

import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/utils/utils"
import { EDUCATION_CATEGORIES } from "../../../types/education.types"

export function CategorySelectionStep() {
  const { project, setEducationCategory, nextStep, previousStep } = useStorybookStore()

  const selectedCategory = project?.educationCategory

  const handleSelectCategory = (categoryId: string) => {
    setEducationCategory(categoryId)
  }

  const handleContinue = () => {
    if (selectedCategory) {
      nextStep()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          What should {project?.mainCharacterName || "they"} learn?
        </h2>
        <p className="text-muted-foreground">
          Choose an educational category for your storybook
        </p>
      </div>

      {/* Category Grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
        {EDUCATION_CATEGORIES.map((category) => (
          <Card
            key={category.id}
            onClick={() => handleSelectCategory(category.id)}
            className={cn(
              "p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
              selectedCategory === category.id
                ? "bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50"
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
              {EDUCATION_CATEGORIES.find(c => c.id === selectedCategory)?.name}
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
