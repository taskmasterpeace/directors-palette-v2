'use client'

import { useEffect } from 'react'
import { Dna } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { ArtistList } from './ArtistList'
import { ArtistEditor } from './ArtistEditor'
import { ArtistDoorSelector } from './wizard/ArtistDoorSelector'
import { Door1SeedFromArtist } from './wizard/Door1SeedFromArtist'
import { Door2BuildIt } from './wizard/Door2BuildIt'
import { Door3SurpriseMe } from './wizard/Door3SurpriseMe'
import { ReviewAndRemixScreen } from './review/ReviewAndRemixScreen'

interface ArtistDnaPageProps {
  userId: string
}

export function ArtistDnaPage({ userId }: ArtistDnaPageProps) {
  const { initialize, editorOpen, wizardStep } = useArtistDnaStore()

  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  if (editorOpen) {
    switch (wizardStep) {
      case 'doors':
        return <ArtistDoorSelector />
      case 'door1':
        return <Door1SeedFromArtist />
      case 'door2':
        return <Door2BuildIt />
      case 'door3':
        return <Door3SurpriseMe />
      case 'review':
        return <ReviewAndRemixScreen />
      case 'advanced':
        return <ArtistEditor />
      default:
        return <ArtistDoorSelector />
    }
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 pt-6">
        <Dna className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Artist Lab</h1>
      </div>
      <ArtistList />
    </div>
  )
}
