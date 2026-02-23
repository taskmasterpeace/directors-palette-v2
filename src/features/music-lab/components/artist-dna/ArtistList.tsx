'use client'

import { useState } from 'react'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
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
  const { artists, isLoading, startNewArtist, startFromArtist, isSeedingFromArtist, loadArtistIntoDraft, deleteArtist } =
    useArtistDnaStore()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [seedInput, setSeedInput] = useState('')
  const [showSeedInput, setShowSeedInput] = useState(false)
  const [seedError, setSeedError] = useState('')

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteArtist(deleteTarget)
      setDeleteTarget(null)
    }
  }

  const handleSeedFromArtist = async () => {
    if (!seedInput.trim()) return
    setSeedError('')
    const success = await startFromArtist(seedInput.trim())
    if (!success) {
      setSeedError('Could not load that artist. Try a different name.')
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

        {!showSeedInput ? (
          <button
            onClick={() => setShowSeedInput(true)}
            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-amber-400 hover:border-amber-400/50 transition-colors min-h-[100px]"
          >
            <Sparkles className="w-8 h-8" />
            <span className="font-medium">Start from Real Artist</span>
          </button>
        ) : (
          <div className="border-2 border-amber-400/50 rounded-lg p-4 flex flex-col gap-3 min-h-[100px] bg-amber-400/5">
            <p className="text-sm text-amber-400 font-medium">Enter an artist as a starting point</p>
            <input
              type="text"
              value={seedInput}
              onChange={(e) => { setSeedInput(e.target.value); setSeedError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleSeedFromArtist()}
              placeholder="e.g. Kendrick Lamar, Adele, Bad Bunny..."
              autoFocus
              disabled={isSeedingFromArtist}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            {seedError && <p className="text-xs text-destructive">{seedError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSeedFromArtist}
                disabled={!seedInput.trim() || isSeedingFromArtist}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSeedingFromArtist ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Building profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Go
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowSeedInput(false); setSeedInput(''); setSeedError('') }}
                disabled={isSeedingFromArtist}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
