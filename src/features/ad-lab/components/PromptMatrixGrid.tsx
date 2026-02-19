'use client'

import React from 'react'
import { PromptCard } from './PromptCard'
import type { AdPrompt, AdAspectRatio, AdDuration } from '../types/ad-lab.types'

interface PromptMatrixGridProps {
  prompts: AdPrompt[]
}

const DURATIONS: AdDuration[] = ['5s', '15s', '30s']
const RATIOS: AdAspectRatio[] = ['16:9', '9:16']

export function PromptMatrixGrid({ prompts }: PromptMatrixGridProps) {
  const getCell = (ratio: AdAspectRatio, duration: AdDuration) =>
    prompts.filter(p => p.aspectRatio === ratio && p.duration === duration)

  return (
    <div className="space-y-4">
      {/* Column Headers */}
      <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3">
        <div /> {/* empty corner */}
        {DURATIONS.map((dur) => (
          <div key={dur} className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {dur}
          </div>
        ))}
      </div>

      {/* Rows */}
      {RATIOS.map((ratio) => (
        <div key={ratio} className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3">
          {/* Row Header */}
          <div className="flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground writing-mode-vertical-lr rotate-0">
              {ratio}
            </span>
          </div>

          {/* Cells */}
          {DURATIONS.map((dur) => {
            const cellPrompts = getCell(ratio, dur)
            return (
              <div key={`${ratio}-${dur}`} className="space-y-2">
                {cellPrompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
                {cellPrompts.length === 0 && (
                  <div className="border border-dashed border-border/30 rounded-lg p-4 text-center text-xs text-muted-foreground">
                    No prompt
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
