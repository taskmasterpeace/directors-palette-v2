'use client'

import { Wand2 } from 'lucide-react'

export function CreateTab() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Wand2 className="w-8 h-8 text-primary/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Content Generation</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Generate images, video, voice, music, and scripts — all on-brand. Coming in Phase 2.
      </p>
    </div>
  )
}
