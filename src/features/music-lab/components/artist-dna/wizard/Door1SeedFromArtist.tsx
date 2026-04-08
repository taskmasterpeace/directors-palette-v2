'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { WizardScaffold } from './WizardScaffold'

const LOADING_PHASES = [
  'Researching artist...',
  'Mapping vocal identity...',
  'Building persona...',
  'Analyzing discography...',
  'Assembling DNA profile...',
  'Fact-checking with web search...',
  'Verifying accuracy...',
]

const PRESET_ARTISTS = [
  { name: 'Kendrick Lamar', genre: 'Hip-Hop · Compton' },
  { name: 'Bad Bunny', genre: 'Reggaeton · PR' },
  { name: 'Billie Eilish', genre: 'Alt-Pop · LA' },
  { name: 'The Weeknd', genre: 'R&B · Toronto' },
  { name: 'SZA', genre: 'R&B · NJ' },
  { name: 'Taylor Swift', genre: 'Pop · Nashville' },
]

export function Door1SeedFromArtist() {
  const { setWizardStep, startFromArtist, isSeedingFromArtist } = useArtistDnaStore()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loadingPhase, setLoadingPhase] = useState(0)

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

  const handleSubmit = async () => {
    if (!input.trim()) return
    setError('')
    const result = await startFromArtist(input.trim())
    if (result === 'insufficient_credits') {
      useCreditsStore.getState().openPurchaseDialog()
      return
    }
    if (result !== true) {
      setError('Could not build a profile for that artist. Check the spelling or try a more well-known artist.')
      return
    }
    useArtistDnaStore.getState().setWizardStep('review')
    useCreditsStore.getState().fetchBalance(true)
  }

  if (isSeedingFromArtist) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
            </div>
            <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Building DNA for {input}</p>
            <p className="text-sm text-muted-foreground animate-pulse">{LOADING_PHASES[loadingPhase]}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <WizardScaffold
      theme="amber"
      label="Choose your inspiration"
      pillIcon={<Sparkles className="w-3 h-3" />}
      pillText="Inspired by an artist"
      heading="Who inspires you?"
      description="Type a real artist. We'll build a full DNA profile from them, then help you rename them to something fictional on the next screen."
      watermarkEmoji="🎤"
      onBack={() => setWizardStep('doors')}
      cta={
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-4 text-base font-bold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
        >
          <Sparkles className="w-5 h-5" />
          BUILD PROFILE
          <span className="text-xs font-semibold opacity-70">25 pts</span>
        </button>
      }
    >
      <div className="space-y-5">
        {/* Input */}
        <div>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g. Kendrick Lamar"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-4 text-base text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/50 transition-all"
          />
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </div>

        {/* Preset suggestions */}
        <div>
          <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
            Popular picks
          </div>
          <div className="space-y-2">
            {PRESET_ARTISTS.map((a) => {
              const active = input === a.name
              return (
                <button
                  key={a.name}
                  onClick={() => setInput(a.name)}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                    active
                      ? 'border-amber-400/60 bg-amber-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${
                      active ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {a.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{a.name}</div>
                    <div className="text-xs text-white/50 truncate">{a.genre}</div>
                  </div>
                  {active && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </WizardScaffold>
  )
}
