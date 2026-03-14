'use client'

import { useState, useRef, useCallback } from 'react'
import { useMerchLabStore } from '../hooks'
import { cn } from '@/utils/utils'
import { Sparkles, Loader2, Plus, X, Banana, Hexagon } from 'lucide-react'
import type { QualityTier, DesignModel } from '../types'
import { useWildcardAutocomplete } from '@/shared/hooks/useWildcardAutocomplete'
import { WildcardAutocomplete } from '@/shared/components/WildcardAutocomplete'

const MODEL_OPTIONS: { id: DesignModel; label: string; desc: string }[] = [
  { id: 'ideogram', label: 'Ideogram V3', desc: 'Great text rendering' },
  { id: 'nano-banana', label: 'Nano Banana', desc: 'Sharp edges, 4K native' },
]

const QUALITY_TIERS: Record<DesignModel, { id: QualityTier; label: string; ptsPerImage: number }[]> = {
  ideogram: [
    { id: 'turbo', label: 'Quick', ptsPerImage: 20 },
    { id: 'balanced', label: 'Standard', ptsPerImage: 24 },
    { id: 'quality', label: 'Premium', ptsPerImage: 28 },
  ],
  'nano-banana': [
    { id: 'turbo', label: '1K', ptsPerImage: 13 },
    { id: 'balanced', label: '2K', ptsPerImage: 20 },
    { id: 'quality', label: '4K', ptsPerImage: 30 },
  ],
}

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
  const designModel = useMerchLabStore((s) => s.designModel)
  const setDesignModel = useMerchLabStore((s) => s.setDesignModel)
  const qualityTier = useMerchLabStore((s) => s.qualityTier)
  const setQualityTier = useMerchLabStore((s) => s.setQualityTier)
  const batchCount = useMerchLabStore((s) => s.batchCount)
  const setBatchCount = useMerchLabStore((s) => s.setBatchCount)
  const isGenerating = useMerchLabStore((s) => s.isGenerating)
  const setIsGenerating = useMerchLabStore((s) => s.setIsGenerating)
  const addDesigns = useMerchLabStore((s) => s.addDesigns)
  const setError = useMerchLabStore((s) => s.setError)

  const [showColors, setShowColors] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Wildcard autocomplete
  const wildcardAC = useWildcardAutocomplete({
    textareaRef,
    value: prompt,
    onChange: setPrompt,
  })
  const [wcDropdownPos, setWcDropdownPos] = useState({ top: 0, left: 0, width: 400 })

  const calcWcPos = useCallback(() => {
    if (!textareaRef.current) return
    const rect = textareaRef.current.getBoundingClientRect()
    const isMobile = window.innerWidth < 768
    setWcDropdownPos({
      top: isMobile ? Math.max(rect.top - 310, 10) : rect.bottom + 4,
      left: Math.max(rect.left, 10),
      width: rect.width,
    })
  }, [])

  const handleKeyUp = useCallback(() => {
    wildcardAC.detectTrigger()
    calcWcPos()
  }, [wildcardAC, calcWcPos])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    wildcardAC.handleKeyDown(e)
  }, [wildcardAC])

  const tiers = QUALITY_TIERS[designModel]
  const tierConfig = tiers.find((t) => t.id === qualityTier) ?? tiers[1]
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
          designModel,
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

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyUp={handleKeyUp}
          onKeyDown={handleKeyDown}
          placeholder="A fierce cyberpunk dragon breathing neon fire... Use _wildcard_ for random entries"
          className="w-full rounded-[10px] border border-border/30 bg-card/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
          rows={3}
        />
        {wildcardAC.isOpen && wildcardAC.flatItems.length > 0 && (
          <WildcardAutocomplete
            groups={wildcardAC.filteredGroups}
            selectedIndex={wildcardAC.selectedIndex}
            onSelect={wildcardAC.selectWildcard}
            onHover={wildcardAC.setSelectedIndex}
            position={wcDropdownPos}
          />
        )}
      </div>

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
                    selected ? 'border-amber-500 scale-110' : 'border-border/30 hover:border-border/60',
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

      {/* Model Selector */}
      <div className="mt-3">
        <div className="mb-1.5 text-[10px] text-muted-foreground/40">AI Model</div>
        <div className="flex gap-1">
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => setDesignModel(m.id)}
              className={cn(
                'flex-1 rounded-md border px-2 py-1.5 text-left transition-all',
                designModel === m.id
                  ? 'border-amber-500 bg-amber-500/15'
                  : 'border-border/30 hover:border-amber-500/30'
              )}
            >
              <div className={cn(
                'flex items-center gap-1.5 text-[11px] font-medium',
                designModel === m.id ? 'text-amber-400' : 'text-muted-foreground/70'
              )}>
                {m.id === 'ideogram' ? <Hexagon className="h-3 w-3" /> : <Banana className="h-3 w-3" />}
                {m.label}
              </div>
              <div className="text-[9px] text-muted-foreground/40 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quality + Batch */}
      <div className="mt-3 flex gap-3">
        {/* Quality Tier */}
        <div className="flex-1">
          <div className="mb-1.5 text-[10px] text-muted-foreground/40">
            {designModel === 'ideogram' ? 'Quality' : 'Resolution'}
          </div>
          <div className="flex gap-1">
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setQualityTier(tier.id)}
                className={cn(
                  'flex-1 rounded-md border px-2 py-1 text-[10px] transition-all',
                  qualityTier === tier.id
                    ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                    : 'border-border/30 text-muted-foreground/60 hover:border-amber-500/30'
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
                    ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                    : 'border-border/30 text-muted-foreground/60 hover:border-amber-500/30'
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
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
