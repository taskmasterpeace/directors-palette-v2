"use client"

import { useMemo } from "react"
import { useStorybookStore } from "../store/storybook.store"
import { getWizardSteps, getStepIndex } from "../types/storybook.types"
import type { WizardStep } from "../types/storybook.types"

export interface SidebarWizardStep {
  id: WizardStep
  label: string
  icon: string
  status: 'completed' | 'current' | 'locked'
  canNavigate: boolean
}

/**
 * Hook to provide wizard step information for the sidebar navigation.
 * Always returns wizard steps when on the storybook tab, even without a project.
 */
export function useSidebarWizardSteps() {
  const { project, currentStep, storyMode } = useStorybookStore()

  return useMemo(() => {
    const wizardSteps = getWizardSteps(storyMode)
    const currentStepIndex = getStepIndex(currentStep, storyMode)

    const sidebarSteps: SidebarWizardStep[] = wizardSteps.map((step, index) => {
      const isCompleted = index < currentStepIndex
      const isCurrent = index === currentStepIndex

      return {
        id: step.id,
        label: step.label,
        icon: step.icon,
        status: isCompleted ? 'completed' : isCurrent ? 'current' : 'locked',
        // Can navigate to completed steps or current step
        canNavigate: isCompleted || isCurrent,
      }
    })

    return {
      steps: sidebarSteps,
      currentStepIndex,
      totalSteps: wizardSteps.length,
      projectTitle: project?.title || 'New Story',
    }
  }, [project, currentStep, storyMode])
}

/**
 * Navigate to a specific wizard step.
 * Respects navigation rules: can only go back or stay on current step.
 */
export function useNavigateToWizardStep() {
  const { setStep, currentStep, storyMode } = useStorybookStore()

  return (targetStep: WizardStep) => {
    const wizardSteps = getWizardSteps(storyMode)
    const currentIndex = getStepIndex(currentStep, storyMode)
    const targetIndex = wizardSteps.findIndex(s => s.id === targetStep)

    // Only allow navigating to current or previous steps
    if (targetIndex <= currentIndex) {
      setStep(targetStep)
    }
  }
}
