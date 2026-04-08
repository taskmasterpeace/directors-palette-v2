'use client'

import { useState } from 'react'
import { ArrowLeft, Wand2, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { GenrePickerStandalone, type GenrePickerValue } from './GenrePickerStandalone'

interface Pins {
  genre: GenrePickerValue
  region: string
  ethnicity: string
  gender: string
  vocalStyle: string
  signatureLook: string
  vibe: string
  era: string
  language: string
}

const EMPTY_PINS: Pins = {
  genre: {},
  region: '',
  ethnicity: '',
  gender: '',
  vocalStyle: '',
  signatureLook: '',
  vibe: '',
  era: '',
  language: '',
}

export function Door2BuildIt() {
  const { setWizardStep, buildFromPins, isBuildingFromPins } = useArtistDnaStore()
  const [description, setDescription] = useState('')
  const [pins, setPins] = useState<Pins>(EMPTY_PINS)
  const [error, setError] = useState('')

  const hasAnyPin =
    !!pins.genre.base ||
    !!pins.region ||
    !!pins.ethnicity ||
    !!pins.gender ||
    !!pins.vocalStyle ||
    !!pins.signatureLook ||
    !!pins.vibe ||
    !!pins.era ||
    !!pins.language

  const canGenerate = description.trim().length > 0 || hasAnyPin

  const handleGenerate = async () => {
    if (!canGenerate) return
    setError('')
    const result = await buildFromPins({
      description: description.trim() || undefined,
      pins: {
        genre: pins.genre.base ? pins.genre : undefined,
        region: pins.region ? { city: pins.region } : undefined,
        ethnicity: pins.ethnicity || undefined,
        gender: pins.gender || undefined,
        vocalStyle: pins.vocalStyle || undefined,
        signatureLook: pins.signatureLook || undefined,
        vibe: pins.vibe || undefined,
        era: pins.era || undefined,
        language: pins.language || undefined,
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
          <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold">Building your artist...</p>
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">
          <Wand2 className="w-3 h-3" />
          Build it
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Describe your artist.</h1>
        <p className="text-muted-foreground">Type, pin, or both. Everything you don&apos;t specify will be invented for you.</p>
      </div>

      <div className="space-y-6">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Texas trap artist, Black guy, knee-length colorful dreads, melodic but raw, somewhere between Travis Scott and Playboi Carti but with a harder edge..."
          rows={5}
          className="w-full rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 resize-none"
        />

        <div className="border-t pt-6 space-y-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pins (all optional)</h2>

          <GenrePickerStandalone value={pins.genre} onChange={(v) => setPins({ ...pins, genre: v })} />

          <div className="grid sm:grid-cols-2 gap-3">
            <TextPin label="📍 Region" value={pins.region} onChange={(v) => setPins({ ...pins, region: v })} placeholder="city, state, or country" />
            <TextPin label="🌍 Ethnicity / heritage" value={pins.ethnicity} onChange={(v) => setPins({ ...pins, ethnicity: v })} placeholder="e.g. Afro-Latino" />
            <TextPin label="👤 Gender / presentation" value={pins.gender} onChange={(v) => setPins({ ...pins, gender: v })} placeholder="e.g. non-binary" />
            <TextPin label="🎤 Vocal style" value={pins.vocalStyle} onChange={(v) => setPins({ ...pins, vocalStyle: v })} placeholder="e.g. raspy melodic rapper" />
            <TextPin label="👗 Signature look" value={pins.signatureLook} onChange={(v) => setPins({ ...pins, signatureLook: v })} placeholder="e.g. knee-length colorful dreads" />
            <TextPin label="⚡ Vibe / energy" value={pins.vibe} onChange={(v) => setPins({ ...pins, vibe: v })} placeholder="e.g. menacing" />
            <TextPin label="📖 Era" value={pins.era} onChange={(v) => setPins({ ...pins, era: v })} placeholder="e.g. 90s boom-bap revival" />
            <TextPin label="🌐 Language" value={pins.language} onChange={(v) => setPins({ ...pins, language: v })} placeholder="e.g. Spanish" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 px-5 py-4 text-base font-semibold text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Wand2 className="w-5 h-5" />
          Generate
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
        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
      />
    </label>
  )
}
