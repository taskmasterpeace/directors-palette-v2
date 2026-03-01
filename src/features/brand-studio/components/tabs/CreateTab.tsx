'use client'

import { Wand2, Image, Film, Mic2, Music2, FileText, Layers } from 'lucide-react'
import { motion } from 'framer-motion'

const GENERATORS = [
  { icon: Image, label: 'Image', color: 'from-violet-500/15 to-violet-500/5 border-violet-500/20', iconColor: 'text-violet-400/70' },
  { icon: Film, label: 'Video', color: 'from-purple-500/15 to-purple-500/5 border-purple-500/20', iconColor: 'text-purple-400/70' },
  { icon: Mic2, label: 'Voice', color: 'from-indigo-500/15 to-indigo-500/5 border-indigo-500/20', iconColor: 'text-indigo-400/70' },
  { icon: Music2, label: 'Music', color: 'from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/20', iconColor: 'text-fuchsia-400/70' },
  { icon: FileText, label: 'Script', color: 'from-pink-500/15 to-pink-500/5 border-pink-500/20', iconColor: 'text-pink-400/70' },
  { icon: Layers, label: 'Assemble', color: 'from-amber-500/15 to-amber-500/5 border-amber-500/20', iconColor: 'text-amber-400/70' },
]

export function CreateTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-transparent border border-violet-500/20 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/5"
      >
        <Wand2 className="w-9 h-9 text-violet-400/50" />
      </motion.div>

      <h3 className="text-xl font-bold tracking-tight mb-2">Content Generation</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">
        Generate images, video, voice, music, and scripts — all automatically enriched with your brand identity.
      </p>

      {/* Generator preview grid */}
      <div className="grid grid-cols-3 gap-3 max-w-sm w-full">
        {GENERATORS.map((gen, i) => {
          const Icon = gen.icon
          return (
            <motion.div
              key={gen.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-gradient-to-br border ${gen.color} opacity-50 cursor-default`}
            >
              <Icon className={`w-5 h-5 ${gen.iconColor}`} />
              <span className="text-xs font-medium text-muted-foreground">{gen.label}</span>
            </motion.div>
          )
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/30 mt-6">Coming in Phase 2</p>
    </motion.div>
  )
}
