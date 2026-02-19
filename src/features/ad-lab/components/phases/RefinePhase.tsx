'use client'

import React from 'react'
import { RefreshCw } from 'lucide-react'

export function RefinePhase() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
      <RefreshCw className="w-12 h-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Refine Phase</p>
      <p className="text-sm">Iteratively fix failing prompts.</p>
    </div>
  )
}
