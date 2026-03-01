'use client'

import { Megaphone } from 'lucide-react'

export function CampaignsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-chart-5/10 flex items-center justify-center mb-4">
        <Megaphone className="w-8 h-8 text-chart-5/60" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Campaigns</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Build multi-asset campaigns across platforms. Coming in Phase 6.
      </p>
    </div>
  )
}
