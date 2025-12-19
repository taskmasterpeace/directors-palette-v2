"use client"

import { useStorybookStore } from "../../store/storybook.store"
import { getWizardSteps, getStepIndex } from "../../types/storybook.types"
import { StepIndicator } from "./StepIndicator"
import { StepCard } from "./StepCard"
// Paste mode steps (original flow)
import { StoryInputStep } from "./steps/StoryInputStep"
// Generate mode steps (new educational flow)
import { CharacterSetupStep } from "./steps/CharacterSetupStep"
import { CategorySelectionStep } from "./steps/CategorySelectionStep"
import { TopicSelectionStep } from "./steps/TopicSelectionStep"
import { BookSettingsStep } from "./steps/BookSettingsStep"
import { StoryApproachStep } from "./steps/StoryApproachStep"
import { StoryReviewStep } from "./steps/StoryReviewStep"
// Shared steps
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

  // Get the appropriate wizard steps based on story mode
  const storyMode = project?.storyMode || 'generate'
  const wizardSteps = getWizardSteps(storyMode)
  const currentStepIndex = getStepIndex(currentStep, storyMode)
  const currentStepInfo = wizardSteps[currentStepIndex] || wizardSteps[0]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === wizardSteps.length - 1

  // Determine if we can proceed to next step
  const canProceed = (): boolean => {
    if (isGenerating) return false

    switch (currentStep) {
      // Generate mode steps
      case 'character-setup':
        return !!(project?.mainCharacterName && project.mainCharacterName.trim().length > 0)
      case 'category':
        return !!project?.educationCategory
      case 'topic':
        return !!project?.educationTopic
      case 'settings':
        // Settings step handles its own navigation via API call
        return false
      case 'approach':
        // Approach step handles its own navigation via API call
        return false
      case 'review':
        return !!project?.generatedStory
      // Paste mode / shared steps
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
      // Generate mode steps
      case 'character-setup':
        return <CharacterSetupStep />
      case 'category':
        return <CategorySelectionStep />
      case 'topic':
        return <TopicSelectionStep />
      case 'settings':
        return <BookSettingsStep />
      case 'approach':
        return <StoryApproachStep />
      case 'review':
        return <StoryReviewStep />
      // Paste mode steps
      case 'story':
        return <StoryInputStep />
      // Shared steps
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

  // Check if current step handles its own navigation
  const stepHandlesOwnNavigation = ['character-setup', 'category', 'topic', 'settings', 'approach', 'review'].includes(currentStep)

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Step Indicator */}
      <StepIndicator
        steps={wizardSteps}
        currentStep={currentStep}
        onStepClick={(step) => {
          // Only allow clicking on completed steps
          const stepIndex = getStepIndex(step, storyMode)
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

      {/* Navigation Buttons - Only show for steps that don't handle their own navigation */}
      {!stepHandlesOwnNavigation && (
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
            Step {currentStepIndex + 1} of {wizardSteps.length}
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
      )}
    </div>
  )
}
