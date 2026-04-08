'use client'

import { ArtistEditor } from '../ArtistEditor'
import { RenameSuggestionPill } from './RenameSuggestionPill'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function ReviewAndRemixScreen() {
  const { activeArtistId } = useArtistDnaStore()
  const isNew = !activeArtistId

  return (
    <div className="space-y-3">
      {isNew && (
        <div className="px-1">
          <RenameSuggestionPill />
        </div>
      )}
      <ArtistEditor />
    </div>
  )
}
