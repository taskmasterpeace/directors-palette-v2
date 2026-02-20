'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArtistCard } from './ArtistCard'
import { useArtistDnaStore } from '../../store/artist-dna.store'

export function ArtistList() {
  const { artists, isLoading, startNewArtist, loadArtistIntoDraft, deleteArtist } =
    useArtistDnaStore()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteArtist(deleteTarget)
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-8">Loading artists...</p>
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            onClick={() => loadArtistIntoDraft(artist.id)}
            onDelete={() => setDeleteTarget(artist.id)}
          />
        ))}

        <button
          onClick={startNewArtist}
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors min-h-[100px]"
        >
          <Plus className="w-8 h-8" />
          <span className="font-medium">Create New Artist</span>
        </button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Artist</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this artist profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
