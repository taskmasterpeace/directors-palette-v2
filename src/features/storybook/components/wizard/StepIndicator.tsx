"use client"

import { cn } from "@/utils/utils"
import type { WizardStep, StepInfo } from "../../types/storybook.types"
import { getStepIndex } from "../../types/storybook.types"
import { BookOpen, Palette, Users, Images, BookCheck, Check } from "lucide-react"

interface StepIndicatorProps {
  steps: StepInfo[]
  currentStep: WizardStep
  onStepClick?: (step: WizardStep) => void
}

const stepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Palette,
  Users,
  Images,
  BookCheck,
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = getStepIndex(currentStep)

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isClickable = index < currentIndex && onStepClick

        const Icon = stepIcons[step.icon] || BookOpen

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle */}
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isClickable && "cursor-pointer hover:scale-105",
                !isClickable && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isCompleted && "bg-green-500 text-white",
                  isCurrent && "bg-amber-500 text-black ring-2 ring-amber-300 ring-offset-2 ring-offset-zinc-900",
                  !isCompleted && !isCurrent && "bg-zinc-800 text-zinc-500"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCurrent && "text-amber-400",
                  isCompleted && "text-green-400",
                  !isCurrent && !isCompleted && "text-zinc-500"
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-12 h-0.5 mx-2 mt-[-16px]",
                  index < currentIndex ? "bg-green-500" : "bg-zinc-700"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
