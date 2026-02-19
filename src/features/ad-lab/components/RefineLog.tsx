'use client'

import React, { useState } from 'react'
import { cn } from '@/utils/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { TotalScoreBadge } from './ScoreBar'
import type { RefinementAttempt } from '../types/ad-lab.types'

interface RefineLogProps {
  attempts: RefinementAttempt[]
}

export function RefineLog({ attempts }: RefineLogProps) {
  const [expanded, setExpanded] = useState(false)

  if (attempts.length === 0) return null

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        <span className="text-xs font-medium text-muted-foreground">
          Refinement Log ({attempts.length} attempt{attempts.length > 1 ? 's' : ''})
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="divide-y divide-border/30">
          {attempts.map((attempt, i) => {
            const scoreDiff = attempt.newScore - attempt.previousScore
            return (
              <div key={i} className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-muted-foreground">Attempt {attempt.attemptNumber}</span>
                  <span className="text-muted-foreground">Target: <span className="text-foreground">{attempt.targetDimension}</span></span>
                  <div className="flex items-center gap-1">
                    <TotalScoreBadge score={attempt.previousScore} />
                    <span className="text-muted-foreground">&rarr;</span>
                    <TotalScoreBadge score={attempt.newScore} />
                    <span className={cn(
                      'text-[10px] font-bold',
                      scoreDiff > 0 ? 'text-green-400' : scoreDiff < 0 ? 'text-red-400' : 'text-muted-foreground'
                    )}>
                      {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{attempt.changes}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
