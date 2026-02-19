'use client'

import React from 'react'
import { cn } from '@/utils/utils'

interface ScoreBarProps {
  score: number
  max?: number
  showLabel?: boolean
}

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 85) return 'bg-green-500 text-green-500'
  if (pct >= 70) return 'bg-emerald-500 text-emerald-500'
  if (pct >= 60) return 'bg-yellow-500 text-yellow-500'
  if (pct >= 40) return 'bg-orange-500 text-orange-500'
  return 'bg-red-500 text-red-500'
}

function getScoreBgColor(score: number, max: number): string {
  const pct = (score / max) * 100
  if (pct >= 85) return 'bg-green-500/10'
  if (pct >= 70) return 'bg-emerald-500/10'
  if (pct >= 60) return 'bg-yellow-500/10'
  if (pct >= 40) return 'bg-orange-500/10'
  return 'bg-red-500/10'
}

export function ScoreBar({ score, max = 20, showLabel = true }: ScoreBarProps) {
  const colorClass = getScoreColor(score, max)
  const bgClass = getScoreBgColor(score, max)
  const widthPct = Math.min((score / max) * 100, 100)

  return (
    <div className="flex items-center gap-2">
      <div className={cn('relative h-2 flex-1 rounded-full overflow-hidden', bgClass)}>
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-all', colorClass.split(' ')[0])}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-mono font-medium tabular-nums w-6 text-right', colorClass.split(' ')[1])}>
          {score}
        </span>
      )}
    </div>
  )
}

export function TotalScoreBadge({ score }: { score: number }) {
  const colorClass = getScoreColor(score, 100)
  const bgClass = getScoreBgColor(score, 100)

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold tabular-nums',
      bgClass, colorClass.split(' ')[1]
    )}>
      {score}
    </span>
  )
}

export function StatusBadge({ status }: { status: 'pass' | 'refine' }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
      status === 'pass'
        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    )}>
      {status === 'pass' ? 'PASS' : 'REFINE'}
    </span>
  )
}
