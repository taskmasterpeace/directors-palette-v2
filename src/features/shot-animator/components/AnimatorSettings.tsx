'use client'

import React from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { AnimationModel } from '../types'
import { ANIMATION_MODELS } from '../config/models.config'

interface AnimatorSettingsProps {
  selectedCount: number
  estimatedCost: number
  isGenerating: boolean
  generationPhase: string | null
  showCostConfirm: boolean
  selectedModel: AnimationModel
  hasUser: boolean
  onGenerateAll: () => void
  onConfirmGeneration: () => void
  onCostConfirmChange: (open: boolean) => void
}

export function AnimatorSettings({
  selectedCount,
  estimatedCost,
  isGenerating,
  generationPhase,
  showCostConfirm,
  selectedModel,
  hasUser,
  onGenerateAll,
  onConfirmGeneration,
  onCostConfirmChange,
}: AnimatorSettingsProps) {
  const currentModelConfig = ANIMATION_MODELS[selectedModel] || ANIMATION_MODELS['seedance-1.5-pro']

  return (
    <>
      {/* Bottom Generate Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 sm:p-4 safe-bottom z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <Button
              onClick={onGenerateAll}
              disabled={isGenerating || !hasUser}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 w-full sm:w-auto min-h-[48px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 mr-2" />
              <span className="text-sm sm:text-base">
                {isGenerating
                  ? generationPhase === 'uploading'
                    ? 'Uploading images...'
                    : generationPhase === 'submitting'
                      ? 'Starting generation...'
                      : 'Generating...'
                  : `Generate ${selectedCount} Video${selectedCount > 1 ? 's' : ''} - ${estimatedCost} pts`}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Batch Cost Confirmation Dialog */}
      <AlertDialog open={showCostConfirm} onOpenChange={onCostConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Batch Generation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to generate a large batch of videos:</p>
                <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium text-foreground">{currentModelConfig.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Videos</span>
                    <span className="font-medium text-foreground">{selectedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per video</span>
                    <span className="font-medium text-foreground">
                      ~{selectedCount > 0 ? Math.round(estimatedCost / selectedCount) : 0} pts
                    </span>
                  </div>
                  <div className="border-t border-border my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Total estimated cost</span>
                    <span className="font-bold text-foreground">{estimatedCost} pts</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  All {selectedCount} videos will begin generating immediately upon confirmation.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmGeneration}>
              Generate {selectedCount} Videos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
