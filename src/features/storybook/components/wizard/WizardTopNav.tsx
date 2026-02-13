"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { StepInfo, WizardStep } from "../../types/storybook.types"
import { cn } from "@/utils/utils"

// Get icon for each wizard step
import {
  Users,
  BookOpen,
  PenTool,
  Sparkles,
  BookCheck,
  FileImage,
  BookMarked,
  Image as ImageIcon,
} from "lucide-react"

function getStepIcon(stepId: string) {
  switch (stepId) {
    case 'character-setup':
      return Users
    case 'category':
    case 'topic':
    case 'settings':
      return BookOpen
    case 'approach':
    case 'review':
      return PenTool
    case 'story':
      return PenTool
    case 'style':
      return Sparkles
    case 'characters':
      return Users
    case 'pages':
      return ImageIcon
    case 'title-page':
      return FileImage
    case 'back-cover':
      return BookMarked
    case 'preview':
      return BookCheck
    default:
      return BookOpen
  }
}

interface WizardTopNavProps {
  currentStepInfo: StepInfo
  stepIndex: number
  projectTitle?: string
  canProceed: boolean
  onBack: () => void
  onNext: () => void
  onFinish?: () => void
  isFirstStep: boolean
  isLastStep: boolean
  isGenerating: boolean
  isSaving?: boolean
  hideNavigation?: boolean
  wizardSteps: StepInfo[]
  furthestStepIndex: number
  onStepClick: (stepId: WizardStep) => void
}

export function WizardTopNav({
  currentStepInfo,
  stepIndex,
  projectTitle,
  canProceed,
  onBack,
  onNext,
  onFinish,
  isFirstStep,
  isLastStep,
  isGenerating,
  isSaving = false,
  hideNavigation = false,
  wizardSteps,
  furthestStepIndex,
  onStepClick,
}: WizardTopNavProps) {
  const StepIcon = getStepIcon(currentStepInfo.id)

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-lg flex-shrink-0">
      {/* Left: Back Button */}
      <div className="w-24">
        {!hideNavigation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isFirstStep || isGenerating}
            className={cn(
              "gap-1 text-zinc-400 hover:text-white hover:bg-zinc-800",
              (isFirstStep || isGenerating) && "opacity-50"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>

      {/* Center: Step Info */}
      <div className="flex items-center gap-3 flex-1 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <StepIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {currentStepInfo.label}
              </span>
              {projectTitle && (
                <>
                  <span className="text-zinc-600">-</span>
                  <span className="text-sm text-zinc-400 max-w-[200px] truncate">
                    {projectTitle}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step Pills */}
        <div className="flex items-center gap-1">
          {wizardSteps.map((step, i) => {
            const isCurrentStep = i === stepIndex
            const isVisited = i <= furthestStepIndex
            const isClickable = isVisited && !isGenerating
            return (
              <button
                key={step.id}
                onClick={() => isClickable && onStepClick(step.id as WizardStep)}
                disabled={!isClickable}
                title={step.label}
                className={cn(
                  "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all",
                  isCurrentStep
                    ? "bg-amber-500 text-black"
                    : isVisited
                      ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600 cursor-pointer"
                      : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                )}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Next/Finish Button */}
      <div className="w-24 flex justify-end">
        {!hideNavigation && (
          !isLastStep ? (
            <Button
              size="sm"
              onClick={onNext}
              disabled={!canProceed || isGenerating}
              className="gap-1 bg-amber-500 hover:bg-amber-600 text-black"
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
              size="sm"
              onClick={onFinish}
              disabled={isGenerating || isSaving}
              className="gap-1 bg-green-500 hover:bg-green-600 text-white"
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
          )
        )}
      </div>
    </div>
  )
}
