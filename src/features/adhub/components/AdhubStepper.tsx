'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, Building2, LayoutTemplate, Palette, FileEdit, Video, Image } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useAdhubStore } from '../store/adhub.store'
import type { AdhubStep } from '../types/adhub.types'

interface StepInfo {
  id: AdhubStep
  label: string
  icon: React.ElementType
}

const STEPS: StepInfo[] = [
  { id: 'brand', label: 'Brand', icon: Building2 },
  { id: 'template', label: 'Template', icon: LayoutTemplate },
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'fill', label: 'Fill Fields', icon: FileEdit },
  { id: 'talk', label: 'Make It Talk', icon: Video },
  { id: 'result', label: 'Result', icon: Image },
]

const STEP_ORDER = STEPS.map(s => s.id)

export function AdhubStepper() {
  const { currentStep, setStep, selectedBrand, selectedTemplate, selectedStyle, generationResult } = useAdhubStore()

  const currentIndex = STEP_ORDER.indexOf(currentStep)

  const canNavigateTo = (step: AdhubStep): boolean => {
    const targetIndex = STEP_ORDER.indexOf(step)

    // Can always go back
    if (targetIndex < currentIndex) return true

    // Check if previous steps are completed
    switch (step) {
      case 'brand':
        return true
      case 'template':
        return !!selectedBrand
      case 'style':
        return !!selectedBrand && !!selectedTemplate
      case 'fill':
        return !!selectedBrand && !!selectedTemplate && !!selectedStyle
      case 'talk':
        return !!selectedBrand && !!selectedTemplate && !!selectedStyle
      case 'result':
        return !!generationResult
      default:
        return false
    }
  }

  const isStepCompleted = (step: AdhubStep): boolean => {
    switch (step) {
      case 'brand':
        return !!selectedBrand
      case 'template':
        return !!selectedTemplate
      case 'style':
        return !!selectedStyle
      case 'fill':
        return currentIndex > STEP_ORDER.indexOf('fill')
      case 'talk':
        return !!generationResult
      case 'result':
        return !!generationResult
      default:
        return false
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, index) => {
        const isActive = currentStep === step.id
        const isCompleted = isStepCompleted(step.id)
        const canClick = canNavigateTo(step.id)
        const Icon = step.icon

        return (
          <React.Fragment key={step.id}>
            {/* Step */}
            <button
              onClick={() => canClick && setStep(step.id)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                isActive && 'bg-primary/10 text-primary',
                !isActive && isCompleted && 'text-green-500 hover:bg-green-500/10',
                !isActive && !isCompleted && canClick && 'text-muted-foreground hover:bg-accent/50',
                !isActive && !isCompleted && !canClick && 'text-muted-foreground/50 cursor-not-allowed'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                isActive && 'bg-primary text-primary-foreground',
                !isActive && isCompleted && 'bg-green-500/20 text-green-500',
                !isActive && !isCompleted && 'bg-muted text-muted-foreground'
              )}>
                {isCompleted && !isActive ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </button>

            {/* Connector */}
            {index < STEPS.length - 1 && (
              <div className="flex-shrink-0 w-8 h-px relative">
                <div className="absolute inset-0 bg-border" />
                {isCompleted && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute inset-0 bg-green-500 origin-left"
                  />
                )}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
