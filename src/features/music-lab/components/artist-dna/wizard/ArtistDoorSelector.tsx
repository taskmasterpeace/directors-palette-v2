'use client'

import { Sparkles, Wand2, Dices, X } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function ArtistDoorSelector() {
  const { setWizardStep, closeEditor } = useArtistDnaStore()

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create an artist</h1>
          <p className="text-muted-foreground mt-1">Pick how you want to start. You can always tweak everything after.</p>
        </div>
        <button
          onClick={closeEditor}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DoorCard
          icon={<Sparkles className="w-7 h-7 text-amber-400" />}
          title="Inspired by an artist"
          subtitle="Start from someone real. Make them yours."
          detail="We build the DNA from a real artist using web search, then help you rename them to something fictional."
          cost="25 pts"
          accent="border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5"
          onClick={() => setWizardStep('door1')}
        />
        <DoorCard
          icon={<Wand2 className="w-7 h-7 text-cyan-400" />}
          title="Build it"
          subtitle="You have an idea. Pin what matters."
          detail="Describe your artist and/or pin specific traits (genre, region, look, vibe). We fill everything else coherently."
          cost="15 pts"
          accent="border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/5"
          onClick={() => setWizardStep('door2')}
        />
        <DoorCard
          icon={<Dices className="w-7 h-7 text-fuchsia-400" />}
          title="Surprise me"
          subtitle="Pick a genre. We'll do the rest."
          detail="Choose a genre (and optional spice — stage name, region, vibe word, look hint). Roll the dice."
          cost="15 pts"
          accent="border-fuchsia-500/30 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/5"
          onClick={() => setWizardStep('door3')}
        />
      </div>
    </div>
  )
}

function DoorCard({
  icon,
  title,
  subtitle,
  detail,
  cost,
  accent,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  detail: string
  cost: string
  accent: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl border-2 bg-card p-6 transition-all hover-lift-sm ${accent}`}
    >
      <div className="flex items-start justify-between mb-4">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{cost}</span>
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground italic mb-3">{subtitle}</p>
      <p className="text-sm text-muted-foreground/80 leading-relaxed">{detail}</p>
    </button>
  )
}
