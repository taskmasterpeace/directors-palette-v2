'use client'

import { useMemo } from 'react'
import { Music2 } from 'lucide-react'
import { GENRE_TAXONOMY, getSubgenres, getMicrogenres } from '@/features/music-lab/data/genre-taxonomy.data'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { MultiSelectPills } from './MultiSelectPills'

export function GenrePicker() {
  const { settings, updateSetting } = useSoundStudioStore()

  const genreItems = useMemo(
    () => GENRE_TAXONOMY.map((g) => ({ id: g.name.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: g.name })),
    [],
  )

  const subgenreItems = useMemo(() => {
    if (!settings.genres.length) return []
    return getSubgenres(settings.genres).map((s) => ({
      id: s.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      label: s,
    }))
  }, [settings.genres])

  const microgenreItems = useMemo(() => {
    if (!settings.subgenres.length) return []
    return getMicrogenres(settings.subgenres).map((m) => ({
      id: m.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      label: m,
    }))
  }, [settings.subgenres])

  const handleGenresChange = (genres: string[]) => {
    updateSetting('genres', genres)
    // Prune subgenres that no longer belong to selected genres
    const validSubs = getSubgenres(genres)
    const pruned = settings.subgenres.filter((s) => validSubs.includes(s))
    if (pruned.length !== settings.subgenres.length) {
      updateSetting('subgenres', pruned)
      // Also prune microgenres
      const validMicros = getMicrogenres(pruned)
      updateSetting('microgenres', settings.microgenres.filter((m) => validMicros.includes(m)))
    }
  }

  const handleSubgenresChange = (subgenres: string[]) => {
    updateSetting('subgenres', subgenres)
    // Prune microgenres
    const validMicros = getMicrogenres(subgenres)
    const pruned = settings.microgenres.filter((m) => validMicros.includes(m))
    if (pruned.length !== settings.microgenres.length) {
      updateSetting('microgenres', pruned)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Music2 className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Genre
        </h3>
        {settings.genres.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {settings.genres.length + settings.subgenres.length + settings.microgenres.length} selected
          </span>
        )}
      </div>

      {/* Genres */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/70">Genre</p>
        <MultiSelectPills
          items={genreItems}
          selected={settings.genres}
          onChange={handleGenresChange}
          color="amber"
          showSearch
          searchPlaceholder="Search genres..."
        />
      </div>

      {/* Subgenres */}
      {subgenreItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/70">Subgenre</p>
          <MultiSelectPills
            items={subgenreItems}
            selected={settings.subgenres}
            onChange={handleSubgenresChange}
            color="amber"
            showSearch
            searchPlaceholder="Search subgenres..."
          />
        </div>
      )}

      {/* Microgenres */}
      {microgenreItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/70">Microgenre</p>
          <MultiSelectPills
            items={microgenreItems}
            selected={settings.microgenres}
            onChange={(v) => updateSetting('microgenres', v)}
            color="amber"
            showSearch
            searchPlaceholder="Search microgenres..."
          />
        </div>
      )}
    </div>
  )
}
