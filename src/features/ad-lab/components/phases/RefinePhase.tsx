'use client'

import React, { useMemo } from 'react'
import { Loader2, RefreshCw, AlertTriangle, Eye } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { useAdLabStore } from '../../store/ad-lab.store'
import { TotalScoreBadge, StatusBadge } from '../ScoreBar'
import { RefineLog } from '../RefineLog'
import type { AdPrompt, GradeScore, RefinementAttempt } from '../../types/ad-lab.types'

const MAX_ATTEMPTS = 3

export function RefinePhase() {
  const {
    prompts,
    grades,
    mandate,
    selectedModel,
    refinementHistory,
    addRefinementAttempt,
    updatePromptAfterRefine,
    isRefining,
    setIsRefining,
    setError,
    completePhase,
    setPhase,
  } = useAdLabStore()

  const failingPrompts = useMemo(() => {
    return grades
      .filter(g => g.status === 'refine')
      .map(g => ({
        prompt: prompts.find(p => p.id === g.promptId)!,
        grade: g,
      }))
      .filter(item => item.prompt)
  }, [grades, prompts])

  const getAttemptsForPrompt = (promptId: string): RefinementAttempt[] =>
    refinementHistory.filter(a => a.promptId === promptId)

  const isManualReview = (promptId: string): boolean =>
    getAttemptsForPrompt(promptId).length >= MAX_ATTEMPTS &&
    grades.find(g => g.promptId === promptId)?.status === 'refine'

  const handleRefineAll = async () => {
    if (!mandate) return

    setIsRefining(true)
    setError(null)

    try {
      for (const { prompt, grade } of failingPrompts) {
        const existingAttempts = getAttemptsForPrompt(prompt.id).length
        if (existingAttempts >= MAX_ATTEMPTS) continue

        let currentPrompt: AdPrompt = prompt
        let currentGrade: GradeScore = grade

        for (let attempt = existingAttempts + 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (currentGrade.status === 'pass') break

          const response = await fetch('/api/ad-lab/refine-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: currentPrompt,
              grade: currentGrade,
              mandate,
              attemptNumber: attempt,
              model: selectedModel,
            }),
          })

          if (!response.ok) {
            const err = await response.json()
            throw new Error(err.error || `Refinement failed for ${prompt.id}`)
          }

          const result = await response.json() as {
            revisedPrompt: AdPrompt
            revisedGrade: GradeScore
            changes: string
            targetDimension: string
          }

          addRefinementAttempt({
            promptId: prompt.id,
            attemptNumber: attempt,
            previousScore: currentGrade.total,
            newScore: result.revisedGrade.total,
            targetDimension: result.targetDimension,
            changes: result.changes,
            revisedPrompt: result.revisedPrompt,
            revisedGrade: result.revisedGrade,
          })

          updatePromptAfterRefine(prompt.id, result.revisedPrompt, result.revisedGrade)
          currentPrompt = result.revisedPrompt
          currentGrade = result.revisedGrade
        }
      }

      completePhase('refine')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIsRefining(false)
    }
  }

  const handleNext = () => {
    setPhase('generate')
  }

  const handleViewScorecard = () => {
    setPhase('quality')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Refine Failing Prompts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {failingPrompts.length} prompt{failingPrompts.length !== 1 ? 's' : ''} scored below 70.
          Each will be refined up to {MAX_ATTEMPTS} times.
        </p>
      </div>

      <Button
        onClick={handleRefineAll}
        disabled={isRefining || failingPrompts.length === 0}
        className="w-full"
        size="lg"
      >
        {isRefining ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Refining...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refine All Failing
          </>
        )}
      </Button>

      {/* Failing Prompt Cards */}
      <div className="space-y-4">
        {failingPrompts.map(({ prompt, grade }) => {
          const attempts = getAttemptsForPrompt(prompt.id)
          const isManual = isManualReview(prompt.id)

          return (
            <div
              key={prompt.id}
              className={cn(
                'border rounded-lg p-4 space-y-3',
                isManual
                  ? 'border-orange-500/30 bg-orange-500/5'
                  : grade.status === 'pass'
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'border-border/50 bg-card/30'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-medium">{prompt.id}</span>
                  <TotalScoreBadge score={grade.total} />
                  <StatusBadge status={grade.status} />
                  {isManual && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-bold uppercase">
                      Manual Review
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{prompt.openingFrame}</p>

              {/* Feedback */}
              <div className="text-xs space-y-1">
                {Object.entries(grade.feedback).map(([dim, text]) => (
                  <div key={dim} className="flex gap-2">
                    <span className="text-muted-foreground uppercase w-12 flex-shrink-0">{dim}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              {/* Refinement Log */}
              {attempts.length > 0 && <RefineLog attempts={attempts} />}
            </div>
          )
        })}
      </div>

      {/* Navigation */}
      {(refinementHistory.length > 0 || failingPrompts.length === 0) && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleViewScorecard}>
            <Eye className="w-4 h-4 mr-2" />
            View Updated Scorecard
          </Button>
          <Button onClick={handleNext} size="lg">
            Next: Generate Videos
          </Button>
        </div>
      )}

      {/* Manual Review Warning */}
      {failingPrompts.some(f => isManualReview(f.prompt.id)) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm text-orange-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Some prompts still fail after {MAX_ATTEMPTS} attempts. They will be dimmed in the Generate phase.</span>
        </div>
      )}
    </div>
  )
}
