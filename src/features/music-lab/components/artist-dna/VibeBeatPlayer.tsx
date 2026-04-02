'use client'

import { useState, useCallback } from 'react'
import { Volume2, VolumeX, RefreshCw } from 'lucide-react'
import type { VibeBeat } from '../../types/artist-dna.types'
import { useArtistDnaStore } from '../../store/artist-dna.store'

interface VibeBeatPlayerProps {
  vibeBeat: VibeBeat
  audioRef: React.RefObject<HTMLAudioElement | null>
  onRegenerate: () => void
}

export function VibeBeatPlayer({ vibeBeat, audioRef, onRegenerate }: VibeBeatPlayerProps) {
  const [showSlider, setShowSlider] = useState(false)
  const updateVibeBeatVolume = useArtistDnaStore((s) => s.updateVibeBeatVolume)

  const volume = vibeBeat.volume ?? 0.2
  const isMuted = volume === 0

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    updateVibeBeatVolume(newVolume)
  }, [audioRef, updateVibeBeatVolume])

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute to 20%
      if (audioRef.current) {
        audioRef.current.volume = 0.2
        audioRef.current.play().catch(() => {})
      }
      updateVibeBeatVolume(0.2)
    } else {
      // Mute
      if (audioRef.current) {
        audioRef.current.volume = 0
      }
      updateVibeBeatVolume(0)
    }
  }, [isMuted, audioRef, updateVibeBeatVolume])

  const handleSpeakerClick = useCallback(() => {
    // If audio is paused (auto-play was blocked), try to play
    if (audioRef.current?.paused && !isMuted) {
      audioRef.current.play().catch(() => {})
    }
    setShowSlider((prev) => !prev)
  }, [audioRef, isMuted])

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleSpeakerClick}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        title={isMuted ? 'Unmute vibe beat' : 'Adjust volume'}
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-white/60" />
        ) : (
          <Volume2 className="w-4 h-4 text-amber-400" />
        )}
      </button>

      {showSlider && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
          <button
            onClick={handleToggleMute}
            className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
          >
            {isMuted ? 'unmute' : 'mute'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 accent-amber-400 cursor-pointer"
          />
          <span className="text-[10px] text-white/50 tabular-nums w-7 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      <button
        onClick={onRegenerate}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        title="Regenerate vibe beat (12 pts)"
      >
        <RefreshCw className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
      </button>
    </div>
  )
}
