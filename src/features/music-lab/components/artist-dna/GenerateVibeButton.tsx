'use client'

import { useCallback } from 'react'
import { Music, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { buildVibePrompt } from '../../utils/vibe-prompt-builder'
import { GenerationDrawer } from '../generation/GenerationDrawer'

export function GenerateVibeButton() {
  const { draft, activeArtistId, saveVibeBeat, isSavingVibeBeat } = useArtistDnaStore()
  const { generate, isGenerating, drawerOpen } = useGenerateMusic()

  const hasGenres = draft.sound.genres.length > 0

  const handleGenerate = useCallback(async () => {
    if (!activeArtistId || !hasGenres) return

    const { style, negativeTags } = buildVibePrompt(draft)

    await generate({
      mode: 'instrumental',
      artistId: activeArtistId,
      title: 'Vibe Beat',
      stylePrompt: style,
      lyricsPrompt: '',
      excludePrompt: negativeTags,
    })
  }, [activeArtistId, hasGenres, draft, generate])

  const handlePickOverride = useCallback(async (variationUrl: string, duration: number) => {
    await saveVibeBeat(variationUrl, duration)
  }, [saveVibeBeat])

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={!hasGenres || isGenerating || isSavingVibeBeat}
        title={!hasGenres ? 'Add genres to your artist profile first' : 'Generate Vibe Beat'}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white/90 hover:bg-black/70 transition-colors text-xs disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isGenerating || isSavingVibeBeat ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Music className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">Vibe Beat</span>
        <span className="text-amber-400 text-[10px] font-mono">12 pts</span>
      </button>

      {drawerOpen && (
        <GenerationDrawer
          onRegenerate={handleGenerate}
          onPickOverride={handlePickOverride}
        />
      )}
    </>
  )
}
