'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'

const LOADING_PHASES = [
  'Researching artist...',
  'Mapping vocal identity...',
  'Building persona...',
  'Analyzing discography...',
  'Assembling DNA profile...',
  'Fact-checking with web search...',
  'Verifying accuracy...',
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
    <div className="w-full max-w-2xl mx-auto py-8 px-4">
      <button
        onClick={() => setWizardStep('doors')}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
          <Sparkles className="w-3 h-3" />
          Inspired by an artist
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Who inspires you?</h1>
        <p className="text-muted-foreground">
          Type a real artist. We&apos;ll build a full DNA profile from them, then help you rename them to something fictional on the next screen.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. Kendrick Lamar, Bad Bunny, Billie Eilish..."
          autoFocus
          className="w-full rounded-md border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Build Profile
          <span className="text-xs font-normal opacity-70">25 pts</span>
        </button>
      </div>
    </div>
  )
}
