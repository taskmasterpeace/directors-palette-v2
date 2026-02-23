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
    <div className="w-full space-y-2">
      {editorOpen ? <ArtistEditor /> : (
        <>
          <div className="flex items-center gap-2 pt-6">
            <Dna className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Artist Lab</h1>
          </div>
          <ArtistList />
        </>
      )}
    </div>
  )
}
