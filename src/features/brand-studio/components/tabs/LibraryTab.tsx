'use client'

import { Image as ImageIcon, Film, Music2, Upload } from 'lucide-react'
import { motion } from 'framer-motion'

export function LibraryTab() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center relative"
    >
      {/* Grid pattern background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating asset type icons */}
      <div className="relative w-32 h-32 mb-8">
        <motion.div
          animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          className="absolute top-0 left-0 w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500/15 to-teal-500/5 border border-teal-500/20 flex items-center justify-center shadow-lg shadow-teal-500/5"
        >
          <ImageIcon className="w-6 h-6 text-teal-400/60" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -6, 0], rotate: [2, -2, 2] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-2 right-0 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center shadow-lg shadow-cyan-500/5"
        >
          <Film className="w-6 h-6 text-cyan-400/60" />
        </motion.div>
        <motion.div
          animate={{ y: [0, -5, 0], rotate: [-2, 4, -2] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-0 left-8 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5"
        >
          <Music2 className="w-6 h-6 text-emerald-400/60" />
        </motion.div>
      </div>

      <h3 className="text-xl font-bold tracking-tight mb-2">Asset Library</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        Browse, search, and manage all your brand assets. Drag and drop to upload, tag for easy discovery.
      </p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/40 border border-dashed border-border/30 rounded-xl px-5 py-3">
        <Upload className="w-4 h-4" />
        <span>Drop files here — coming in Phase 4</span>
      </div>
    </motion.div>
  )
}
