'use client'

import React from 'react'
import { Grid3X3 } from 'lucide-react'

export function ExecutionPhase() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
      <Grid3X3 className="w-12 h-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Execution Phase</p>
      <p className="text-sm">Generate 12 ad prompts from your mandate.</p>
    </div>
  )
}
