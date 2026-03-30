'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, Download, Check, Disc3 } from 'lucide-react'
import type { GenerationVariation } from '../../types/generation.types'

interface VariationCardProps {
  label: string
  variation: GenerationVariation
  onPick: () => void
  onPlay: () => void
  shouldPause: boolean
  isPicked: boolean
  isSaving: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VariationCard({
  label,
  variation,
  onPick,
  onPlay,
  shouldPause,
  isPicked,
  isSaving,
}: VariationCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(variation.duration || 0)

  useEffect(() => {
    if (shouldPause && playing) {
      audioRef.current?.pause()
      setPlaying(false)
    }
  }, [shouldPause, playing])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      onPlay()
      audioRef.current.play()
      setPlaying(true)
    }
  }, [playing, onPlay])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleDownload = useCallback(() => {
    const a = document.createElement('a')
    a.href = variation.url
    a.download = `${label}.mp3`
    a.click()
  }, [variation.url, label])

  return (
    <div className="p-3 rounded-[0.625rem] border border-border bg-card space-y-3">
      <audio
        ref={audioRef}
        src={variation.url}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || variation.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc3 className={`w-4 h-4 text-cyan-400 ${playing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-semibold text-foreground tracking-[-0.025em]">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-colors"
        >
          {playing ? (
            <Pause className="w-4 h-4 text-cyan-400" />
          ) : (
            <Play className="w-4 h-4 text-cyan-400 ml-0.5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPick}
          disabled={isPicked || isSaving}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
            isPicked
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
          } disabled:opacity-50`}
        >
          <Check className="w-3.5 h-3.5" />
          {isPicked ? 'Saved' : isSaving ? 'Saving...' : 'Pick & Save'}
        </button>
        <button
          onClick={handleDownload}
          className="p-2 rounded-lg border border-border hover:bg-muted/40 transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
