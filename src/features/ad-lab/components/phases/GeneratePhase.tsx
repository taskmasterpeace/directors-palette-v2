'use client'

import React from 'react'
import { Video } from 'lucide-react'

export function GeneratePhase() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
      <Video className="w-12 h-12 text-muted-foreground/50" />
      <p className="text-lg font-medium">Generate Phase</p>
      <p className="text-sm">Produce images and videos from approved prompts.</p>
    </div>
  )
}
