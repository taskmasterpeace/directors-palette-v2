'use client'

import { useState } from 'react'
import { ArrowLeft, Dices, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { GenrePickerStandalone, type GenrePickerValue } from './GenrePickerStandalone'

export function Door3SurpriseMe() {
  const { setWizardStep, buildFromPins, isBuildingFromPins } = useArtistDnaStore()
  const [genre, setGenre] = useState<GenrePickerValue>({})
  const [stageName, setStageName] = useState('')
  const [from, setFrom] = useState('')
  const [vibe, setVibe] = useState('')
  const [lookHint, setLookHint] = useState('')
  const [error, setError] = useState('')

  const canRoll = !!genre.base

  const handleRoll = async () => {
    if (!canRoll) return
    setError('')
    const result = await buildFromPins({
      pins: {
        genre,
        region: from ? { city: from } : undefined,
        vibe: vibe || undefined,
        signatureLook: lookHint || undefined,
        stageName: stageName || undefined,
      },
    })
    if (result === 'insufficient_credits') {
      useCreditsStore.getState().openPurchaseDialog()
      return
    }
    if (result !== true) {
      setError('Something went wrong. Try again.')
      return
    }
    useCreditsStore.getState().fetchBalance(true)
  }

  if (isBuildingFromPins) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-fuchsia-500/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-fuchsia-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold">Rolling the dice...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <button
        onClick={() => setWizardStep('doors')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-xs font-medium">
          <Dices className="w-3 h-3" />
          Surprise me
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Pick a genre. We&apos;ll do the rest.</h1>
        <p className="text-muted-foreground">
          Genre is required — everything else is optional spice.
        </p>
      </div>

      <div className="space-y-6">
        <GenrePickerStandalone value={genre} onChange={setGenre} requireBase />

        <div className="border-t pt-6 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Spice it up (optional)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <TextPin label="🏷️ Stage name" value={stageName} onChange={setStageName} placeholder="e.g. Lil Stardust" />
            <TextPin label="📍 From" value={from} onChange={setFrom} placeholder="e.g. Houston, TX" />
            <TextPin label="⚡ Vibe word" value={vibe} onChange={setVibe} placeholder="e.g. menacing" />
            <TextPin label="👤 Look hint" value={lookHint} onChange={setLookHint} placeholder="e.g. knee-length dreads" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleRoll}
          disabled={!canRoll}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-fuchsia-500 px-5 py-4 text-base font-semibold text-white hover:bg-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Dices className="w-5 h-5" />
          ROLL
          <span className="text-xs font-normal opacity-70">15 pts</span>
        </button>
      </div>
    </div>
  )
}

function TextPin({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1 block">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/50"
      />
    </label>
  )
}
