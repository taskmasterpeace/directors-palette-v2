'use client'

import { useState } from 'react'
import { Image as ImageIcon, Sparkles, Loader2, Download, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import { useGenerationStore } from '../../../hooks/useGenerationStore'
import { useActiveBrand } from '../../../hooks/useBrandStore'

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1', desc: 'Square' },
  { value: '9:16', label: '9:16', desc: 'Portrait' },
  { value: '16:9', label: '16:9', desc: 'Landscape' },
  { value: '4:5', label: '4:5', desc: 'Instagram' },
]

export function ImageGenerator({ onBack }: { onBack: () => void }) {
  const brand = useActiveBrand()
  const { generateImage, isGenerating, error, lastResult } = useGenerationStore()
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [brandBoost, setBrandBoost] = useState(true)

  const hasBrandData = !!(brand?.visual_identity_json || brand?.visual_style_json)

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return
    generateImage({
      prompt: prompt.trim(),
      brandId: brand?.id,
      brandBoost: brandBoost && hasBrandData,
      aspectRatio,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <ImageIcon className="w-4.5 h-4.5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">Image Generator</h3>
          <p className="text-xs text-muted-foreground">10 pts per image</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A vibrant brand hero image with abstract shapes..."
              className="min-h-[120px] resize-none bg-secondary/30 border-border/30 text-sm"
            />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border',
                    aspectRatio === ar.value
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                      : 'bg-secondary/20 border-border/20 text-muted-foreground hover:bg-secondary/40'
                  )}
                >
                  <div>{ar.label}</div>
                  <div className="text-[10px] opacity-60">{ar.desc}</div>
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
                  <p className="text-[10px] text-muted-foreground">Auto-inject brand colors & style</p>
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
            disabled={!prompt.trim() || isGenerating}
            className="w-full gap-2 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Image (10 pts)
              </>
            )}
          </Button>
        </div>

        {/* Right: Result */}
        <div>
          {lastResult?.type === 'image' && lastResult.url ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
                <img src={lastResult.url} alt="Generated image" className="w-full object-contain" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{lastResult.creditsUsed} pts used</span>
                <a href={lastResult.url} download target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Download className="w-3 h-3" />
                    Download
                  </Button>
                </a>
              </div>
            </motion.div>
          ) : isGenerating ? (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-border/30 bg-secondary/10">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400/50 mx-auto" />
                <p className="text-sm text-muted-foreground/60">Generating image...</p>
                <p className="text-[10px] text-muted-foreground/30">This takes 10-30 seconds</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-border/30 bg-secondary/5">
              <div className="text-center space-y-2">
                <ImageIcon className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <p className="text-xs text-muted-foreground/40">Your image will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
