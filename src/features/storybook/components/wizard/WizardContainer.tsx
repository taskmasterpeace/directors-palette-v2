"use client"

import { useStorybookStore } from "../../store/storybook.store"
import { WIZARD_STEPS, getStepIndex } from "../../types/storybook.types"
import { StepIndicator } from "./StepIndicator"
import { StepCard } from "./StepCard"
import { StoryInputStep } from "./steps/StoryInputStep"
import { StyleSelectionStep } from "./steps/StyleSelectionStep"
import { CharacterStep } from "./steps/CharacterStep"
import { PageGenerationStep } from "./steps/PageGenerationStep"
import { PreviewStep } from "./steps/PreviewStep"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

export function WizardContainer() {
  const {
    currentStep,
    project,
    isGenerating,
    nextStep,
    previousStep,
  } = useStorybookStore()

  const currentStepIndex = getStepIndex(currentStep)
  const currentStepInfo = WIZARD_STEPS[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

  // Determine if we can proceed to next step
  const canProceed = (): boolean => {
    if (isGenerating) return false

    switch (currentStep) {
      case 'story':
        return !!(project?.storyText && project.storyText.trim().length > 0 && project.pages.length > 0)
      case 'style':
        return !!project?.style
      case 'characters':
        // Can proceed even without characters (story might not have named characters)
        return true
      case 'pages':
        // Check if at least one page has an image
        return project?.pages.some(p => p.imageUrl) ?? false
      case 'preview':
        return true
      default:
        return false
    }
  }

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'story':
        return <StoryInputStep />
      case 'style':
        return <StyleSelectionStep />
      case 'characters':
        return <CharacterStep />
      case 'pages':
        return <PageGenerationStep />
      case 'preview':
        return <PreviewStep />
      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Step Indicator */}
      <StepIndicator
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepClick={(step) => {
          // Only allow clicking on completed steps
          const stepIndex = getStepIndex(step)
          if (stepIndex < currentStepIndex) {
            useStorybookStore.getState().setStep(step)
          }
        }}
      />

      {/* Step Content */}
      <StepCard
        backgroundImage={currentStepInfo.backgroundImage}
        className="flex-1 min-h-0"
      >
        {renderStepContent()}
      </StepCard>

      {/* Navigation Buttons - Always visible at bottom */}
      <div className="flex-shrink-0 flex justify-between items-center px-2 py-3 bg-zinc-950/90 border-t border-zinc-800">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={isFirstStep || isGenerating}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-sm text-zinc-500">
          Step {currentStepIndex + 1} of {WIZARD_STEPS.length}
        </div>

        {!isLastStep ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-black"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Working...
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        ) : (
          <Button
            className="gap-2 bg-green-500 hover:bg-green-600 text-white"
            disabled={isGenerating}
          >
            Finish
          </Button>
        )}
      </div>
    </div>
  )
}
