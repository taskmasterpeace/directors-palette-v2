'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Check, FileText, Grid3X3, BarChart3, RefreshCw, Video } from 'lucide-react'
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
  { id: 'quality', label: 'Quality', icon: BarChart3 },
  { id: 'refine', label: 'Refine', icon: RefreshCw },
  { id: 'generate', label: 'Generate', icon: Video },
]

export function AdLabStepper() {
  const { currentPhase, completedPhases, setPhase, canNavigateTo } = useAdLabStore()

  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, index) => {
        const isActive = currentPhase === step.id
        const isCompleted = completedPhases.includes(step.id)
        const canClick = canNavigateTo(step.id)
        const Icon = step.icon

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => canClick && setPhase(step.id)}
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
