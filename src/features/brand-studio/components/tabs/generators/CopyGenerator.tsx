'use client'

import { useState, useRef, useMemo } from 'react'
import { PenLine, Sparkles, Loader2, ArrowLeft, Copy, Check, ChevronDown, Search, Zap, ImageIcon, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import { useGenerationStore } from '../../../hooks/useGenerationStore'
import { useActiveBrand } from '../../../hooks/useBrandStore'
import { AD_APPROACHES, APPROACH_CATEGORIES, type AdApproach } from '../../../data/ad-approaches'

const OUTPUT_TYPES = [
  { value: 'full-campaign', label: 'Full Campaign', desc: 'Headline + hook + body + tagline + variants' },
  { value: 'headlines-only', label: 'Headlines Only', desc: '10 headline variations' },
  { value: 'social-post', label: 'Social Post', desc: 'Platform-ready social copy' },
  { value: 'video-script', label: 'Video Script', desc: '15-30s ad script with visual directions' },
]

const AD_CARD_RATIOS = [
  { value: '1:1', label: '1:1', desc: 'Square' },
  { value: '9:16', label: '9:16', desc: 'Story/Reel' },
  { value: '16:9', label: '16:9', desc: 'Landscape' },
  { value: '4:5', label: '4:5', desc: 'Instagram' },
]

const APPROACH_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/25', text: 'text-rose-400', dot: 'bg-rose-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400', dot: 'bg-orange-400' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/25', text: 'text-pink-400', dot: 'bg-pink-400' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/25', text: 'text-slate-400', dot: 'bg-slate-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/25', text: 'text-amber-400', dot: 'bg-amber-400' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/25', text: 'text-teal-400', dot: 'bg-teal-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/25', text: 'text-purple-400', dot: 'bg-purple-400' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/25', text: 'text-violet-400', dot: 'bg-violet-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-400', dot: 'bg-blue-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/25', text: 'text-green-400', dot: 'bg-green-400' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400', dot: 'bg-red-400' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', text: 'text-indigo-400', dot: 'bg-indigo-400' },
  lime: { bg: 'bg-lime-500/10', border: 'border-lime-500/25', text: 'text-lime-400', dot: 'bg-lime-400' },
  sky: { bg: 'bg-sky-500/10', border: 'border-sky-500/25', text: 'text-sky-400', dot: 'bg-sky-400' },
  fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/25', text: 'text-fuchsia-400', dot: 'bg-fuchsia-400' },
  zinc: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/25', text: 'text-zinc-400', dot: 'bg-zinc-400' },
}

function getColors(color: string) {
  return APPROACH_COLORS[color] || APPROACH_COLORS.slate
}

/** Extract structured sections from generated copy markdown */
function parseCopySections(text: string): { headline: string; hook: string; body: string; tagline: string } {
  const sections: Record<string, string> = {}
  let currentSection = ''

  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      currentSection = line.slice(3).trim().toLowerCase()
    } else if (currentSection && line.trim() && !line.startsWith('#')) {
      sections[currentSection] = (sections[currentSection] || '') + line.trim() + ' '
    }
  }

  return {
    headline: (sections['headline'] || '').trim(),
    hook: (sections['hook'] || '').trim(),
    body: (sections['body copy'] || sections['body'] || '').trim(),
    tagline: (sections['tagline'] || '').trim(),
  }
}

export function CopyGenerator({ onBack }: { onBack: () => void }) {
  const brand = useActiveBrand()
  const { generateCopy, isGenerating, error, lastResult } = useGenerationStore()
  const [prompt, setPrompt] = useState('')
  const [selectedApproach, setSelectedApproach] = useState<AdApproach | null>(null)
  const [outputType, setOutputType] = useState('full-campaign')
  const [brandBoost, setBrandBoost] = useState(true)
  const [showApproachPicker, setShowApproachPicker] = useState(false)
  const [approachSearch, setApproachSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  // Ad card generation state
  const [adCardRatio, setAdCardRatio] = useState('1:1')
  const [isGeneratingAdCard, setIsGeneratingAdCard] = useState(false)
  const [adCardUrl, setAdCardUrl] = useState<string | null>(null)
  const [adCardError, setAdCardError] = useState<string | null>(null)

  const hasBrandData = !!(brand?.voice_json || brand?.audience_json)
  const hasBrandGuide = !!brand?.brand_guide_image_url

  // Parse structured sections from generated copy
  const parsedCopy = useMemo(() => {
    if (!lastResult?.text) return null
    return parseCopySections(lastResult.text)
  }, [lastResult?.text])

  const handleGenerate = () => {
    if (!prompt.trim() || !selectedApproach || isGenerating) return
    setAdCardUrl(null)
    setAdCardError(null)
    generateCopy({
      prompt: prompt.trim(),
      brandId: brand?.id,
      brandBoost: brandBoost && hasBrandData,
      approachId: selectedApproach.id,
      outputType,
    })
  }

  const handleCopy = async () => {
    if (!lastResult?.text) return
    await navigator.clipboard.writeText(lastResult.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateAdCard = async () => {
    if (!parsedCopy?.headline || !brand?.id || isGeneratingAdCard) return
    setIsGeneratingAdCard(true)
    setAdCardError(null)
    setAdCardUrl(null)

    try {
      const res = await fetch('/api/brand-studio/generate/ad-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: parsedCopy.headline,
          hook: parsedCopy.hook,
          tagline: parsedCopy.tagline,
          brandId: brand.id,
          aspectRatio: adCardRatio,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ad card generation failed')
      setAdCardUrl(data.url)
    } catch (e: unknown) {
      setAdCardError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsGeneratingAdCard(false)
    }
  }

  // Filter approaches
  const filteredApproaches = AD_APPROACHES.filter(a => {
    const matchesSearch = !approachSearch ||
      a.name.toLowerCase().includes(approachSearch.toLowerCase()) ||
      a.expert.toLowerCase().includes(approachSearch.toLowerCase()) ||
      a.bestFor.toLowerCase().includes(approachSearch.toLowerCase())
    const matchesCategory = !activeCategory ||
      APPROACH_CATEGORIES.find(c => c.id === activeCategory)?.approachIds.includes(a.id)
    return matchesSearch && matchesCategory
  })

  // Brand colors for visual preview
  const brandColors = brand?.visual_identity_json?.colors || []
  const primaryColor = brandColors.find(c => c.role === 'primary')?.hex || '#e11d90'
  const bgColor = brandColors.find(c => c.role === 'background')?.hex || '#0a0a0a'
  const textColor = brandColors.find(c => c.role === 'text')?.hex || '#ffffff'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <PenLine className="w-4.5 h-4.5 text-pink-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">Copy Generator</h3>
          <p className="text-xs text-muted-foreground">5 pts per generation &middot; 21 advertising approaches</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Approach Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Advertising Approach</Label>
            <button
              onClick={() => setShowApproachPicker(!showApproachPicker)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                selectedApproach
                  ? `${getColors(selectedApproach.color).bg} ${getColors(selectedApproach.color).border}`
                  : 'bg-secondary/20 border-border/30 hover:border-border/50'
              )}
            >
              {selectedApproach ? (
                <>
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', getColors(selectedApproach.color).dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedApproach.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{selectedApproach.expert} &middot; {selectedApproach.bestFor}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Choose an approach...</p>
                </div>
              )}
              <ChevronDown className={cn('w-4 h-4 text-muted-foreground/50 transition-transform', showApproachPicker && 'rotate-180')} />
            </button>
          </div>

          {/* Approach Picker Dropdown */}
          <AnimatePresence>
            {showApproachPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-border/30 bg-secondary/10 overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-border/20">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                      <input
                        type="text"
                        value={approachSearch}
                        onChange={(e) => setApproachSearch(e.target.value)}
                        placeholder="Search approaches..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/30 border-none text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
                      />
                    </div>
                  </div>

                  {/* Category Tabs */}
                  <div className="flex gap-1 p-2 border-b border-border/20 overflow-x-auto">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors',
                        !activeCategory ? 'bg-pink-500/15 text-pink-400' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      All
                    </button>
                    {APPROACH_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-colors',
                          activeCategory === cat.id ? 'bg-pink-500/15 text-pink-400' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Approach List */}
                  <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-1">
                    {filteredApproaches.map(approach => {
                      const colors = getColors(approach.color)
                      const isSelected = selectedApproach?.id === approach.id
                      return (
                        <button
                          key={approach.id}
                          onClick={() => {
                            setSelectedApproach(approach)
                            setShowApproachPicker(false)
                            setApproachSearch('')
                          }}
                          className={cn(
                            'w-full flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all',
                            isSelected
                              ? `${colors.bg} ${colors.border} border`
                              : 'hover:bg-secondary/30 border border-transparent'
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', colors.dot)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold truncate">{approach.name}</span>
                              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', colors.bg, colors.text)}>
                                {approach.bestFor}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{approach.expert}</p>
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5 line-clamp-2">{approach.corePrinciple}</p>
                          </div>
                        </button>
                      )
                    })}
                    {filteredApproaches.length === 0 && (
                      <div className="py-6 text-center text-xs text-muted-foreground/40">No approaches match your search</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Brief / Prompt */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Your Brief</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your product, audience, and what you want to communicate. E.g.: 'A premium cold brew coffee brand targeting remote workers who want to feel productive without the crash...'"
              className="min-h-[120px] resize-none bg-secondary/30 border-border/30 text-sm"
            />
          </div>

          {/* Output Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Output Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {OUTPUT_TYPES.map(ot => (
                <button
                  key={ot.value}
                  onClick={() => setOutputType(ot.value)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-medium transition-all border text-left',
                    outputType === ot.value
                      ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                      : 'bg-secondary/20 border-border/20 text-muted-foreground hover:bg-secondary/40'
                  )}
                >
                  <div>{ot.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{ot.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Boost */}
          {hasBrandData && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <p className="text-xs font-medium">Brand Boost</p>
                  <p className="text-[10px] text-muted-foreground">Inject brand voice, audience &amp; tone</p>
                </div>
              </div>
              <Switch checked={brandBoost} onCheckedChange={setBrandBoost} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || !selectedApproach || isGenerating}
            className="w-full gap-2 bg-pink-600 hover:bg-pink-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing copy...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Copy (5 pts)
              </>
            )}
          </Button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {lastResult?.type === 'copy' && lastResult.text ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Visual Preview Card */}
              {parsedCopy?.headline && (
                <div
                  className="relative rounded-2xl overflow-hidden border border-border/20 shadow-xl shadow-black/20"
                  style={{ background: `linear-gradient(135deg, ${bgColor} 0%, ${primaryColor}22 100%)` }}
                >
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `radial-gradient(circle at 30% 20%, ${primaryColor}40 0%, transparent 60%), radial-gradient(circle at 80% 80%, ${primaryColor}20 0%, transparent 50%)`
                  }} />
                  <div className="relative p-6 sm:p-8 space-y-3">
                    {brand?.name && (
                      <div className="flex items-center gap-2 mb-4">
                        {brand.logo_url && (
                          <img src={brand.logo_url} alt="" className="w-6 h-6 rounded object-contain" />
                        )}
                        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: primaryColor }}>
                          {brand.name}
                        </span>
                      </div>
                    )}
                    <h2
                      className="text-xl sm:text-2xl font-black leading-tight tracking-tight"
                      style={{ color: textColor }}
                    >
                      {parsedCopy.headline}
                    </h2>
                    {parsedCopy.hook && (
                      <p className="text-sm leading-relaxed opacity-70" style={{ color: textColor }}>
                        {parsedCopy.hook}
                      </p>
                    )}
                    {parsedCopy.tagline && (
                      <div className="pt-3 mt-3 border-t" style={{ borderColor: `${primaryColor}30` }}>
                        <p className="text-xs font-semibold tracking-wide" style={{ color: primaryColor }}>
                          {parsedCopy.tagline}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generate Ad Card Section */}
              {parsedCopy?.headline && brand?.id && (
                <div className="rounded-xl border border-border/20 bg-secondary/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold">Generate Visual Ad Card</span>
                    {hasBrandGuide && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Brand guide as reference
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">
                    Nano Banana will create a visual ad using your headline, brand colors{hasBrandGuide ? ', and brand guide as style reference' : ''}.
                  </p>

                  {/* Aspect Ratio */}
                  <div className="flex gap-1.5">
                    {AD_CARD_RATIOS.map(ar => (
                      <button
                        key={ar.value}
                        onClick={() => setAdCardRatio(ar.value)}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all border',
                          adCardRatio === ar.value
                            ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                            : 'bg-secondary/20 border-border/15 text-muted-foreground/50 hover:bg-secondary/40'
                        )}
                      >
                        <div>{ar.label}</div>
                        <div className="text-[9px] opacity-50">{ar.desc}</div>
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerateAdCard}
                    disabled={isGeneratingAdCard}
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs h-9"
                  >
                    {isGeneratingAdCard ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating ad card...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5" />
                        Generate Ad Card (10 pts)
                      </>
                    )}
                  </Button>

                  {adCardError && (
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
                      {adCardError}
                    </div>
                  )}
                </div>
              )}

              {/* Generated Ad Card Image */}
              <AnimatePresence>
                {(adCardUrl || isGeneratingAdCard) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {adCardUrl ? (
                      <div className="space-y-2">
                        <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
                          <img src={adCardUrl} alt="Generated ad card" className="w-full object-contain" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">10 pts used</span>
                          <a href={adCardUrl} download target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                              <Download className="w-3 h-3" />
                              Download
                            </Button>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 rounded-2xl border border-dashed border-violet-500/20 bg-violet-500/5">
                        <div className="text-center space-y-2">
                          <Loader2 className="w-8 h-8 animate-spin text-violet-400/40 mx-auto" />
                          <p className="text-xs text-muted-foreground/50">Creating visual ad card...</p>
                          <p className="text-[10px] text-muted-foreground/30">10-30 seconds</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Copy Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-xs font-medium">Full Copy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{lastResult.creditsUsed} pts</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-7"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <div
                  ref={resultRef}
                  className="rounded-2xl border border-border/30 bg-secondary/10 p-5 max-h-[400px] overflow-y-auto shadow-lg shadow-black/10"
                >
                  <div className="prose prose-invert prose-sm max-w-none
                    prose-headings:text-pink-300 prose-headings:font-bold prose-headings:tracking-tight
                    prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:first:mt-0
                    prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1
                    prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm
                    prose-strong:text-foreground
                    prose-li:text-sm prose-li:text-muted-foreground
                  ">
                    <CopyContent text={lastResult.text} />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isGenerating ? (
            <div className="flex items-center justify-center h-80 rounded-2xl border border-dashed border-border/30 bg-secondary/10">
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-12 h-12">
                  <Loader2 className="w-12 h-12 animate-spin text-pink-400/30" />
                  <PenLine className="w-5 h-5 text-pink-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="text-sm text-muted-foreground/60">Writing your copy...</p>
                <p className="text-[10px] text-muted-foreground/30">
                  {selectedApproach ? `Using ${selectedApproach.name}` : 'Generating...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-border/30 bg-secondary/5">
              <PenLine className="w-8 h-8 text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground/40 mb-1">Your ad copy will appear here</p>
              <p className="text-[10px] text-muted-foreground/25">Select an approach and write your brief to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Simple markdown-to-JSX renderer for the copy output */
function CopyContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++}>{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++}>{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++}>{line.slice(2)}</h1>)
    } else if (line.trim() === '') {
      elements.push(<br key={key++} />)
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      const rendered = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return part
      })
      elements.push(<p key={key++}>{rendered}</p>)
    }
  }

  return <>{elements}</>
}
