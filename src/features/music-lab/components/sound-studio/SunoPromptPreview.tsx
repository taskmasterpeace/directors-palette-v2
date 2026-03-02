'use client'

import { Copy, Check, FileText } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { energyToLabel } from '@/features/music-lab/types/sound-studio.types'

function SectionBadge({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <div className="space-y-1">
      <p className={`text-[9px] font-medium uppercase tracking-wider ${color}`}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border border-[oklch(0.28_0.03_55)]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export function SunoPromptPreview() {
  const { sunoPrompt, promptCharCount, settings } = useSoundStudioStore()
  const [copied, setCopied] = useState(false)

  const charColor =
    promptCharCount === 0
      ? 'text-[oklch(0.45_0.03_55)]'
      : promptCharCount < 500
        ? 'text-emerald-400'
        : promptCharCount < 800
          ? 'text-yellow-400'
          : 'text-red-400'

  const charBgColor =
    promptCharCount === 0
      ? 'bg-[oklch(0.25_0.03_55)]'
      : promptCharCount < 500
        ? 'bg-emerald-500/10'
        : promptCharCount < 800
          ? 'bg-yellow-500/10'
          : 'bg-red-500/10'

  const handleCopy = useCallback(async () => {
    if (!sunoPrompt) return
    try {
      await navigator.clipboard.writeText(sunoPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = sunoPrompt
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [sunoPrompt])

  const hasNegativeTags = settings.negativeTags.length > 0

  // Check if there's any content to show breakdown
  const hasBreakdown =
    settings.genres.length > 0 ||
    settings.moods.length > 0 ||
    settings.drumDesign.length > 0 ||
    settings.grooveFeel.length > 0 ||
    settings.bassStyle.length > 0 ||
    settings.synthTexture.length > 0 ||
    settings.harmonyColor.length > 0 ||
    settings.spaceFx.length > 0 ||
    settings.earCandy.length > 0 ||
    settings.instruments.length > 0 ||
    settings.productionTags.length > 0

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Suno Prompt
        </h3>

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${charBgColor} ${charColor}`}>
            {promptCharCount}/1000
          </span>
          <button
            onClick={handleCopy}
            disabled={!sunoPrompt}
            className="p-1.5 rounded-lg hover:bg-[oklch(0.28_0.03_55)] transition-colors disabled:opacity-30"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-[oklch(0.55_0.04_55)]" />
            )}
          </button>
        </div>
      </div>

      {/* Section breakdown */}
      {hasBreakdown && (
        <div className="p-3 rounded-[0.625rem] border border-[oklch(0.25_0.025_55)] bg-[oklch(0.17_0.015_55)] space-y-2">
          <SectionBadge label="Genre" items={[...settings.genres, ...settings.subgenres, ...settings.microgenres]} color="text-amber-400/60" />
          {(settings.bpm || settings.key) && (
            <div className="flex gap-3">
              {settings.bpm && (
                <span className="text-[10px] font-mono text-[oklch(0.60_0.04_55)]">{settings.bpm} BPM</span>
              )}
              {settings.key && (
                <span className="text-[10px] font-mono text-cyan-400/70">{settings.key}</span>
              )}
              <span className="text-[10px] font-mono text-[oklch(0.50_0.04_55)]">{energyToLabel(settings.energy)}</span>
            </div>
          )}
          <SectionBadge label="Mood" items={settings.moods} color="text-blue-400/60" />
          <SectionBadge label="Drums" items={settings.drumDesign} color="text-rose-400/60" />
          <SectionBadge label="Groove" items={settings.grooveFeel} color="text-emerald-400/60" />
          <SectionBadge label="Bass" items={settings.bassStyle} color="text-orange-400/60" />
          <SectionBadge label="Synth" items={settings.synthTexture} color="text-purple-400/60" />
          <SectionBadge label="Harmony" items={settings.harmonyColor} color="text-cyan-400/60" />
          <SectionBadge label="Space/FX" items={settings.spaceFx} color="text-blue-400/60" />
          <SectionBadge label="Ear Candy" items={settings.earCandy} color="text-pink-400/60" />
          <SectionBadge label="Instruments" items={settings.instruments} color="text-amber-400/60" />
          <SectionBadge label="Production" items={settings.productionTags} color="text-[oklch(0.55_0.04_55)]" />
        </div>
      )}

      {/* Raw prompt */}
      <div className="p-3 rounded-[0.625rem] border border-[oklch(0.30_0.03_55)] bg-[oklch(0.15_0.015_55)]">
        {sunoPrompt ? (
          <pre className="text-xs font-mono text-[oklch(0.78_0.02_55)] leading-relaxed whitespace-pre-wrap break-words">
            {sunoPrompt}
          </pre>
        ) : (
          <p className="text-xs font-mono text-[oklch(0.40_0.03_55)] italic">
            Configure settings to generate prompt...
          </p>
        )}

        {/* Negative tags */}
        {hasNegativeTags && (
          <div className="mt-2 pt-2 border-t border-[oklch(0.25_0.025_55)]">
            <p className="text-[9px] uppercase tracking-wider text-[oklch(0.40_0.03_55)] mb-1">
              Negative tags
            </p>
            <div className="flex flex-wrap gap-1">
              {settings.negativeTags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[oklch(0.50_0.03_55)] bg-[oklch(0.20_0.02_55)] border border-[oklch(0.25_0.025_55)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
