'use client'

import React from 'react'
import { BarChart3 } from 'lucide-react'

export function QualityPhase() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
      <BarChart3 className="w-12 h-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Quality Phase</p>
      <p className="text-sm">Grade all prompts across 5 dimensions.</p>
    </div>
  )
}
