"use client"

import { useEffect, useState } from "react"
import { useStorybookStore, type SavedProjectSummary } from "../../store/storybook.store"
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
import { ChevronLeft, ChevronRight, Save, FolderOpen, FilePlus, Trash2, Check } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

export function WizardContainer() {
  const {
    currentStep,
    project,
    isGenerating,
    nextStep,
    previousStep,
    // Project persistence
    savedProjectId,
    isSaving,
    savedProjects,
    saveProject,
    loadProject,
    clearProject,
    fetchSavedProjects,
    deleteSavedProject,
    updateProject,
  } = useStorybookStore()

  const { toast } = useToast()
  const [showSaved, setShowSaved] = useState(false)

  // Fetch saved projects on mount
  useEffect(() => {
    fetchSavedProjects()
  }, [fetchSavedProjects])

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
        // Allow users to proceed to preview even without generated images
        // They can come back to generate images later
        // Fix for Issue #2: Removed validation catch-22 that blocked proceeding
        return true
      case 'preview':
        return true
      default:
        return false
    }
  }

  // Handle finish button - save project as completed
  const handleFinish = async () => {
    if (!project) return

    try {
      // Update project status to completed before saving
      updateProject({ status: 'completed' })

      // Save to database
      await saveProject()

      // Show success message
      toast({
        title: "Storybook Completed!",
        description: `"${project.title}" has been saved successfully.`,
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save storybook",
        variant: "destructive",
      })
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
      {/* Header with Project Actions */}
      <div className="flex items-center justify-between gap-4">
        {/* Step Indicator */}
        <div className="flex-1">
          <StepIndicator
            steps={wizardSteps}
            currentStep={currentStep}
            storyMode={storyMode}
            onStepClick={(step) => {
              // Only allow clicking on completed steps
              const stepIndex = getStepIndex(step, storyMode)
              if (stepIndex < currentStepIndex) {
                useStorybookStore.getState().setStep(step)
              }
            }}
          />
        </div>

        {/* Project Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveProject()}
            disabled={!project || isSaving}
            className="gap-2"
            title={savedProjectId ? "Update saved project" : "Save project"}
          >
            {isSaving ? (
              <LoadingSpinner size="sm" color="current" />
            ) : savedProjectId ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedProjectId ? "Saved" : "Save"}
          </Button>

          {/* Load/Projects Dropdown */}
          <DropdownMenu open={showSaved} onOpenChange={setShowSaved}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                Load
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Saved Projects</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedProjects.length === 0 ? (
                <div className="px-2 py-4 text-sm text-zinc-500 text-center">
                  No saved projects yet
                </div>
              ) : (
                savedProjects.map((proj: SavedProjectSummary) => (
                  <DropdownMenuItem
                    key={proj.id}
                    className="flex items-center justify-between group cursor-pointer"
                    onClick={() => {
                      loadProject(proj.id)
                      setShowSaved(false)
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{proj.title}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(proj.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm("Delete this project?")) {
                          deleteSavedProject(proj.id)
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New/Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (project && !savedProjectId) {
                if (confirm("Discard unsaved changes and start fresh?")) {
                  clearProject()
                }
              } else {
                clearProject()
              }
            }}
            className="gap-2"
            title="Start a new project"
          >
            <FilePlus className="w-4 h-4" />
            New
          </Button>
        </div>
      </div>

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
            className="gap-2 hover:bg-zinc-700/50 dark:hover:bg-zinc-800"
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
                  <LoadingSpinner size="sm" color="current" />
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
              onClick={handleFinish}
              disabled={isGenerating || isSaving}
              className="gap-2 bg-green-500 hover:bg-green-600 text-white"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" color="current" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Finish
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
