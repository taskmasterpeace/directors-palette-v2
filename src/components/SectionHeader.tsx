'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TabValue } from '@/store/layout.store'

interface SectionHeaderProps {
  section: TabValue
  title?: string
  showBanner?: boolean
}

// Map section IDs to their banner images and default titles
const SECTION_CONFIG: Record<TabValue, { banner: string; title: string }> = {
  'shot-creator': {
    banner: '/banners/shot-creator-banner.webp',
    title: 'Shot Creator'
  },
  'shot-animator': {
    banner: '/banners/shot-animator-banner.webp',
    title: 'Shot Animator'
  },
  'layout-annotation': {
    banner: '/banners/canvas-editor-banner.webp',
    title: 'Canvas Editor'
  },
  'storyboard': {
    banner: '/banners/storyboard-banner.webp',
    title: 'Storyboard'
  },
  'music-lab': {
    banner: '/banners/music-lab-banner.webp',
    title: 'Music Lab'
  },
  'prompt-tools': {
    banner: '/banners/prompt-tools-banner.webp',
    title: 'Prompt Tools'
  },
  'gallery': {
    banner: '/banners/gallery-banner.webp',
    title: 'Gallery'
  },
  'community': {
    banner: '/banners/community-banner.webp',
    title: 'Community'
  },
  'help': {
    banner: '/banners/help-banner.webp',
    title: 'Help & Manual'
  }
}

export function SectionHeader({ section, title, showBanner = true }: SectionHeaderProps) {
  const config = SECTION_CONFIG[section]
  if (!config) return null

  const displayTitle = title || config.title

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative h-16 w-full overflow-hidden flex-shrink-0"
    >
      {/* Banner Background */}
      {showBanner && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${config.banner})`,
            filter: 'brightness(0.4) saturate(0.8)'
          }}
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-background/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

      {/* Content */}
      <div className="relative h-full flex items-center px-6 z-10">
        <div className="flex items-center gap-3">
          {/* Gradient Accent Line */}
          <div className="h-8 w-1 rounded-full overflow-hidden">
            <motion.div
              className="h-full w-full bg-gradient-to-b from-violet-500 via-fuchsia-500 to-amber-500"
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

          {/* Title */}
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            {displayTitle}
          </h1>
        </div>
      </div>

      {/* Bottom Border Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
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
          <div className="h-4 w-0.5 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />
          <span className="text-sm font-medium text-muted-foreground">
            {displayTitle}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
