'use client'

import { Loader2, Music } from 'lucide-react'
import type { GenerationJobStatus } from '../../types/generation.types'

interface GenerationStatusProps {
  status: GenerationJobStatus
  pollCount: number
  error?: string
  onRetry?: () => void
}

const MAX_POLLS = 40
const POLL_INTERVAL_S = 3

export function GenerationStatus({ status, pollCount, error, onRetry }: GenerationStatusProps) {
  const estimatedSeconds = Math.max(0, (MAX_POLLS - pollCount) * POLL_INTERVAL_S)
  const progress = Math.min(100, (pollCount / MAX_POLLS) * 100)

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <Music className="w-6 h-6 text-red-400" />
        </div>
        <p className="text-sm text-red-400">{error === 'insufficient_credits' ? 'Not enough pts' : error}</p>
        {onRetry && error !== 'insufficient_credits' && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const statusText =
    status === 'submitting' ? 'Submitting to Suno...' :
    status === 'pending' ? 'Queued — waiting for Suno...' :
    status === 'processing' ? 'Generating your music...' :
    'Preparing...'

  return (
    <div className="p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{statusText}</p>
        <p className="text-xs text-muted-foreground">~{estimatedSeconds}s remaining</p>
      </div>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
