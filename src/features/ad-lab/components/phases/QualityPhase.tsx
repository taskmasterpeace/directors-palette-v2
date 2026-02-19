'use client'

import React, { useMemo } from 'react'
import { Loader2, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdLabStore } from '../../store/ad-lab.store'
import { ScorecardDashboard } from '../ScorecardDashboard'
import type { GradeScore, FormatInsights } from '../../types/ad-lab.types'

export function QualityPhase() {
  const {
    prompts,
    mandate,
    grades,
    setGrades,
    formatInsights,
    setFormatInsights,
    selectedModel,
    isGrading,
    setIsGrading,
    setError,
    completePhase,
    setPhase,
  } = useAdLabStore()

  const hasFailingPrompts = useMemo(() => grades.some(g => g.status === 'refine'), [grades])

  const handleGrade = async () => {
    if (prompts.length === 0 || !mandate) return

    setIsGrading(true)
    setError(null)

    try {
      const response = await fetch('/api/ad-lab/grade-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts, mandate, model: selectedModel }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to grade prompts')
      }

      const result = await response.json() as { grades: GradeScore[] }
      setGrades(result.grades)

      // Compute format insights
      const insights = computeFormatInsights(result.grades)
      setFormatInsights(insights)

      completePhase('quality')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grading failed')
    } finally {
      setIsGrading(false)
    }
  }

  const handleNext = () => {
    if (hasFailingPrompts) {
      setPhase('refine')
    } else {
      // Skip refine phase if all passing
      completePhase('refine')
      setPhase('generate')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Scorecard Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Grade all {prompts.length} prompts across 5 dimensions. Prompts scoring below 70 will need refinement.
        </p>
      </div>

      <Button
        onClick={handleGrade}
        disabled={isGrading || prompts.length === 0}
        className="w-full"
        size="lg"
      >
        {isGrading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Grading All Prompts...
          </>
        ) : (
          <>
            <BarChart3 className="w-4 h-4 mr-2" />
            Grade All Prompts
          </>
        )}
      </Button>

      {grades.length > 0 && (
        <>
          <ScorecardDashboard grades={grades} prompts={prompts} formatInsights={formatInsights} />
          <div className="flex justify-end">
            <Button onClick={handleNext} size="lg">
              {hasFailingPrompts ? 'Next: Refine Failing Prompts' : 'Next: Generate Videos'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function computeFormatInsights(grades: GradeScore[]): FormatInsights {
  const formatScores: Record<string, number[]> = {}

  for (const g of grades) {
    // Extract format from promptId: "16:9-5s-A" -> "16:9-5s"
    const parts = g.promptId.split('-')
    const format = parts.slice(0, -1).join('-')
    if (!formatScores[format]) formatScores[format] = []
    formatScores[format].push(g.total)
  }

  let bestFormat = ''
  let bestScore = 0
  let worstFormat = ''
  let worstScore = 100

  for (const [format, scores] of Object.entries(formatScores)) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    if (avg > bestScore) { bestScore = avg; bestFormat = format }
    if (avg < worstScore) { worstScore = avg; worstFormat = format }
  }

  const recommendation = bestScore - worstScore > 15
    ? `Strong disparity between formats. Consider allocating more budget to ${bestFormat} and reworking ${worstFormat}.`
    : 'Scores are relatively consistent across formats. Good balance in creative execution.'

  return { bestFormat, bestScore, worstFormat, worstScore, recommendation }
}
