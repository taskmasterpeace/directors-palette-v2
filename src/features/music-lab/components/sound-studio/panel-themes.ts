/**
 * Sound Studio panel themes — group panels by sonic role, give each group
 * a distinct color identity and ambient emoji. Amber is the brand anchor
 * (rhythm + genre), violet owns the low end, cyan is the texture/air,
 * rose is atmosphere/mood, emerald is structure.
 */

export type PanelTheme = 'amber' | 'violet' | 'cyan' | 'rose' | 'emerald'

export interface PanelThemeTokens {
  // Border on the card
  border: string
  // Ambient orb wash (corner blur)
  orb: string
  // Watermark emoji opacity layer
  emoji: string
  // Text color for accents inside the panel
  text: string
  // Text color at 70% (for group labels)
  textMuted: string
  // MultiSelectPills color scheme key
  pillsColor: 'amber' | 'violet' | 'cyan' | 'rose' | 'emerald'
  // Hover border for interactive elements
  hoverBorder: string
  // Active background
  activeBg: string
  // Active border
  activeBorder: string
  // Active glow shadow
  activeShadow: string
}

export const PANEL_THEMES: Record<PanelTheme, PanelThemeTokens> = {
  amber: {
    border: 'border-amber-500/20',
    orb: 'bg-amber-500/8',
    emoji: 'text-amber-300',
    text: 'text-amber-400',
    textMuted: 'text-amber-400/70',
    pillsColor: 'amber',
    hoverBorder: 'hover:border-amber-500/40',
    activeBg: 'bg-amber-500/20',
    activeBorder: 'border-amber-500/40',
    activeShadow: 'shadow-[0_0_8px_oklch(0.6_0.2_55/0.15)]',
  },
  violet: {
    border: 'border-violet-500/20',
    orb: 'bg-violet-500/8',
    emoji: 'text-violet-300',
    text: 'text-violet-400',
    textMuted: 'text-violet-400/70',
    pillsColor: 'violet',
    hoverBorder: 'hover:border-violet-500/40',
    activeBg: 'bg-violet-500/20',
    activeBorder: 'border-violet-500/40',
    activeShadow: 'shadow-[0_0_8px_oklch(0.55_0.18_295/0.2)]',
  },
  cyan: {
    border: 'border-cyan-500/20',
    orb: 'bg-cyan-500/8',
    emoji: 'text-cyan-300',
    text: 'text-cyan-400',
    textMuted: 'text-cyan-400/70',
    pillsColor: 'cyan',
    hoverBorder: 'hover:border-cyan-500/40',
    activeBg: 'bg-cyan-500/20',
    activeBorder: 'border-cyan-500/40',
    activeShadow: 'shadow-[0_0_8px_oklch(0.55_0.15_200/0.15)]',
  },
  rose: {
    border: 'border-rose-500/20',
    orb: 'bg-rose-500/8',
    emoji: 'text-rose-300',
    text: 'text-rose-400',
    textMuted: 'text-rose-400/70',
    pillsColor: 'rose',
    hoverBorder: 'hover:border-rose-500/40',
    activeBg: 'bg-rose-500/20',
    activeBorder: 'border-rose-500/40',
    activeShadow: 'shadow-[0_0_8px_oklch(0.55_0.15_15/0.2)]',
  },
  emerald: {
    border: 'border-emerald-500/20',
    orb: 'bg-emerald-500/8',
    emoji: 'text-emerald-300',
    text: 'text-emerald-400',
    textMuted: 'text-emerald-400/70',
    pillsColor: 'emerald',
    hoverBorder: 'hover:border-emerald-500/40',
    activeBg: 'bg-emerald-500/20',
    activeBorder: 'border-emerald-500/40',
    activeShadow: 'shadow-[0_0_8px_oklch(0.55_0.15_155/0.2)]',
  },
}
