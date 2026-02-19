'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/utils/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ScoreBar, TotalScoreBadge, StatusBadge } from './ScoreBar'
import type { GradeScore, AdPrompt, FormatInsights, RatioFilter, DurationFilter, StatusFilter } from '../types/ad-lab.types'

interface ScorecardDashboardProps {
  grades: GradeScore[]
  prompts: AdPrompt[]
  formatInsights: FormatInsights | null
}

const DIMENSIONS = ['hook', 'voice', 'native', 'cta', 'abDiff'] as const
const DIMENSION_LABELS: Record<typeof DIMENSIONS[number], string> = {
  hook: 'Hook',
  voice: 'Voice',
  native: 'Native',
  cta: 'CTA',
  abDiff: 'A/B',
}

export function ScorecardDashboard({ grades, prompts, formatInsights }: ScorecardDashboardProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [ratioFilter, setRatioFilter] = useState<RatioFilter>('all')
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredGrades = useMemo(() => {
    return grades.filter((g) => {
      const prompt = prompts.find(p => p.id === g.promptId)
      if (!prompt) return false
      if (ratioFilter !== 'all' && prompt.aspectRatio !== ratioFilter) return false
      if (durationFilter !== 'all' && prompt.duration !== durationFilter) return false
      if (statusFilter !== 'all' && g.status !== statusFilter) return false
      return true
    })
  }, [grades, prompts, ratioFilter, durationFilter, statusFilter])

  const avgScore = useMemo(() => {
    if (grades.length === 0) return 0
    return Math.round(grades.reduce((sum, g) => sum + g.total, 0) / grades.length)
  }, [grades])

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    grades.forEach(g => {
      if (g.total >= 85) dist.A++
      else if (g.total >= 70) dist.B++
      else if (g.total >= 60) dist.C++
      else if (g.total >= 40) dist.D++
      else dist.F++
    })
    return dist
  }, [grades])

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/30 flex-wrap">
        <div className="text-sm">
          <span className="text-muted-foreground">Prompts:</span>{' '}
          <span className="font-semibold">{grades.length}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Average:</span>{' '}
          <TotalScoreBadge score={avgScore} />
        </div>
        <div className="flex gap-1.5">
          {Object.entries(gradeDistribution).map(([grade, count]) => count > 0 && (
            <span key={grade} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {grade}:{count}
            </span>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 flex-wrap">
        <FilterGroup label="Ratio" value={ratioFilter} onChange={(v) => setRatioFilter(v as RatioFilter)} options={['all', '16:9', '9:16']} />
        <FilterGroup label="Duration" value={durationFilter} onChange={(v) => setDurationFilter(v as DurationFilter)} options={['all', '5s', '15s', '30s']} />
        <FilterGroup label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={['all', 'pass', 'refine']} />
      </div>

      {/* Grading Table */}
      <div className="border border-border/50 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[120px_repeat(5,1fr)_80px_80px] gap-2 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>ID</div>
          {DIMENSIONS.map(d => <div key={d}>{DIMENSION_LABELS[d]}</div>)}
          <div className="text-center">Total</div>
          <div className="text-center">Status</div>
        </div>

        {/* Rows */}
        {filteredGrades.map((grade) => {
          const isExpanded = expandedRow === grade.promptId
          return (
            <div key={grade.promptId}>
              <button
                onClick={() => setExpandedRow(isExpanded ? null : grade.promptId)}
                className="w-full grid grid-cols-[120px_repeat(5,1fr)_80px_80px] gap-2 px-4 py-3 items-center hover:bg-muted/10 transition-colors border-t border-border/30"
              >
                <div className="text-xs font-mono text-foreground truncate">{grade.promptId}</div>
                {DIMENSIONS.map(d => (
                  <div key={d}><ScoreBar score={grade[d]} max={20} /></div>
                ))}
                <div className="text-center"><TotalScoreBadge score={grade.total} /></div>
                <div className="text-center flex items-center justify-center gap-1">
                  <StatusBadge status={grade.status} />
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded Feedback */}
              {isExpanded && (
                <div className="px-4 py-3 bg-muted/5 border-t border-border/20 grid grid-cols-1 md:grid-cols-5 gap-3">
                  {DIMENSIONS.map(d => (
                    <div key={d}>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{DIMENSION_LABELS[d]}</span>
                      <p className="text-xs mt-0.5">{grade.feedback[d]}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Format Insights */}
      {formatInsights && (
        <div className="p-4 rounded-lg border border-border/50 bg-card/30 space-y-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Format Insights</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Best:</span>{' '}
              <span className="text-green-400 font-medium">{formatInsights.bestFormat}</span>{' '}
              <TotalScoreBadge score={formatInsights.bestScore} />
            </div>
            <div>
              <span className="text-muted-foreground">Worst:</span>{' '}
              <span className="text-red-400 font-medium">{formatInsights.worstFormat}</span>{' '}
              <TotalScoreBadge score={formatInsights.worstScore} />
            </div>
            <div>
              <span className="text-muted-foreground">Recommendation:</span>{' '}
              <span>{formatInsights.recommendation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <div className="flex gap-0.5 bg-muted/30 rounded-md p-0.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(
              'px-2 py-1 rounded text-xs transition-all',
              value === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt === 'all' ? 'All' : opt}
          </button>
        ))}
      </div>
    </div>
  )
}
