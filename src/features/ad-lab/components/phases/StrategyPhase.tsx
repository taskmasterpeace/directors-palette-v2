'use client'

import React from 'react'
import { FileText } from 'lucide-react'

export function StrategyPhase() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
      <FileText className="w-12 h-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Strategy Phase</p>
      <p className="text-sm">Paste your creative brief to generate a mandate.</p>
    </div>
  )
}
