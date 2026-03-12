'use client'

import { useState } from 'react'
import { useMerchLabStore } from '../hooks'
import { cn } from '@/utils/utils'
import { Sparkles, Loader2, Plus, X } from 'lucide-react'
import type { QualityTier } from '../types'

const QUALITY_TIERS: { id: QualityTier; label: string; ptsPerImage: number }[] = [
  { id: 'turbo', label: 'Quick', ptsPerImage: 6 },
  { id: 'balanced', label: 'Standard', ptsPerImage: 8 },
  { id: 'quality', label: 'Premium', ptsPerImage: 11 },
]

const BATCH_OPTIONS = [1, 3, 5] as const

const PRESET_COLORS = [
  { name: 'Red', hex: '#EF4444' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Green', hex: '#22C55E' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#000000' },
  { name: 'Gold', hex: '#F59E0B' },
  { name: 'Silver', hex: '#94A3B8' },
]

export function DesignPrompt() {
  const prompt = useMerchLabStore((s) => s.prompt)
  const setPrompt = useMerchLabStore((s) => s.setPrompt)
  const designColors = useMerchLabStore((s) => s.designColors)
  const setDesignColors = useMerchLabStore((s) => s.setDesignColors)
  const qualityTier = useMerchLabStore((s) => s.qualityTier)
  const setQualityTier = useMerchLabStore((s) => s.setQualityTier)
  const batchCount = useMerchLabStore((s) => s.batchCount)
  const setBatchCount = useMerchLabStore((s) => s.setBatchCount)
  const isGenerating = useMerchLabStore((s) => s.isGenerating)
  const setIsGenerating = useMerchLabStore((s) => s.setIsGenerating)
  const addDesigns = useMerchLabStore((s) => s.addDesigns)
  const setError = useMerchLabStore((s) => s.setError)

  const [showColors, setShowColors] = useState(false)

  const tierConfig = QUALITY_TIERS.find((t) => t.id === qualityTier)!
  const totalPts = tierConfig.ptsPerImage * batchCount

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const designStyle = useMerchLabStore.getState().designStyle

      const res = await fetch('/api/merch-lab/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          designStyle,
          designColors: designColors.length > 0 ? designColors : undefined,
          count: batchCount,
          qualityTier,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      const designs = data.designs.map((d: { id: string; url: string }) => ({
        id: d.id,
        url: d.url,
        prompt: prompt.trim(),
        createdAt: Date.now(),
      }))
      addDesigns(designs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleColor = (name: string) => {
    if (designColors.includes(name)) {
      setDesignColors(designColors.filter((c) => c !== name))
    } else if (designColors.length < 4) {
      setDesignColors([...designColors, name])
    }
  }

  return (
    <div className="p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        4. Describe Your Design
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="A fierce cyberpunk dragon breathing neon fire..."
        className="w-full rounded-[10px] border border-border/30 bg-card/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
        rows={3}
      />

      {/* Design Colors */}
      <div className="mt-3">
        <button
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <Plus className={cn('h-3 w-3 transition-transform', showColors && 'rotate-45')} />
          Design Colors {designColors.length > 0 && `(${designColors.length})`}
        </button>

        {showColors && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((color) => {
              const selected = designColors.includes(color.name)
              return (
                <button
                  key={color.name}
                  onClick={() => toggleColor(color.name)}
                  title={color.name}
                  className={cn(
                    'relative h-7 w-7 rounded-full border-2 transition-all',
                    selected ? 'border-cyan-500 scale-110' : 'border-border/30 hover:border-border/60',
                    color.name === 'White' && 'border-border/50'
                  )}
                  style={{ backgroundColor: color.hex }}
                >
                  {selected && (
                    <X className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {designColors.length > 0 && (
          <div className="mt-1.5 text-[10px] text-muted-foreground/40">
            Design will use: {designColors.join(', ')}
          </div>
        )}
      </div>

      {/* Quality + Batch */}
      <div className="mt-3 flex gap-3">
        {/* Quality Tier */}
        <div className="flex-1">
          <div className="mb-1.5 text-[10px] text-muted-foreground/40">Quality</div>
          <div className="flex gap-1">
            {QUALITY_TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setQualityTier(tier.id)}
                className={cn(
                  'flex-1 rounded-md border px-2 py-1 text-[10px] transition-all',
                  qualityTier === tier.id
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                    : 'border-border/30 text-muted-foreground/60 hover:border-cyan-500/30'
                )}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Count */}
        <div>
          <div className="mb-1.5 text-[10px] text-muted-foreground/40">Count</div>
          <div className="flex gap-1">
            {BATCH_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setBatchCount(n)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-[10px] transition-all',
                  batchCount === n
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                    : 'border-border/30 text-muted-foreground/60 hover:border-cyan-500/30'
                )}
              >
                {n}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating {batchCount > 1 ? `${batchCount} designs` : ''}...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate {batchCount > 1 ? `${batchCount} Designs` : 'Design'} — {totalPts} pts
          </>
        )}
      </button>
    </div>
  )
}
