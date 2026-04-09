'use client'

import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Three doors, three rooms. Each wizard door has its own identity color for
 * the label, pill, header label, and ambient orbs. Amber is reserved as the
 * brand CTA color and is applied at the button level by each door, not here.
 */
export type Theme = 'rose' | 'emerald' | 'violet' | 'amber'

interface ThemeTokens {
  orbA: string
  orbB: string
  pillBg: string
  pillBorder: string
  pillText: string
  label: string
  focusRing: string
}

const THEME: Record<Theme, ThemeTokens> = {
  rose: {
    orbA: 'bg-rose-500/12',
    orbB: 'bg-amber-500/8',
    pillBg: 'bg-rose-500/15',
    pillBorder: 'border-rose-400/30',
    pillText: 'text-rose-300',
    label: 'text-rose-300/80',
    focusRing: 'focus-visible:ring-rose-400/50',
  },
  emerald: {
    orbA: 'bg-emerald-500/12',
    orbB: 'bg-amber-500/8',
    pillBg: 'bg-emerald-500/15',
    pillBorder: 'border-emerald-400/30',
    pillText: 'text-emerald-300',
    label: 'text-emerald-300/80',
    focusRing: 'focus-visible:ring-emerald-400/50',
  },
  violet: {
    orbA: 'bg-violet-500/14',
    orbB: 'bg-amber-500/8',
    pillBg: 'bg-violet-500/15',
    pillBorder: 'border-violet-400/30',
    pillText: 'text-violet-300',
    label: 'text-violet-300/80',
    focusRing: 'focus-visible:ring-violet-400/50',
  },
  amber: {
    orbA: 'bg-amber-500/12',
    orbB: 'bg-amber-500/6',
    pillBg: 'bg-amber-500/15',
    pillBorder: 'border-amber-400/30',
    pillText: 'text-amber-300',
    label: 'text-amber-300/80',
    focusRing: 'focus-visible:ring-amber-400/50',
  },
}

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
      {/* Ambient orbs — door color + amber kiss */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full ${t.orbA} blur-3xl`} />
        <div className={`absolute top-1/2 -right-24 w-[30rem] h-[30rem] rounded-full ${t.orbB} blur-3xl`} />
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
