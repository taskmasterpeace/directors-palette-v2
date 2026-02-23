'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import { TabValue } from '@/store/layout.store'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SectionHeaderProps {
  section: TabValue
  title?: string
  showBanner?: boolean
}

// Map section IDs to their banner images, titles, subtitles, and help content
// Using new cinematic detailed banners generated with flux-dev
const SECTION_CONFIG: Record<TabValue, { banner: string; title: string; subtitle?: string; helpTip?: string }> = {
  'shot-creator': {
    banner: '/banners/shot-creator.webp',
    title: 'Shot Creator',
    subtitle: 'Generate images with advanced prompting syntax',
    helpTip: 'Use [brackets] for variations, | pipes for sequences, and _wildcards_ for random picks'
  },
  'shot-animator': {
    banner: '/banners/shot-animator.webp',
    title: 'Shot Animator',
    subtitle: 'Transform images into videos',
    helpTip: 'Upload or select an image to animate with AI-powered video generation'
  },
  'layout-annotation': {
    banner: '/banners/canvas-editor.webp',
    title: 'Canvas Editor',
    subtitle: 'Annotate and edit your images',
    helpTip: 'Draw, add text, shapes, and annotations to your images for storyboards'
  },
  'node-workflow': {
    banner: '/banners/shot-creator.webp',
    title: 'Node Workflow',
    subtitle: 'Build complex generation pipelines visually',
    helpTip: 'Drag nodes onto the canvas, connect them, and execute workflows to generate images'
  },
  'storyboard': {
    banner: '/banners/storyboard.webp',
    title: 'Storyboard',
    subtitle: 'Turn stories into visual sequences',
    helpTip: '6-step workflow: paste story, set style, define characters, break into shots, generate'
  },
  'storybook': {
    banner: '/banners/storybook-banner.webp',
    title: 'Storybook',
    subtitle: 'Turn stories into illustrated pages',
    helpTip: '5-step wizard: write story, choose style, create characters, generate pages, preview book'
  },
  'music-lab': {
    banner: '/banners/music-lab.webp',
    title: 'Music Lab',
    subtitle: 'Artist Lab, Writing Studio & Music Video',
    helpTip: 'Create artists, write lyrics, and build music video treatments'
  },
  'ad-lab': {
    banner: '/banners/adhub.webp',
    title: 'Ad Lab',
    subtitle: 'Generate, grade, and refine video ad prompt matrices',
    helpTip: '5-phase workflow: brief → 12 prompts → grading → refinement → image/video generation'
  },
  'adhub': {
    banner: '/banners/adhub.webp',
    title: 'Adhub',
    subtitle: 'Generate branded static ad images',
    helpTip: 'Create ads using brands, templates, and styles in a guided 5-step wizard'
  },
  'prompt-tools': {
    banner: '/banners/prompt-tools.webp',
    title: 'Prompt Tools',
    subtitle: 'Manage your prompt library, wildcards, recipes, and styles',
    helpTip: 'Create reusable prompts, wildcards for randomization, and recipe templates'
  },
  'gallery': {
    banner: '/banners/gallery.webp',
    title: 'Gallery',
    subtitle: 'Browse and manage your generations',
    helpTip: 'View all generated images, organize into folders, and export'
  },
  'community': {
    banner: '/banners/community.webp',
    title: 'Community',
    subtitle: 'Discover and share wildcards, recipes, prompts, and directors',
    helpTip: 'Browse community submissions, add to your library, and share your own creations'
  },
  'help': {
    banner: '/banners/help.webp',
    title: 'Help & Manual',
    subtitle: 'Learn how to use Director\'s Palette',
    helpTip: 'Comprehensive guide to all features and workflows'
  }
}

export function SectionHeader({ section, title, showBanner = true }: SectionHeaderProps) {
  const config = SECTION_CONFIG[section]
  const isMobile = useIsMobile()
  if (!config) return null

  const displayTitle = title || config.title

  // On mobile, show a minimal header (no banner, shorter height)
  if (isMobile) {
    return (
      <div className="relative h-12 w-full flex items-center px-4 border-b border-border/50 bg-background/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-gradient-to-b from-amber-400 via-orange-500 to-red-500" />
          <h1 className="text-lg font-semibold text-foreground">{displayTitle}</h1>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative h-16 w-full overflow-hidden flex-shrink-0"
    >
      {/* Banner Background - More visible */}
      {showBanner && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${config.banner})`,
            filter: 'brightness(0.65) saturate(1.1)'
          }}
        />
      )}

      {/* Gradient Overlay - Reduced for better visibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/30 to-background/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />

      {/* Content */}
      <div className="relative h-full flex items-center px-6 z-10">
        <div className="flex items-center gap-3 flex-1">
          {/* Help Icon with Tooltip */}
          {config.helpTip && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button className="p-1.5 rounded-full bg-background/50 hover:bg-background/80 transition-colors">
                    <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">{config.helpTip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Gradient Accent Line - Warm tones */}
          <div className="h-8 w-1 rounded-full overflow-hidden">
            <motion.div
              className="h-full w-full bg-gradient-to-b from-amber-400 via-orange-500 to-red-500"
              animate={{
                backgroundPosition: ['0% 0%', '0% 100%', '0% 0%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ backgroundSize: '100% 200%' }}
            />
          </div>

          {/* Title & Subtitle */}
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {displayTitle}
            </h1>
            {config.subtitle && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {config.subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Border Gradient - Warm tones */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
    </motion.div>
  )
}

// Compact version for inline use (40px height)
export function SectionHeaderCompact({ section, title }: Omit<SectionHeaderProps, 'showBanner'>) {
  const config = SECTION_CONFIG[section]
  if (!config) return null

  const displayTitle = title || config.title

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative h-10 w-full overflow-hidden flex-shrink-0 border-b border-border/50"
    >
      {/* Subtle Banner Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage: `url(${config.banner})`,
        }}
      />

      {/* Content */}
      <div className="relative h-full flex items-center px-4 z-10">
        <div className="flex items-center gap-2">
          <div className="h-4 w-0.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <span className="text-sm font-medium text-muted-foreground">
            {displayTitle}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
