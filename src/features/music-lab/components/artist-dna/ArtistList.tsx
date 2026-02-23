'use client'

import { useState, useEffect } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ArtistCard } from './ArtistCard'
import { useArtistDnaStore } from '../../store/artist-dna.store'

const LOADING_PHASES = [
  'Researching artist...',
  'Mapping vocal identity...',
  'Building persona...',
  'Analyzing discography...',
  'Assembling DNA profile...',
]

export function ArtistList() {
  const { artists, isLoading, startNewArtist, startFromArtist, isSeedingFromArtist, loadArtistIntoDraft, deleteArtist } =
    useArtistDnaStore()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [seedInput, setSeedInput] = useState('')
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [seedError, setSeedError] = useState('')
  const [loadingPhase, setLoadingPhase] = useState(0)

  // Cycle through loading phases while seeding
  useEffect(() => {
    if (!isSeedingFromArtist) {
      setLoadingPhase(0)
      return
    }
    const interval = setInterval(() => {
      setLoadingPhase((p) => (p + 1) % LOADING_PHASES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isSeedingFromArtist])

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
    if (success) {
      setSeedDialogOpen(false)
      setSeedInput('')
    } else {
      setSeedError('Could not build a profile for that artist. Check the spelling or try a more well-known artist.')
    }
  }

  const handleOpenSeedDialog = () => {
    setSeedInput('')
    setSeedError('')
    setSeedDialogOpen(true)
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

        <button
          onClick={handleOpenSeedDialog}
          className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-amber-400 hover:border-amber-400/50 transition-colors min-h-[100px]"
        >
          <Sparkles className="w-8 h-8" />
          <span className="font-medium">Start from Real Artist</span>
        </button>
      </div>

      {/* Seed from Artist Dialog */}
      <Dialog open={seedDialogOpen} onOpenChange={(open) => {
        if (!isSeedingFromArtist) {
          setSeedDialogOpen(open)
          if (!open) { setSeedInput(''); setSeedError('') }
        }
      }}>
        <DialogContent showCloseButton={!isSeedingFromArtist}>
          {!isSeedingFromArtist ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Start from a Real Artist
                </DialogTitle>
                <DialogDescription>
                  Enter an artist name and we&apos;ll pre-fill all DNA fields based on their real identity, sound, persona, and style. You can tweak everything after.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <input
                  type="text"
                  value={seedInput}
                  onChange={(e) => { setSeedInput(e.target.value); setSeedError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSeedFromArtist()}
                  placeholder="e.g. Kendrick Lamar, Adele, Bad Bunny, Billie Eilish..."
                  autoFocus
                  className="w-full rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
                />
                {seedError && <p className="text-sm text-destructive">{seedError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSeedDialogOpen(false)}
                  className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSeedFromArtist}
                  disabled={!seedInput.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Build Profile
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
                <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">
                  Building DNA for {seedInput}
                </p>
                <p className="text-sm text-muted-foreground animate-pulse">
                  {LOADING_PHASES[loadingPhase]}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
