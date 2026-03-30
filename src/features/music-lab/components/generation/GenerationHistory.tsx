'use client'

import { Clock, Music, Mic } from 'lucide-react'
import { useGenerationStore } from '../../store/generation.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'

export function GenerationHistory() {
  const allHistory = useGenerationStore((s) => s.history)
  const activeArtist = useArtistDnaStore((s) => s.activeArtistId)

  const history = activeArtist
    ? allHistory.filter((h) => h.artistId === activeArtist)
    : allHistory

  if (history.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Recent Generations
        </span>
      </div>
      <div className="space-y-1">
        {history.map((entry) => (
          <div
            key={entry.id + entry.createdAt}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-muted/20 transition-colors"
          >
            {entry.mode === 'instrumental' ? (
              <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Mic className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            )}
            <span className="flex-1 truncate text-foreground/80">{entry.title || 'Untitled'}</span>
            {entry.pickedIndex !== undefined && (
              <span className="text-[10px] text-emerald-400 font-mono">saved</span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
