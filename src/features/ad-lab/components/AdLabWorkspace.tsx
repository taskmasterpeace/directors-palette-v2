'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdLabStore } from '../store/ad-lab.store'
import { AdLabStepper } from './AdLabStepper'
import { StrategyPhase } from './phases/StrategyPhase'
import { ExecutionPhase } from './phases/ExecutionPhase'
import { GeneratePhase } from './phases/GeneratePhase'
import type { AdLabPhase } from '../types/ad-lab.types'

const PHASE_COMPONENTS: Record<string, React.FC> = {
  strategy: StrategyPhase,
  execution: ExecutionPhase,
  generate: GeneratePhase,
}

export function AdLabWorkspace() {
  const { currentPhase, error, setError } = useAdLabStore()

  // Map hidden phases to generate (in case persisted state has 'quality' or 'refine')
  const effectivePhase: AdLabPhase = (currentPhase === 'quality' || currentPhase === 'refine')
    ? 'generate'
    : currentPhase

  const PhaseComponent = PHASE_COMPONENTS[effectivePhase] || StrategyPhase

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Stepper */}
      <div className="flex-shrink-0 border-b border-border/50 px-3 sm:px-6 py-3 sm:py-4 bg-card/50">
        <div className="flex items-center justify-between">
          <AdLabStepper />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-destructive hover:text-destructive/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Phase Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={effectivePhase}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <PhaseComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
