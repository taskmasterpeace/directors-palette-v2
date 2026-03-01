'use client'

import { FolderOpen } from 'lucide-react'

export function LibraryTab() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <FolderOpen className="w-8 h-8 text-accent/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Asset Library</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Browse, search, and manage all your brand assets. Coming in Phase 4.
      </p>
    </div>
  )
}
