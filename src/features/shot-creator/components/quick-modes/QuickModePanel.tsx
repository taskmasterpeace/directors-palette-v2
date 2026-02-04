'use client'

import React from 'react'
import type { QuickMode } from '../../types/shot-creator.types'

interface QuickModePanelProps {
  mode: Exclude<QuickMode, 'none'>
}

const QUICK_MODE_CONTENT = {
  'style-transfer': {
    title: 'Style Sheet',
    description: 'Add style reference image, type "Style Name:" to label it (e.g. "Noir Grit:") → Generates 3×3 style guide',
  },
  'character-sheet': {
    title: 'Character Sheet',
    description: 'Add image OR type "Name: description" (e.g. Marcus: hand drawn black man)',
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
