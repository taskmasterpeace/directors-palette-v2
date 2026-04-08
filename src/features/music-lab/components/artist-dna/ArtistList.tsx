'use client'

import { useState } from 'react'
import { Plus, Upload } from 'lucide-react'
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
  const { artists, isLoading, startNewArtist, loadArtistIntoDraft, deleteArtist, exportArtist, importArtist } =
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
            onExport={() => exportArtist(artist.id)}
          />
        ))}

        <button
          onClick={startNewArtist}
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors min-h-[100px]"
        >
          <Plus className="w-8 h-8" />
          <span className="font-medium">Create New Artist</span>
        </button>

        <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-dashed border-border/50 p-3 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-colors text-sm text-muted-foreground hover:text-cyan-400">
          <Upload className="w-4 h-4" />
          Import Artist
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              await importArtist(text)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* Delete confirmation */}
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
