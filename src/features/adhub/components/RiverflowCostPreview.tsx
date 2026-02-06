'use client'

import { useAdhubStore } from '../store/adhub.store'
import { getModelCost } from '@/config'

export function RiverflowCostPreview() {
  const {
    selectedModel,
    riverflowSettings,
    riverflowFontUrls,
  } = useAdhubStore()

  // Only show for Riverflow
  if (selectedModel !== 'riverflow-2-pro') {
    return null
  }

  // Calculate base cost based on resolution
  const baseCost = getModelCost('riverflow-2-pro', riverflowSettings.resolution)
  const baseCostPts = Math.round(baseCost * 100)

  // Calculate font cost (5 pts per font)
  const fontCount = riverflowFontUrls.length
  const fontCostPts = fontCount * 5

  // Total cost
  const totalCostPts = baseCostPts + fontCostPts

  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Cost Breakdown</span>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {totalCostPts} pts
        </span>
      </div>

      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Base ({riverflowSettings.resolution})</span>
          <span>{baseCostPts} pts</span>
        </div>
        {fontCount > 0 && (
          <div className="flex justify-between">
            <span>{fontCount} font{fontCount > 1 ? 's' : ''} × 5 pts</span>
            <span>{fontCostPts} pts</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t font-medium text-foreground">
          <span>Total</span>
          <span>{totalCostPts} pts</span>
        </div>
      </div>
    </div>
  )
}
