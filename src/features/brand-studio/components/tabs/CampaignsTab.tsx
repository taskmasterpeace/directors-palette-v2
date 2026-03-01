'use client'

import { Megaphone, Target, BarChart3, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

const STEPS = [
  { icon: Target, label: 'Brief', desc: 'Define audience & goals' },
  { icon: Zap, label: 'Generate', desc: 'AI creates assets' },
  { icon: BarChart3, label: 'Launch', desc: 'Export & publish' },
]

export function CampaignsTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/15 via-pink-500/10 to-transparent border border-rose-500/20 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/5"
      >
        <Megaphone className="w-9 h-9 text-rose-400/50" />
      </motion.div>

      <h3 className="text-xl font-bold tracking-tight mb-2">Campaigns</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">
        Build complete multi-platform campaigns. One brief generates all the assets you need across every platform.
      </p>

      {/* Pipeline preview */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl bg-secondary/30 border border-border/15 opacity-50">
                <Icon className="w-5 h-5 text-rose-400/50" />
                <span className="text-xs font-semibold">{step.label}</span>
                <span className="text-[10px] text-muted-foreground/40">{step.desc}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-px bg-gradient-to-r from-border/30 to-border/10" />
              )}
            </motion.div>
          )
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/30 mt-8">Coming in Phase 6</p>
    </motion.div>
  )
}
