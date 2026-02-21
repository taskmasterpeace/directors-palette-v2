'use client'

import React, { useState } from 'react'
import { cn } from '@/utils/utils'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import type { AdPrompt, AdDuration } from '../types/ad-lab.types'

interface PromptCardProps {
  prompt: AdPrompt
}

const VARIANT_COLORS = {
  A: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  B: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const RATIO_COLORS = {
  '16:9': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  '9:16': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const DURATION_COLORS = {
  '5s': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  '15s': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  '30s': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
}

const DURATION_DISPLAY: Record<AdDuration, string> = {
  '5s': '5s Bumper',
  '15s': '15s Mid-Roll',
  '30s': '30s Full Spot',
}

function formatPromptForCopy(prompt: AdPrompt): string {
  const parts: string[] = []

  parts.push(`[${prompt.aspectRatio}] [${DURATION_DISPLAY[prompt.duration]}] [Variant ${prompt.variant}]`)
  parts.push('')
  parts.push('OPENING FRAME:')
  parts.push(prompt.openingFrame)
  parts.push('')
  parts.push('FULL PROMPT:')
  parts.push(prompt.fullPrompt)

  if (prompt.beatTimings.length > 0) {
    parts.push('')
    parts.push('BEAT TIMINGS:')
    prompt.beatTimings.forEach((beat, i) => {
      parts.push(`  ${i + 1}. ${beat}`)
    })
  }

  parts.push('')
  parts.push('CAMERA WORK:')
  parts.push(prompt.cameraWork)

  if (prompt.textOverlays.length > 0) {
    parts.push('')
    parts.push('TEXT OVERLAYS:')
    prompt.textOverlays.forEach((overlay) => {
      parts.push(`  [${overlay.timestamp}] ${overlay.text}`)
    })
  }

  parts.push('')
  parts.push('CTA PLACEMENT:')
  parts.push(prompt.ctaPlacement)

  return parts.join('\n')
}

export function PromptCard({ prompt }: PromptCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(formatPromptForCopy(prompt))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = formatPromptForCopy(prompt)
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="border border-border/50 rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
      {/* Collapsed View */}
      <div className="flex items-start">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left p-3 flex items-start gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground line-clamp-2">{prompt.openingFrame}</p>
            <div className="flex gap-1.5 mt-2">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', RATIO_COLORS[prompt.aspectRatio])}>
                {prompt.aspectRatio}
              </span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', DURATION_COLORS[prompt.duration])}>
                {DURATION_DISPLAY[prompt.duration]}
              </span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', VARIANT_COLORS[prompt.variant])}>
                {prompt.variant}
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          )}
        </button>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="p-3 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title="Copy prompt"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Prompt</span>
            <p className="text-sm mt-1">{prompt.fullPrompt}</p>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Beat Timings</span>
            <ul className="mt-1 space-y-0.5">
              {prompt.beatTimings.map((beat, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">{i + 1}</span>
                  {beat}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Camera Work</span>
              <p className="text-xs mt-1">{prompt.cameraWork}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CTA Placement</span>
              <p className="text-xs mt-1">{prompt.ctaPlacement}</p>
            </div>
          </div>

          {prompt.textOverlays.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Text Overlays</span>
              <div className="mt-1 space-y-1">
                {prompt.textOverlays.map((overlay, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground font-mono">{overlay.timestamp}</span>
                    <span>{overlay.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
