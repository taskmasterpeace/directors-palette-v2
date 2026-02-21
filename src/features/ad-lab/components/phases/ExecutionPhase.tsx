'use client'

import React, { useMemo } from 'react'
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdLabStore } from '../../store/ad-lab.store'
import { PromptMatrixGrid } from '../PromptMatrixGrid'
import type { AdPrompt } from '../../types/ad-lab.types'

export function ExecutionPhase() {
  const {
    mandate,
    prompts,
    setPrompts,
    selectedModel,
    isGeneratingMatrix,
    setIsGeneratingMatrix,
    setError,
    completePhase,
    setPhase,
  } = useAdLabStore()

  const uniquenessInfo = useMemo(() => {
    if (prompts.length === 0) return null
    const openingFrames = prompts.map(p => p.openingFrame.toLowerCase().trim())
    const uniqueCount = new Set(openingFrames).size
    const duplicateCount = openingFrames.length - uniqueCount
    return { total: openingFrames.length, unique: uniqueCount, duplicates: duplicateCount }
  }, [prompts])

  const handleGenerate = async () => {
    if (!mandate) return

    setIsGeneratingMatrix(true)
    setError(null)

    try {
      const response = await fetch('/api/ad-lab/generate-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandate, model: selectedModel }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate matrix')
      }

      const result = await response.json() as { prompts: AdPrompt[] }
      setPrompts(result.prompts)
      completePhase('execution')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matrix')
    } finally {
      setIsGeneratingMatrix(false)
    }
  }

  const handleNext = () => {
    setPhase('generate')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Mandate Summary */}
      {mandate && (
        <div className="p-4 rounded-lg border border-border/50 bg-card/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
            <span className="text-sm font-semibold">Mandate Reference</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div><span className="font-medium text-foreground">Audience:</span> {mandate.audienceDemographics.slice(0, 80)}...</div>
            <div><span className="font-medium text-foreground">Pain Point:</span> {mandate.primaryPainPoint.slice(0, 80)}...</div>
            <div><span className="font-medium text-foreground">Voice:</span> {mandate.brandVoice}</div>
            <div><span className="font-medium text-foreground">Forbidden:</span> {mandate.forbiddenWords.join(', ') || 'None'}</div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGeneratingMatrix || !mandate}
        className="w-full"
        size="lg"
      >
        {isGeneratingMatrix ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating 12 Ad Prompts...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate 12 Ad Prompts
          </>
        )}
      </Button>

      {/* Uniqueness Banner */}
      {uniquenessInfo && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          uniquenessInfo.duplicates === 0
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {uniquenessInfo.duplicates === 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>{uniquenessInfo.unique}/{uniquenessInfo.total} unique opening frames</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>{uniquenessInfo.duplicates} duplicate(s) detected — consider regenerating</span>
            </>
          )}
        </div>
      )}

      {/* Prompt Matrix Grid */}
      {prompts.length > 0 && (
        <>
          <PromptMatrixGrid prompts={prompts} />
          <div className="flex justify-end">
            <Button onClick={handleNext} size="lg">
              Next: Generate
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
