'use client'

import { useCallback, useState } from 'react'
import { X, RefreshCw, Coins } from 'lucide-react'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { useGenerationStore } from '../../store/generation.store'
import { GenerationStatus } from './GenerationStatus'
import { VariationCard } from './VariationCard'
import { GenerationHistory } from './GenerationHistory'

interface GenerationDrawerProps {
  onRegenerate: () => void
}

export function GenerationDrawer({ onRegenerate }: GenerationDrawerProps) {
  const { currentJob, drawerOpen, isGenerating, saveTrack, closeDrawer, clearJob } = useGenerateMusic()
  const pollCount = useGenerationStore((s) => s.pollCount)

  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set())

  const handlePick = useCallback(async (index: number) => {
    setSavingIndex(index)
    const result = await saveTrack(index)
    setSavingIndex(null)
    if (!result.error) {
      setSavedIndices((prev) => new Set(prev).add(index))
    }
  }, [saveTrack])

  const handleClose = useCallback(() => {
    closeDrawer()
    if (currentJob?.status === 'completed' || currentJob?.status === 'failed') {
      clearJob()
      setSavedIndices(new Set())
      setPlayingIndex(null)
    }
  }, [closeDrawer, clearJob, currentJob])

  const handleRegenerate = useCallback(() => {
    clearJob()
    setSavedIndices(new Set())
    setPlayingIndex(null)
    onRegenerate()
  }, [clearJob, onRegenerate])

  if (!drawerOpen) return null

  const isCompleted = currentJob?.status === 'completed'
  const isFailed = currentJob?.status === 'failed'

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:bg-transparent"
        onClick={handleClose}
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
              {currentJob?.mode === 'instrumental' ? 'Generate Beat' : 'Generate Song'}
            </h2>
            <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              <Coins className="w-3 h-3" /> 12 pts
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(isGenerating || isFailed) && (
            <GenerationStatus
              status={currentJob!.status}
              pollCount={pollCount}
              error={currentJob?.error}
              onRetry={handleRegenerate}
            />
          )}

          {isCompleted && currentJob?.variations && currentJob.variations.length > 0 && (
            <div className="space-y-3">
              {currentJob.variations.map((v, i) => (
                <VariationCard
                  key={i}
                  label={`Variation ${String.fromCharCode(65 + i)}`}
                  variation={v}
                  onPick={() => handlePick(i)}
                  onPlay={() => setPlayingIndex(i)}
                  shouldPause={playingIndex !== null && playingIndex !== i}
                  isPicked={savedIndices.has(i)}
                  isSaving={savingIndex === i}
                />
              ))}
            </div>
          )}

          {(isCompleted || isFailed) && currentJob?.error !== 'insufficient_credits' && (
            <button
              onClick={handleRegenerate}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/20 hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate (12 pts)
            </button>
          )}

          <GenerationHistory />
        </div>
      </div>
    </>
  )
}
