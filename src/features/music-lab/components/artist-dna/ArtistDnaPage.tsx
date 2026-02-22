'use client'

import { useEffect } from 'react'
import { Dna } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { ArtistList } from './ArtistList'
import { ArtistEditor } from './ArtistEditor'

interface ArtistDnaPageProps {
  userId: string
}

export function ArtistDnaPage({ userId }: ArtistDnaPageProps) {
  const { initialize, editorOpen } = useArtistDnaStore()

  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  return (
    <div className="w-full py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Dna className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Artist DNA</h1>
      </div>

      {editorOpen ? <ArtistEditor /> : <ArtistList />}
    </div>
  )
}
