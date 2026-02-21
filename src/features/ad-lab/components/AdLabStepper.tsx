'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, FileText, Grid3X3, Video } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useAdLabStore } from '../store/ad-lab.store'
import type { AdLabPhase } from '../types/ad-lab.types'

interface StepInfo {
  id: AdLabPhase
  label: string
  icon: React.ElementType
}

const STEPS: StepInfo[] = [
  { id: 'strategy', label: 'Strategy', icon: FileText },
  { id: 'execution', label: 'Execution', icon: Grid3X3 },
  { id: 'generate', label: 'Generate', icon: Video },
]

export function AdLabStepper() {
  const { currentPhase, completedPhases, setPhase, canNavigateTo } = useAdLabStore()

  // Map hidden phases to generate for display purposes
  const displayPhase: AdLabPhase = (currentPhase === 'quality' || currentPhase === 'refine')
    ? 'generate'
    : currentPhase

  return (
    <div className="flex items-center justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
      {STEPS.map((step, index) => {
        const isActive = displayPhase === step.id
        const isCompleted = completedPhases.includes(step.id)
        const canClick = canNavigateTo(step.id)
        const Icon = step.icon

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => canClick && setPhase(step.id)}
              disabled={!canClick}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg transition-all flex-shrink-0',
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

            {index < STEPS.length - 1 && (
              <div className="flex-shrink-0 w-4 sm:w-8 h-px relative">
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
