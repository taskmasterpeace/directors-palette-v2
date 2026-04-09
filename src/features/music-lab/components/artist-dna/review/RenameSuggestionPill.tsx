'use client'

import { Sparkles } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

/**
 * Info chip shown on the review screen when the user seeded from a real artist.
 *
 * Door 1 now FORCES fictionalization server-side (Pass 3 in seed-from-artist),
 * so this is purely informational — it tells the user the persona is inspired
 * by the source and reminds them they can edit anything.
 */
export function RenameSuggestionPill() {
  const { draft, seededFrom } = useArtistDnaStore()
  if (!seededFrom) return null

  const newStageName = draft?.identity?.stageName

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 flex items-center gap-2 text-xs">
      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
      <span className="text-amber-100/90">
        Inspired by <span className="font-semibold text-amber-200">{seededFrom}</span>
        {newStageName && newStageName !== seededFrom && (
          <>
            {' '}— auto-renamed to{' '}
            <span className="font-semibold text-amber-200">{newStageName}</span>
          </>
        )}
        . Edit anything below to make it yours.
      </span>
    </div>
  )
}
