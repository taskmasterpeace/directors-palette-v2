'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdhubStore } from '../store/adhub.store'
import { BrandSelectStep } from './steps/BrandSelectStep'
import { ProductSelectStep } from './steps/ProductSelectStep'
import { PresetGenerateStep } from './steps/PresetGenerateStep'
import { ResultStep } from './steps/ResultStep'
import { AdhubStepper } from './AdhubStepper'
import { ArchitectureHelpModal } from './InfoTip'
import type { AdhubStep } from '../types/adhub.types'

const STEP_COMPONENTS: Record<AdhubStep, React.FC> = {
  brand: BrandSelectStep,
  product: ProductSelectStep,
  'preset-generate': PresetGenerateStep,
  result: ResultStep,
}

export function AdhubWorkspace() {
  const { currentStep, error, setError } = useAdhubStore()

  const StepComponent = STEP_COMPONENTS[currentStep]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Stepper */}
      <div className="flex-shrink-0 border-b border-border/50 px-6 py-4 bg-card/50">
        <div className="flex items-center justify-between">
          <AdhubStepper />
          <ArchitectureHelpModal />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setError(undefined)}
              className="text-xs text-destructive hover:text-destructive/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
