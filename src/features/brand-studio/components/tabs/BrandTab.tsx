'use client'

import { Palette, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useActiveBrand, useBrandStore } from '../../hooks/useBrandStore'
import { BrandGuideHero } from './sections/BrandGuideHero'
import { ColorsSection } from './sections/ColorsSection'
import { TypographySection } from './sections/TypographySection'
import { VoiceSection } from './sections/VoiceSection'
import { AudienceSection } from './sections/AudienceSection'
import { VisualStyleSection } from './sections/VisualStyleSection'
import { MusicSection } from './sections/MusicSection'

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } }
}
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } }
}

export function BrandTab() {
  const brand = useActiveBrand()
  const { updateBrand, generateBrandGuide, isGeneratingGuide, isSaving } = useBrandStore()

  if (!brand) {
    return <EmptyBrandState />
  }

  const handleRegenerate = () => {
    generateBrandGuide(brand.id, brand.logo_url, brand.raw_company_info || brand.name)
  }

  return (
    <motion.div className="space-y-5 pb-8" variants={stagger} initial="initial" animate="animate">
      {/* Hero: Logo + Brand Guide Image */}
      <motion.div variants={fadeUp}>
        <BrandGuideHero brand={brand} isGenerating={isGeneratingGuide} onRegenerate={handleRegenerate} />
      </motion.div>

      {/* Numbered Sections */}
      <motion.div variants={fadeUp}>
        <ColorsSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <TypographySection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <VoiceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <AudienceSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <VisualStyleSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <MusicSection brand={brand} onSave={updateBrand} isSaving={isSaving} />
      </motion.div>

    </motion.div>
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
