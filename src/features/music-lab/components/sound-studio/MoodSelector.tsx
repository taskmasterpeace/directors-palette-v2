'use client'

import { Heart, ThumbsUp } from 'lucide-react'
import { MOOD_TAGS } from '@/features/music-lab/data/mood-tags.data'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { useArtistFit } from '../../hooks/useArtistFit'

const VALENCE_CONFIG = {
  positive: {
    label: 'Warm / Upbeat',
    tagColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    tagActiveColor: 'bg-amber-500/30 text-amber-200 border-amber-500/50 shadow-[0_0_10px_oklch(0.6_0.2_55/0.2)]',
    headerColor: 'text-amber-400',
  },
  neutral: {
    label: 'Reflective / Dreamy',
    tagColor: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    tagActiveColor: 'bg-blue-500/25 text-blue-200 border-blue-500/50 shadow-[0_0_10px_oklch(0.55_0.15_260/0.2)]',
    headerColor: 'text-blue-400',
  },
  dark: {
    label: 'Dark / Intense',
    tagColor: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    tagActiveColor: 'bg-rose-500/25 text-rose-200 border-rose-500/50 shadow-[0_0_10px_oklch(0.55_0.15_15/0.2)]',
    headerColor: 'text-rose-400',
  },
} as const

export function MoodSelector() {
  const { settings, updateSetting } = useSoundStudioStore()
  const { moods: artistMoods } = useArtistFit()

  const handleToggle = (moodLabel: string) => {
    if (settings.moods.includes(moodLabel)) {
      updateSetting('moods', settings.moods.filter((m) => m !== moodLabel))
    } else {
      updateSetting('moods', [...settings.moods, moodLabel])
    }
  }

  const valenceGroups: Array<'positive' | 'neutral' | 'dark'> = ['positive', 'neutral', 'dark']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-center gap-2">
        <Heart className="w-4 h-4 text-rose-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Mood
        </h3>
        {settings.moods.length > 0 && (
          <span className="text-xs text-rose-400 ml-auto">{settings.moods.length} selected</span>
        )}
      </div>

      {/* Grouped by valence */}
      <div className="space-y-3">
        {valenceGroups.map((valence) => {
          const config = VALENCE_CONFIG[valence]
          const tags = MOOD_TAGS.filter((m) => m.valence === valence)

          return (
            <div key={valence} className="space-y-1.5">
              <p className={`text-[11px] font-medium uppercase tracking-wider ${config.headerColor}`}>
                {config.label}
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {tags.map((tag) => {
                  const isActive = settings.moods.includes(tag.label)
                  const isArtistPick = artistMoods.includes(tag.label)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggle(tag.label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all inline-flex items-center gap-1 ${
                        isActive ? config.tagActiveColor : config.tagColor
                      } hover:scale-[1.03]`}
                    >
                      {isArtistPick && <ThumbsUp className="w-2.5 h-2.5 text-emerald-400" />}
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
