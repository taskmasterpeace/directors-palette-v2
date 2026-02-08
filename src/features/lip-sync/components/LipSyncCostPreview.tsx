'use client'

import React from 'react'
import { Coins, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/utils/utils'
import type { LipSyncModel, LipSyncResolution } from '../types/lip-sync.types'
import { calculateLipSyncCost, getLipSyncModelConfig } from '../config/lip-sync-models.config'
import { formatDuration, formatCost } from '../services/lip-sync-generation.service'

interface LipSyncCostPreviewProps {
  model: LipSyncModel
  resolution: LipSyncResolution
  durationSeconds: number | null
  className?: string
  showBreakdown?: boolean
}

export function LipSyncCostPreview({
  model,
  resolution,
  durationSeconds,
  className,
  showBreakdown = false,
}: LipSyncCostPreviewProps) {
  const config = getLipSyncModelConfig(model)
  const cost = durationSeconds ? calculateLipSyncCost(model, durationSeconds, resolution) : 0
  const pricePerSecond = config.pricingPerSecond[resolution]

  if (!durationSeconds) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50',
        className
      )}>
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Upload audio to see cost estimate
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      'p-3 bg-amber-500/10 rounded-lg border border-amber-500/20',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-amber-400">{formatCost(cost)}</span>
          <span className="text-sm text-muted-foreground">
            for {formatDuration(durationSeconds)} video
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>{config.displayName}</span>
        </div>
      </div>

      {showBreakdown && (
        <div className="mt-2 pt-2 border-t border-amber-500/20 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Rate:</span>
            <span>{pricePerSecond} pts/sec @ {resolution}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{durationSeconds.toFixed(1)}s</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface LipSyncBatchCostPreviewProps {
  items: Array<{
    id: string
    name: string
    durationSeconds: number
    selected: boolean
  }>
  model: LipSyncModel
  resolution: LipSyncResolution
  className?: string
}

export function LipSyncBatchCostPreview({
  items,
  model,
  resolution,
  className,
}: LipSyncBatchCostPreviewProps) {
  const selectedItems = items.filter(item => item.selected)
  const totalDuration = selectedItems.reduce((sum, item) => sum + item.durationSeconds, 0)
  const totalCost = calculateLipSyncCost(model, totalDuration, resolution)

  return (
    <div className={cn(
      'p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Selected: {selectedItems.length} of {items.length}</span>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-amber-400">{formatCost(totalCost)}</span>
        </div>
      </div>

      <div className="space-y-1">
        {items.map(item => {
          const itemCost = calculateLipSyncCost(model, item.durationSeconds, resolution)
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center justify-between text-sm py-1',
                !item.selected && 'opacity-50'
              )}
            >
              <span className={cn(
                'truncate',
                item.selected ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {item.name} ({formatDuration(item.durationSeconds)})
              </span>
              <span className={cn(
                item.selected ? 'text-amber-400' : 'text-muted-foreground'
              )}>
                {formatCost(itemCost)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
