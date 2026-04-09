'use client'

import { useState } from 'react'
import { Dices, Loader2, Tag, MapPin, Zap, Shirt } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { GenrePickerStandalone, type GenrePickerValue } from './GenrePickerStandalone'
import { WizardScaffold } from './WizardScaffold'

export function Door3SurpriseMe() {
  const { setWizardStep, buildFromPins, isBuildingFromPins } = useArtistDnaStore()
  const [genre, setGenre] = useState<GenrePickerValue>({})
  const [stageName, setStageName] = useState('')
  const [from, setFrom] = useState('')
  const [vibe, setVibe] = useState('')
  const [lookHint, setLookHint] = useState('')
  const [error, setError] = useState('')

  const canRoll = !!(genre.base || genre.sub || genre.micro)

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
          <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          </div>
          <p className="text-lg font-semibold">Rolling the dice...</p>
        </div>
      </div>
    )
  }

  return (
    <WizardScaffold
      theme="fuchsia"
      label="Pick a genre & spice it up"
      pillIcon={<Dices className="w-3 h-3" />}
      pillText="Surprise me"
      heading="Pick a genre. We'll do the rest."
      description="Genre is required — everything else is optional spice."
      watermarkEmoji="🎲"
      onBack={() => setWizardStep('doors')}
      cta={
        <button
          onClick={handleRoll}
          disabled={!canRoll}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-4 text-base font-bold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
        >
          <Dices className="w-5 h-5" />
          ROLL
          <span className="text-xs font-semibold opacity-70">15 pts</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Genre */}
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
            Genre <span className="text-amber-400">*</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <GenrePickerStandalone value={genre} onChange={setGenre} requireBase />
          </div>
        </div>

        {/* Spice grid */}
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
            Spice it up (optional)
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <SpiceTile
              icon={<Tag className="w-5 h-5" />}
              label="Stage name"
              value={stageName}
              onChange={setStageName}
              placeholder="Lil Stardust"
            />
            <SpiceTile
              icon={<MapPin className="w-5 h-5" />}
              label="From"
              value={from}
              onChange={setFrom}
              placeholder="Houston, TX"
            />
            <SpiceTile
              icon={<Zap className="w-5 h-5" />}
              label="Vibe word"
              value={vibe}
              onChange={setVibe}
              placeholder="menacing"
            />
            <SpiceTile
              icon={<Shirt className="w-5 h-5" />}
              label="Look hint"
              value={lookHint}
              onChange={setLookHint}
              placeholder="knee-length dreads"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </WizardScaffold>
  )
}

function SpiceTile({
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
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20 focus-within:border-amber-400/50 focus-within:bg-amber-500/[0.06] transition-all aspect-[1/0.85]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-[11px] font-semibold tracking-wide uppercase text-amber-400/80">{label}</div>
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
