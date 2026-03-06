'use client'

import { useState } from 'react'
import { Palette, Sparkles, Eye, Mic2, Music2, BookImage, RefreshCw, Loader2, ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { useActiveBrand, useBrandStore } from '../../hooks/useBrandStore'
import { BrandGuideHero } from './sections/BrandGuideHero'
import { BrandScoreRing } from './sections/BrandScoreRing'
import { ColorsSection } from './sections/ColorsSection'
import { TypographySection } from './sections/TypographySection'
import { VoiceSection } from './sections/VoiceSection'
import { AudienceSection } from './sections/AudienceSection'
import { VisualStyleSection } from './sections/VisualStyleSection'
import { MusicSection } from './sections/MusicSection'

type BrandSubTab = 'visual' | 'voice' | 'audio' | 'guide'

const SUB_TABS: { id: BrandSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'visual', label: 'Visual Identity', icon: Eye },
  { id: 'voice', label: 'Voice & Messaging', icon: Mic2 },
  { id: 'audio', label: 'Audio', icon: Music2 },
  { id: 'guide', label: 'Brand Guide', icon: BookImage },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export function BrandTab() {
  const brand = useActiveBrand()
  const { updateBrand, generateBrandGuide, isGeneratingGuide, isSaving } = useBrandStore()
  const [activeSubTab, setActiveSubTab] = useState<BrandSubTab>('visual')

  if (!brand) {
    return <EmptyBrandState />
  }

  const handleRegenerate = () => {
    generateBrandGuide(brand.id, brand.logo_url, brand.raw_company_info || brand.name)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero: Compact Brand Banner */}
      <motion.div {...fadeUp}>
        <BrandGuideHero brand={brand} />
      </motion.div>

      {/* Brand Score */}
      <motion.div {...fadeUp} transition={{ delay: 0.05 }}>
        <BrandScoreRing brand={brand} />
      </motion.div>

      {/* Sub-Tab Navigation */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl border border-border/20 w-fit">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-background shadow-sm text-foreground border border-border/30'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Sub-Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'visual' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ColorsSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
                <TypographySection brand={brand} onSave={updateBrand} isSaving={isSaving} />
              </div>
              <VisualStyleSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
            </div>
          )}

          {activeSubTab === 'voice' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <VoiceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
              <AudienceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
            </div>
          )}

          {activeSubTab === 'audio' && (
            <MusicSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
          )}

          {activeSubTab === 'guide' && (
            <BrandGuideTab
              brand={brand}
              isGenerating={isGeneratingGuide}
              onRegenerate={handleRegenerate}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function BrandGuideTab({ brand, isGenerating, onRegenerate }: {
  brand: { name: string; brand_guide_image_url: string | null }
  isGenerating: boolean
  onRegenerate: () => void
}) {
  if (brand.brand_guide_image_url) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
          <img src={brand.brand_guide_image_url} alt={`${brand.name} brand guide`} className="w-full object-contain" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-background/90 backdrop-blur-md border border-border/40 shadow-lg"
                onClick={onRegenerate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                Regenerate Guide (15 pts)
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-20 rounded-2xl border border-dashed border-border/30 bg-secondary/10">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50 mx-auto" />
          <p className="text-sm text-muted-foreground/60">Generating brand guide image...</p>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={onRegenerate}
      className="w-full flex flex-col items-center justify-center gap-3 py-20 rounded-2xl border border-dashed border-border/30 bg-secondary/5 hover:bg-secondary/15 hover:border-border/50 transition-all duration-200 cursor-pointer group/gen"
    >
      <ImageIcon className="w-8 h-8 text-muted-foreground/30 group-hover/gen:text-primary/60 transition-colors" />
      <span className="text-sm text-muted-foreground/50 group-hover/gen:text-muted-foreground transition-colors">
        Generate Visual Brand Guide (15 pts)
      </span>
      <span className="text-xs text-muted-foreground/30">
        AI creates a visual identity sheet from your brand data
      </span>
    </button>
  )
}

function EmptyBrandState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 text-center relative"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full border border-primary/5 absolute" />
        <div className="w-48 h-48 rounded-full border border-primary/8 absolute" />
        <div className="w-32 h-32 rounded-full border border-primary/10 absolute" />
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center mb-6 shadow-lg shadow-primary/5"
      >
        <Palette className="w-9 h-9 text-primary/50" />
      </motion.div>

      <h3 className="text-xl font-bold tracking-tight mb-2">No Brand Selected</h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        Create a new brand to get started. Upload a logo and describe your brand — AI will generate a complete visual identity guide.
      </p>
      <Button className="gap-2 shadow-lg shadow-primary/10" size="sm">
        <Sparkles className="w-4 h-4" />
        Create Your First Brand
      </Button>
    </motion.div>
  )
}
