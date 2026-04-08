'use client'

import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type Theme = 'amber' | 'cyan' | 'fuchsia'

const THEME = {
  amber: {
    orb: 'bg-amber-500/10',
    pillBg: 'bg-amber-500/15',
    pillBorder: 'border-amber-500/30',
    pillText: 'text-amber-400',
    label: 'text-amber-400/80',
    focusRing: 'focus-visible:ring-amber-400/50',
  },
  cyan: {
    orb: 'bg-cyan-500/10',
    pillBg: 'bg-cyan-500/15',
    pillBorder: 'border-cyan-500/30',
    pillText: 'text-cyan-400',
    label: 'text-cyan-400/80',
    focusRing: 'focus-visible:ring-cyan-400/50',
  },
  fuchsia: {
    orb: 'bg-fuchsia-500/10',
    pillBg: 'bg-fuchsia-500/15',
    pillBorder: 'border-fuchsia-500/30',
    pillText: 'text-fuchsia-400',
    label: 'text-fuchsia-400/80',
    focusRing: 'focus-visible:ring-fuchsia-400/50',
  },
} as const

interface WizardScaffoldProps {
  theme: Theme
  label: string
  pillIcon: ReactNode
  pillText: string
  heading: string
  description: string
  watermarkEmoji: string
  onBack: () => void
  children: ReactNode
  cta: ReactNode
}

export function WizardScaffold({
  theme,
  label,
  pillIcon,
  pillText,
  heading,
  description,
  watermarkEmoji,
  onBack,
  children,
  cta,
}: WizardScaffoldProps) {
  const t = THEME[theme]
  return (
    <div className="relative w-full min-h-[calc(100vh-8rem)]">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full ${t.orb} blur-3xl`} />
        <div className={`absolute top-1/2 -right-24 w-[30rem] h-[30rem] rounded-full ${t.orb} blur-3xl`} />
      </div>

      {/* Watermark emoji */}
      <div className="pointer-events-none absolute top-16 right-4 md:right-12 text-[10rem] md:text-[14rem] leading-none opacity-[0.06] select-none">
        {watermarkEmoji}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-5 pb-28">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className={`text-[11px] font-semibold tracking-[0.18em] uppercase mb-2 ${t.label}`}>{label}</div>

        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${t.pillBg} ${t.pillBorder} ${t.pillText} text-xs font-medium mb-3`}
        >
          {pillIcon}
          {pillText}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{heading}</h1>
        <p className="text-sm md:text-base text-white/60 mb-6 max-w-xl">{description}</p>

        {children}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/95 to-black/0 pt-8 pb-4 px-4">
        <div className="max-w-3xl mx-auto">{cta}</div>
      </div>
    </div>
  )
}
