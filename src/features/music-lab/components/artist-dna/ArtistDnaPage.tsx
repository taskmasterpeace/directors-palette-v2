'use client'

import { useEffect } from 'react'
import { Dna, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/music-lab">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Music Lab
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Dna className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Artist DNA</h1>
          </div>
        </div>
      </div>

      {editorOpen ? <ArtistEditor /> : <ArtistList />}
    </div>
  )
}
