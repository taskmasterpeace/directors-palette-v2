'use client'

import React from 'react'
import type { QuickMode } from '../../types/shot-creator.types'

interface QuickModePanelProps {
  mode: Exclude<QuickMode, 'none'>
}

const QUICK_MODE_CONTENT = {
  'style-transfer': {
    title: 'Style Transfer',
    description: 'First image sets the style, additional images get transformed',
  },
  'character-sheet': {
    title: 'Character Sheet',
    description: 'Add a reference image OR type a character description → 7-panel turnaround',
  },
}

export function QuickModePanel({ mode }: QuickModePanelProps) {
  const content = QUICK_MODE_CONTENT[mode]

  return (
    <div className="text-xs bg-primary/10 border border-primary/20 rounded p-2">
      <span className="font-medium">{content.title}:</span>{' '}
      <span className="text-muted-foreground">{content.description}</span>
    </div>
  )
}

export default QuickModePanel
