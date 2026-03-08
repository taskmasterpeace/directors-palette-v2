'use client'

import { Image as ImageIcon, Film, Mic2, Music2, FileText, Layers, Lock, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/utils'
import { useGenerationStore, type GeneratorType } from '../../hooks/useGenerationStore'
import { useActiveBrand } from '../../hooks/useBrandStore'
import { ImageGenerator } from './generators/ImageGenerator'
import { VideoGenerator } from './generators/VideoGenerator'
import { VoiceGenerator } from './generators/VoiceGenerator'
import { MusicGenerator } from './generators/MusicGenerator'

const GENERATORS: {
  id: GeneratorType | 'script' | 'assemble'
  icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
  cost: string
  color: string
  iconColor: string
  disabled?: boolean
}[] = [
  { id: 'image', icon: ImageIcon, label: 'Image', desc: 'Brand photos & graphics', cost: '10 pts', color: 'from-violet-500/15 to-violet-500/5 border-violet-500/25 hover:border-violet-500/40', iconColor: 'text-violet-400' },
  { id: 'video', icon: Film, label: 'Video', desc: 'Brand video clips', cost: '25+ pts', color: 'from-cyan-500/15 to-cyan-500/5 border-cyan-500/25 hover:border-cyan-500/40', iconColor: 'text-cyan-400' },
  { id: 'voice', icon: Mic2, label: 'Voice', desc: 'Brand voiceovers', cost: '5 pts', color: 'from-indigo-500/15 to-indigo-500/5 border-indigo-500/25 hover:border-indigo-500/40', iconColor: 'text-indigo-400' },
  { id: 'music', icon: Music2, label: 'Music', desc: 'Brand music tracks', cost: '15 pts', color: 'from-fuchsia-500/15 to-fuchsia-500/5 border-fuchsia-500/25 hover:border-fuchsia-500/40', iconColor: 'text-fuchsia-400' },
  { id: 'script', icon: FileText, label: 'Script', desc: 'Ad scripts & copy', cost: '—', color: 'from-pink-500/10 to-pink-500/3 border-border/15', iconColor: 'text-muted-foreground/30', disabled: true },
  { id: 'assemble', icon: Layers, label: 'Assemble', desc: 'Merge media assets', cost: '—', color: 'from-amber-500/10 to-amber-500/3 border-border/15', iconColor: 'text-muted-foreground/30', disabled: true },
]

export function CreateTab() {
  const { activeGenerator, setActiveGenerator } = useGenerationStore()
  const brand = useActiveBrand()

  const handleBack = () => setActiveGenerator(null)

  return (
    <AnimatePresence mode="wait">
      {activeGenerator ? (
        <motion.div
          key={activeGenerator}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeGenerator === 'image' && <ImageGenerator onBack={handleBack} />}
          {activeGenerator === 'video' && <VideoGenerator onBack={handleBack} />}
          {activeGenerator === 'voice' && <VoiceGenerator onBack={handleBack} />}
          {activeGenerator === 'music' && <MusicGenerator onBack={handleBack} />}
        </motion.div>
      ) : (
        <motion.div
          key="picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Brand context banner */}
          {brand && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/20 border border-border/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Generating for <span className="font-medium text-foreground">{brand.name}</span> — Brand Boost will auto-inject your brand identity into prompts.
              </p>
            </div>
          )}

          {/* Generator Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {GENERATORS.map((gen, i) => {
              const Icon = gen.icon
              return (
                <motion.button
                  key={gen.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  onClick={() => !gen.disabled && setActiveGenerator(gen.id as GeneratorType)}
                  disabled={gen.disabled}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br border transition-all duration-200',
                    gen.color,
                    gen.disabled
                      ? 'opacity-40 cursor-default'
                      : 'cursor-pointer hover:shadow-lg hover:shadow-black/10 hover:scale-[1.02] active:scale-[0.98]'
                  )}
                >
                  {gen.disabled && (
                    <Lock className="absolute top-3 right-3 w-3 h-3 text-muted-foreground/20" />
                  )}
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', gen.disabled ? 'bg-secondary/20' : 'bg-background/40 border border-white/5')}>
                    <Icon className={cn('w-5.5 h-5.5', gen.iconColor)} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">{gen.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{gen.desc}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    gen.disabled
                      ? 'bg-secondary/20 text-muted-foreground/30'
                      : 'bg-background/30 text-muted-foreground/70'
                  )}>
                    {gen.cost}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
