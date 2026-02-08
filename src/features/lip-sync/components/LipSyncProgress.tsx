'use client'

import React from 'react'
import { Loader2, Check, AlertCircle, Video, AudioLines } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Progress } from '@/components/ui/progress'
import type { LipSyncGenerationStatus } from '../types/lip-sync.types'
import { formatDuration } from '../services/lip-sync-generation.service'

interface LipSyncProgressProps {
  status: LipSyncGenerationStatus
  progress?: number
  estimatedDuration?: number
  videoUrl?: string | null
  error?: string | null
  className?: string
}

const STATUS_CONFIG: Record<LipSyncGenerationStatus, {
  label: string
  icon: typeof Loader2
  color: string
  showProgress: boolean
}> = {
  idle: {
    label: 'Ready',
    icon: Video,
    color: 'text-muted-foreground',
    showProgress: false,
  },
  validating: {
    label: 'Validating inputs...',
    icon: Loader2,
    color: 'text-amber-400',
    showProgress: false,
  },
  'generating-audio': {
    label: 'Generating audio...',
    icon: AudioLines,
    color: 'text-amber-400',
    showProgress: true,
  },
  'generating-video': {
    label: 'Generating lip-sync video...',
    icon: Video,
    color: 'text-amber-400',
    showProgress: true,
  },
  completed: {
    label: 'Complete!',
    icon: Check,
    color: 'text-green-400',
    showProgress: false,
  },
  failed: {
    label: 'Generation failed',
    icon: AlertCircle,
    color: 'text-red-400',
    showProgress: false,
  },
}

export function LipSyncProgress({
  status,
  progress = 0,
  estimatedDuration,
  videoUrl,
  error,
  className,
}: LipSyncProgressProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const isAnimated = status === 'validating' || status === 'generating-audio' || status === 'generating-video'

  return (
    <div className={cn(
      'p-4 rounded-lg border bg-slate-800/50 backdrop-blur-sm',
      status === 'completed' && 'border-green-500/30 bg-green-500/10',
      status === 'failed' && 'border-red-500/30 bg-red-500/10',
      status !== 'completed' && status !== 'failed' && 'border-slate-700/50',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          status === 'completed' && 'bg-green-500/20',
          status === 'failed' && 'bg-red-500/20',
          status !== 'completed' && status !== 'failed' && 'bg-amber-500/20',
        )}>
          <Icon className={cn(
            'w-5 h-5',
            config.color,
            isAnimated && 'animate-spin'
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', config.color)}>
            {config.label}
          </p>

          {estimatedDuration && status === 'generating-video' && (
            <p className="text-xs text-muted-foreground">
              Generating {formatDuration(estimatedDuration)} video
            </p>
          )}

          {error && status === 'failed' && (
            <p className="text-xs text-red-400 mt-1 truncate">
              {error}
            </p>
          )}
        </div>

        {status === 'completed' && videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-400 hover:text-amber-300 font-medium"
          >
            View Video
          </a>
        )}
      </div>

      {config.showProgress && (
        <div className="mt-3">
          <Progress
            value={progress}
            className="h-2 bg-slate-700"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {progress}%
          </p>
        </div>
      )}
    </div>
  )
}

interface LipSyncBatchProgressProps {
  items: Array<{
    id: string
    name: string
    status: LipSyncGenerationStatus
    progress: number
    error?: string | null
  }>
  className?: string
}

export function LipSyncBatchProgress({ items, className }: LipSyncBatchProgressProps) {
  const completedCount = items.filter(i => i.status === 'completed').length
  const failedCount = items.filter(i => i.status === 'failed').length
  const processingCount = items.filter(i =>
    i.status === 'validating' ||
    i.status === 'generating-audio' ||
    i.status === 'generating-video'
  ).length

  const overallProgress = items.length > 0
    ? Math.round((completedCount / items.length) * 100)
    : 0

  return (
    <div className={cn('space-y-3', className)}>
      {/* Overall progress */}
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Batch Progress
          </span>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {items.length}
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
        {failedCount > 0 && (
          <p className="text-xs text-red-400 mt-1">
            {failedCount} failed
          </p>
        )}
        {processingCount > 0 && (
          <p className="text-xs text-amber-400 mt-1">
            {processingCount} processing
          </p>
        )}
      </div>

      {/* Individual items */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.map(item => {
          const config = STATUS_CONFIG[item.status]
          const Icon = config.icon
          const isAnimated = item.status === 'validating' ||
            item.status === 'generating-audio' ||
            item.status === 'generating-video'

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-md text-sm',
                item.status === 'completed' && 'bg-green-500/10',
                item.status === 'failed' && 'bg-red-500/10',
                item.status !== 'completed' && item.status !== 'failed' && 'bg-slate-700/30'
              )}
            >
              <Icon className={cn(
                'w-4 h-4 flex-shrink-0',
                config.color,
                isAnimated && 'animate-spin'
              )} />
              <span className="flex-1 truncate">{item.name}</span>
              {item.status === 'generating-video' && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.progress}%
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
