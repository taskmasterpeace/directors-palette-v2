'use client'

import { useState } from 'react'
import { Wand2, Loader2, MapPin, Globe2, User, Mic2, Shirt, Zap } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { GenrePickerStandalone, type GenrePickerValue } from './GenrePickerStandalone'
import { WizardScaffold } from './WizardScaffold'

interface Pins {
  genre: GenrePickerValue
  region: string
  ethnicity: string
  gender: string
  vocalStyle: string
  signatureLook: string
  vibe: string
}

const EMPTY_PINS: Pins = {
  genre: {},
  region: '',
  ethnicity: '',
  gender: '',
  vocalStyle: '',
  signatureLook: '',
  vibe: '',
}

export function Door2BuildIt() {
  const { setWizardStep, buildFromPins, isBuildingFromPins } = useArtistDnaStore()
  const [description, setDescription] = useState('')
  const [pins, setPins] = useState<Pins>(EMPTY_PINS)
  const [error, setError] = useState('')

  const hasAnyPin =
    !!(pins.genre.base || pins.genre.sub || pins.genre.micro) ||
    !!pins.region ||
    !!pins.ethnicity ||
    !!pins.gender ||
    !!pins.vocalStyle ||
    !!pins.signatureLook ||
    !!pins.vibe

  const canGenerate = description.trim().length > 0 || hasAnyPin

  const handleGenerate = async () => {
    if (!canGenerate) return
    setError('')
    const result = await buildFromPins({
      description: description.trim() || undefined,
      pins: {
        genre: (pins.genre.base || pins.genre.sub || pins.genre.micro) ? pins.genre : undefined,
        region: pins.region ? { city: pins.region } : undefined,
        ethnicity: pins.ethnicity || undefined,
        gender: pins.gender || undefined,
        vocalStyle: pins.vocalStyle || undefined,
        signatureLook: pins.signatureLook || undefined,
        vibe: pins.vibe || undefined,
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
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold">Building your artist...</p>
        </div>
      </div>
    )
  }

  return (
    <WizardScaffold
      theme="cyan"
      label="Describe your artist"
      pillIcon={<Wand2 className="w-3 h-3" />}
      pillText="Build from scratch"
      heading="Describe your artist."
      description="Type, pin, or both. Everything you don't specify will be invented for you."
      watermarkEmoji="🎨"
      onBack={() => setWizardStep('doors')}
      cta={
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-4 text-base font-bold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
        >
          <Wand2 className="w-5 h-5" />
          GENERATE
          <span className="text-xs font-semibold opacity-70">15 pts</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Texas trap artist, knee-length colorful dreads, melodic but raw, somewhere between Travis Scott and Playboi Carti with a harder edge..."
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3 text-sm md:text-base text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/50 resize-none transition-all"
        />

        {/* Genre */}
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
            Genre
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <GenrePickerStandalone value={pins.genre} onChange={(v) => setPins({ ...pins, genre: v })} />
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
            Details (optional)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <IconField
              icon={<MapPin className="w-4 h-4" />}
              label="Region"
              value={pins.region}
              onChange={(v) => setPins({ ...pins, region: v })}
              placeholder="Houston, TX"
            />
            <IconField
              icon={<Globe2 className="w-4 h-4" />}
              label="Ethnicity"
              value={pins.ethnicity}
              onChange={(v) => setPins({ ...pins, ethnicity: v })}
              placeholder="Afro-Latino"
            />
            <IconField
              icon={<User className="w-4 h-4" />}
              label="Gender"
              value={pins.gender}
              onChange={(v) => setPins({ ...pins, gender: v })}
              placeholder="non-binary"
            />
            <IconField
              icon={<Mic2 className="w-4 h-4" />}
              label="Vocal style"
              value={pins.vocalStyle}
              onChange={(v) => setPins({ ...pins, vocalStyle: v })}
              placeholder="raspy melodic"
            />
            <IconField
              icon={<Shirt className="w-4 h-4" />}
              label="Look"
              value={pins.signatureLook}
              onChange={(v) => setPins({ ...pins, signatureLook: v })}
              placeholder="colorful dreads"
            />
            <IconField
              icon={<Zap className="w-4 h-4" />}
              label="Vibe"
              value={pins.vibe}
              onChange={(v) => setPins({ ...pins, vibe: v })}
              placeholder="menacing"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </WizardScaffold>
  )
}

function IconField({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <label className="block rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-white/20 focus-within:border-amber-400/50 focus-within:bg-amber-500/[0.04] transition-all">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-amber-400/80 mb-1">
        {icon}
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus-visible:outline-none"
      />
    </label>
  )
}
