'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { PANEL_THEMES, type PanelTheme } from './panel-themes'

interface PanelCardProps {
  theme: PanelTheme
  emoji?: string
  index?: number
  className?: string
  children: ReactNode
}

const cardSpring = { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.9 }

/**
 * Themed panel wrapper. Applies a colored border, corner ambient orb,
 * watermark emoji, and a staggered fade+rise entrance. Replaces the
 * plain <Card> wrapper used previously in SoundStudioPage.
 */
export function PanelCard({ theme, emoji, index = 0, className = '', children }: PanelCardProps) {
  const t = PANEL_THEMES[theme]
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...cardSpring, delay: Math.min(index, 12) * 0.05 }}
      className={`relative overflow-hidden p-4 rounded-[0.625rem] border bg-card ${t.border} ${className}`}
    >
      {/* Corner ambient orb */}
      <div
        className={`pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl ${t.orb}`}
      />

      {/* Watermark emoji */}
      {emoji && (
        <div
          className="pointer-events-none absolute bottom-2 right-3 text-5xl leading-none opacity-[0.05] select-none"
          aria-hidden
        >
          {emoji}
        </div>
      )}

      {/* Content above effects */}
      <div className="relative z-10">{children}</div>
    </motion.section>
  )
}
