'use client'

import { useState, useEffect, useRef } from 'react'

/** Estimated generation time in seconds per model (measured averages) */
const MODEL_ESTIMATED_SECONDS: Record<string, number> = {
  'z-image-turbo': 2,
  'qwen-image-2512': 6,
  'nano-banana': 22,
  'seedream-4.5': 45,
  'seedream-5-lite': 49,
  'nano-banana-pro': 71,
  'riverflow-2-pro': 600,
}

/** Map model ID to a short display name */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'nano-banana': 'Nano Banana',
  'nano-banana-pro': 'Nano Banana Pro',
  'z-image-turbo': 'Z-Image Turbo',
  'qwen-image-2512': 'Qwen 2512',
  'seedream-4.5': 'Seedream 4.5',
  'seedream-5-lite': 'Seedream 5 Lite',
  'riverflow-2-pro': 'Riverflow Pro',
}

interface ClapperboardSpinnerProps {
  model: string
  prompt?: string
}

/**
 * Animated clapperboard loading indicator.
 * Shows progress bar, estimated countdown, and model name.
 * Handles overtime gracefully when generation exceeds the estimate.
 */
export function ClapperboardSpinner({ model, prompt }: ClapperboardSpinnerProps) {
  const estimatedSeconds = MODEL_ESTIMATED_SECONDS[model] ?? 12
  const displayName = MODEL_DISPLAY_NAMES[model] ?? model

  const startTimeRef = useRef(Date.now())
  const [progress, setProgress] = useState(0) // 0..1, can exceed 1
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    startTimeRef.current = Date.now()
    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000
      setElapsed(elapsedSec)
      setProgress(elapsedSec / estimatedSeconds)
    }, 500) // Update twice per second — smooth enough for a countdown
    return () => clearInterval(interval)
  }, [estimatedSeconds])

  const overtime = progress > 1
  const clamped = Math.min(1, progress)
  const remaining = Math.max(0, estimatedSeconds - elapsed)
  const overBy = Math.max(0, elapsed - estimatedSeconds)
  const pct = Math.round(clamped * 100)

  // Clapper animation: snaps open at start, then again in overtime
  let clapAngle = 0
  if (!overtime) {
    if (progress < 0.08) clapAngle = (progress / 0.08) * -28
    else if (progress < 0.16) clapAngle = -28 + ((progress - 0.08) / 0.08) * 28
  } else {
    clapAngle = Math.sin(Date.now() / 200) * -22
  }

  // Time display
  let timeText: string
  if (overtime) {
    const oMin = Math.floor(overBy / 60)
    const oSec = Math.floor(overBy % 60)
    timeText = `+${oMin}:${oSec.toString().padStart(2, '0')} over`
  } else {
    const rMin = Math.floor(remaining / 60)
    const rSec = Math.floor(remaining % 60)
    timeText = `${rMin}:${rSec.toString().padStart(2, '0')}`
  }

  // Overtime text cycling
  const overtimeMessages = ['Still working...', 'Almost there...', 'Hang tight...', 'Processing...']
  const overtimeMsg = overtimeMessages[Math.floor(Date.now() / 2500) % overtimeMessages.length]

  // Colors from Electric Amber theme
  const primary = 'oklch(0.75 0.16 75)'
  const accent = 'oklch(0.65 0.12 195)'
  const bg = 'oklch(0.12 0.015 250)'
  const surface = 'oklch(0.20 0.015 250)'
  const trackLight = 'oklch(0.30 0.025 250)'
  const text = 'oklch(0.93 0.01 80)'
  const textMuted = 'oklch(0.60 0.02 80)'
  const strokeColor = overtime ? accent : primary

  return (
    <div className="flex flex-col items-center gap-2 px-3">
      {/* Clapperboard SVG */}
      <svg width="100" height="90" viewBox="0 0 100 92" className="drop-shadow-lg">
        {/* Board body */}
        <rect x="10" y="35" width="80" height="52" rx="3"
          fill={surface} stroke={strokeColor} strokeWidth="2" />

        {/* Progress bar inside board */}
        <rect x="16" y="76" width="68" height="5" rx="2.5" fill={trackLight} />
        <rect x="16" y="76" width={68 * clamped} height="5" rx="2.5"
          fill={overtime ? accent : primary} />

        {/* Percentage text */}
        <text x="50" y="58" textAnchor="middle" fill={text}
          fontSize="16" fontWeight="700" fontFamily="system-ui">
          {pct}%
        </text>

        {/* Overtime subtext */}
        {overtime && (
          <text x="50" y="70" textAnchor="middle" fill={accent}
            fontSize="8" fontFamily="system-ui">
            {overtimeMsg}
          </text>
        )}

        {/* Clapper top (animated) */}
        <g transform={`rotate(${clapAngle} 10 35)`}>
          <rect x="10" y="20" width="80" height="16" rx="2"
            fill={trackLight} stroke={strokeColor} strokeWidth="1.5" />
          {/* Diagonal stripes */}
          {[0, 1, 2, 3, 4].map(i => (
            <rect key={i} x={14 + i * 16} y="20" width="8" height="16"
              fill={i % 2 === 0 ? bg : trackLight} rx="1" />
          ))}
        </g>
      </svg>

      {/* Time remaining */}
      <span
        className="text-xs font-bold tabular-nums"
        style={{ color: overtime ? accent : text }}
      >
        {timeText}
      </span>

      {/* Model name */}
      <span className="text-[10px] font-medium" style={{ color: primary }}>
        {displayName}
      </span>

      {/* Prompt preview */}
      {prompt && (
        <p
          className="text-[10px] text-center line-clamp-2 max-w-[180px] leading-tight"
          style={{ color: textMuted }}
        >
          {prompt.length > 70 ? prompt.slice(0, 70) + '...' : prompt}
        </p>
      )}
    </div>
  )
}
