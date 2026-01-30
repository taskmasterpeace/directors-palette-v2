'use client'

import { memo } from 'react'
import { cn } from '@/utils/utils'
import type { GeneratedImage } from '../../store/unified-gallery-store'

type ImageSource = GeneratedImage['source']

interface SourceBadgeProps {
  source: ImageSource
  className?: string
}

const SOURCE_CONFIG: Record<ImageSource, { label: string; icon: string; bgColor: string; textColor: string }> = {
  'adhub': {
    label: 'Adhub',
    icon: '📣',
    bgColor: 'bg-purple-500/80',
    textColor: 'text-white',
  },
  'storybook': {
    label: 'Storybook',
    icon: '📖',
    bgColor: 'bg-amber-500/80',
    textColor: 'text-white',
  },
  'storyboard': {
    label: 'Storyboard',
    icon: '🎬',
    bgColor: 'bg-blue-500/80',
    textColor: 'text-white',
  },
  'shot-creator': {
    label: 'Shot Creator',
    icon: '📸',
    bgColor: 'bg-emerald-500/80',
    textColor: 'text-white',
  },
  'shot-animator': {
    label: 'Animator',
    icon: '🎥',
    bgColor: 'bg-rose-500/80',
    textColor: 'text-white',
  },
  'layout-annotation': {
    label: 'Layout',
    icon: '📐',
    bgColor: 'bg-cyan-500/80',
    textColor: 'text-white',
  },
}

const SourceBadgeComponent = ({ source, className }: SourceBadgeProps) => {
  // Don't show badge for shot-creator (default)
  if (source === 'shot-creator') {
    return null
  }

  const config = SOURCE_CONFIG[source]
  if (!config) return null

  return (
    <div
      className={cn(
        'absolute bottom-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  )
}

export const SourceBadge = memo(SourceBadgeComponent)
