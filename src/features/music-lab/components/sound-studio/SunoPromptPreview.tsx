'use client'

import { Copy, Check, FileText, Sparkles } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { energyToLabel } from '@/features/music-lab/types/sound-studio.types'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { GenerationDrawer } from '../generation/GenerationDrawer'

function SectionBadge({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <div className="space-y-1">
      <p className={`text-[9px] font-medium uppercase tracking-wider ${color}`}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/20 text-foreground/80 border border-border/60"
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
  const [beatTitle, setBeatTitle] = useState('')
  const { generate, isGenerating } = useGenerateMusic()
  const activeArtist = useArtistDnaStore((s) => s.activeArtist)

  const handleGenerate = useCallback(() => {
    if (!activeArtist || !sunoPrompt) return

    generate({
      mode: 'instrumental',
      artistId: activeArtist,
      title: beatTitle || 'Untitled Beat',
      stylePrompt: sunoPrompt,
      lyricsPrompt: '',
      excludePrompt: settings.negativeTags.join(', '),
    })
  }, [activeArtist, sunoPrompt, beatTitle, settings.negativeTags, generate])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  const charColor =
    promptCharCount === 0
      ? 'text-muted-foreground/60'
      : promptCharCount < 500
        ? 'text-emerald-400'
        : promptCharCount < 800
          ? 'text-yellow-400'
          : 'text-red-400'

  const charBgColor =
    promptCharCount === 0
      ? 'bg-muted/30'
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
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Suno Prompt
        </h3>

        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${charBgColor} ${charColor}`}>
            {promptCharCount}/1000
          </span>
          <button
            onClick={handleCopy}
            disabled={!sunoPrompt}
            className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors disabled:opacity-30"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Section breakdown */}
      {hasBreakdown && (
        <div className="p-3 rounded-[0.625rem] border border-border/60 bg-background space-y-2">
          <SectionBadge label="Genre" items={[...settings.genres, ...settings.subgenres, ...settings.microgenres]} color="text-amber-400/60" />
          {(settings.bpm !== null || settings.key || settings.energy !== null) && (
            <div className="flex gap-3">
              {settings.bpm !== null && (
                <span className="text-[10px] font-mono text-muted-foreground">{settings.bpm} BPM</span>
              )}
              {settings.key && (
                <span className="text-[10px] font-mono text-cyan-400/70">{settings.key}</span>
              )}
              {settings.energy !== null && (
                <span className="text-[10px] font-mono text-muted-foreground">{energyToLabel(settings.energy)}</span>
              )}
            </div>
          )}
          <SectionBadge label="Mood" items={settings.moods} color="text-blue-400/60" />
          <SectionBadge label="Drums" items={settings.drumDesign} color="text-rose-400/60" />
          <SectionBadge label="Groove" items={settings.grooveFeel} color="text-emerald-400/60" />
          <SectionBadge label="Bass" items={settings.bassStyle} color="text-orange-400/60" />
          <SectionBadge label="Synth" items={settings.synthTexture} color="text-cyan-400/60" />
          <SectionBadge label="Harmony" items={settings.harmonyColor} color="text-cyan-400/60" />
          <SectionBadge label="Space/FX" items={settings.spaceFx} color="text-blue-400/60" />
          <SectionBadge label="Ear Candy" items={settings.earCandy} color="text-pink-400/60" />
          <SectionBadge label="Instruments" items={settings.instruments} color="text-amber-400/60" />
          <SectionBadge label="Production" items={settings.productionTags} color="text-muted-foreground" />
        </div>
      )}

      {/* Raw prompt */}
      <div className="p-3 rounded-[0.625rem] border border-border bg-background">
        {sunoPrompt ? (
          <pre className="text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
            {sunoPrompt}
          </pre>
        ) : (
          <p className="text-xs font-mono text-muted-foreground/60 italic">
            Configure settings to generate prompt...
          </p>
        )}

        {/* Negative tags */}
        {hasNegativeTags && (
          <div className="mt-2 pt-2 border-t border-border/60">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 mb-1">
              Negative tags
            </p>
            <div className="flex flex-wrap gap-1">
              {settings.negativeTags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-card border border-border/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Beat title input */}
      <div>
        <input
          type="text"
          value={beatTitle}
          onChange={(e) => setBeatTitle(e.target.value)}
          placeholder="Beat title (optional)"
          className="w-full rounded-[0.625rem] border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
        />
      </div>

      {/* Generate Beat button */}
      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={!activeArtist || isGenerating || !sunoPrompt}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-[0.625rem] bg-cyan-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isGenerating ? 'Generating...' : 'Generate Beat — 12 pts'}
        </button>
        <button
          onClick={handleCopy}
          disabled={!sunoPrompt}
          className="shrink-0 p-2 rounded-[0.625rem] border border-border hover:bg-muted/40 transition-colors disabled:opacity-30"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Generation Drawer */}
      <GenerationDrawer onRegenerate={handleRegenerate} />
    </div>
  )
}
