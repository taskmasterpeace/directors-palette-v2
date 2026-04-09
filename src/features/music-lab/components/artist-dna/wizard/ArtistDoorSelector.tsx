'use client'

import { Sparkles, Wand2, Dices, X, ArrowRight, Mic2, Palette, Zap } from 'lucide-react'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function ArtistDoorSelector() {
  const { setWizardStep, closeEditor } = useArtistDnaStore()

  return (
    <div className="relative w-full min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] rounded-full bg-amber-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between px-4 pt-6 md:pt-10 max-w-6xl mx-auto w-full">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-3 py-1 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-white/70 tracking-wide uppercase">New · Artist Studio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Create an artist
          </h1>
          <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-xl">
            Three ways to start. Pick the one that matches the idea in your head — you can tweak everything after.
          </p>
        </div>
        <button
          onClick={closeEditor}
          className="shrink-0 p-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Door cards */}
      <div className="relative z-10 flex-1 flex items-center px-4 py-8 md:py-12">
        <div className="grid gap-5 md:grid-cols-3 max-w-6xl mx-auto w-full">
          <DoorCard
            icon={<Sparkles className="w-8 h-8" />}
            emoji="🎤"
            title="Inspired by an artist"
            tagline="Start from someone real. Make them yours."
            detail="We build the DNA from a real artist using live web search, then help you rename them to something fictional."
            chips={['Real DNA', 'Web-verified', 'Rename nudge']}
            cost="25 pts"
            gradient="from-amber-500/25 via-amber-500/5 to-transparent"
            ring="ring-amber-500/40 hover:ring-amber-400/80"
            glow="group-hover:shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
            accent="text-amber-400"
            accentBg="bg-amber-500/15"
            accentBorder="border-amber-500/30"
            onClick={() => setWizardStep('door1')}
          />
          <DoorCard
            icon={<Wand2 className="w-8 h-8" />}
            emoji="🧬"
            title="Build it"
            tagline="You have an idea. Pin what matters."
            detail="Describe your artist in your own words and pin specific traits. We fill the rest coherently — guaranteed."
            chips={['Pin traits', 'Free-form', 'Guided']}
            cost="15 pts"
            gradient="from-amber-500/25 via-amber-500/5 to-transparent"
            ring="ring-amber-500/40 hover:ring-amber-400/80"
            glow="group-hover:shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
            accent="text-amber-400"
            accentBg="bg-amber-500/15"
            accentBorder="border-amber-500/30"
            onClick={() => setWizardStep('door2')}
          />
          <DoorCard
            icon={<Dices className="w-8 h-8" />}
            emoji="🎲"
            title="Surprise me"
            tagline="Pick a genre. We'll do the rest."
            detail="Choose a genre, sprinkle optional spice — stage name, region, vibe, look — and roll the dice."
            chips={['One click', 'Full random', 'Fastest']}
            cost="15 pts"
            gradient="from-amber-500/25 via-amber-500/5 to-transparent"
            ring="ring-amber-500/40 hover:ring-amber-400/80"
            glow="group-hover:shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)]"
            accent="text-amber-400"
            accentBg="bg-amber-500/15"
            accentBorder="border-amber-500/30"
            onClick={() => setWizardStep('door3')}
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="relative z-10 flex items-center justify-center gap-6 pb-6 text-xs text-white/40">
        <div className="inline-flex items-center gap-1.5">
          <Mic2 className="w-3.5 h-3.5" /> Full DNA profile
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Identity, sound, look
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Edit anything after
        </div>
      </div>
    </div>
  )
}

function DoorCard({
  icon,
  emoji,
  title,
  tagline,
  detail,
  chips,
  cost,
  gradient,
  ring,
  glow,
  accent,
  accentBg,
  accentBorder,
  onClick,
}: {
  icon: React.ReactNode
  emoji: string
  title: string
  tagline: string
  detail: string
  chips: string[]
  cost: string
  gradient: string
  ring: string
  glow: string
  accent: string
  accentBg: string
  accentBorder: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative text-left rounded-2xl overflow-hidden bg-zinc-950/60 backdrop-blur-sm ring-1 ${ring} ${glow} transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/70`}
    >
      {/* Gradient wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
      {/* Decorative giant emoji */}
      <div className="absolute top-4 right-4 text-6xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 select-none pointer-events-none">
        {emoji}
      </div>
      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative p-6 md:p-7 flex flex-col min-h-[22rem]">
        {/* Icon badge */}
        <div className="flex items-start justify-between mb-5">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${accentBg} ${accentBorder} border ${accent}`}>
            {icon}
          </div>
          <span className={`text-xs font-semibold tracking-wider uppercase ${accent}`}>{cost}</span>
        </div>

        {/* Title + tagline */}
        <h3 className="text-2xl font-bold tracking-tight mb-2 text-white">{title}</h3>
        <p className={`text-sm font-medium italic mb-4 ${accent}`}>{tagline}</p>

        {/* Detail */}
        <p className="text-sm text-white/60 leading-relaxed mb-5 flex-1">{detail}</p>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {chips.map((c) => (
            <span
              key={c}
              className={`text-[11px] font-medium px-2 py-1 rounded-md ${accentBg} ${accent} border ${accentBorder}`}
            >
              {c}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${accent} group-hover:gap-3 transition-all duration-300`}>
          Start here
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  )
}
