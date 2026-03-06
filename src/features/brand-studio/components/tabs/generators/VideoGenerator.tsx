'use client'

import { useState } from 'react'
import { Film, Sparkles, Loader2, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import { useGenerationStore } from '../../../hooks/useGenerationStore'
import { useActiveBrand } from '../../../hooks/useBrandStore'

const VIDEO_MODELS = [
  { value: 'seedance-lite', label: 'Seedance Lite', cost: 25, desc: 'Fast, good quality' },
  { value: 'seedance-pro', label: 'Seedance Pro', cost: 40, desc: 'Best quality, slower' },
]

const DURATIONS = [
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
]

export function VideoGenerator({ onBack }: { onBack: () => void }) {
  const brand = useActiveBrand()
  const { generateVideo, isGenerating, error, lastResult } = useGenerationStore()
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('seedance-lite')
  const [duration, setDuration] = useState(5)
  const [brandBoost, setBrandBoost] = useState(true)

  const hasBrandData = !!(brand?.visual_identity_json || brand?.visual_style_json)
  const selectedModel = VIDEO_MODELS.find(m => m.value === model)!

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return
    generateVideo({
      prompt: prompt.trim(),
      brandId: brand?.id,
      brandBoost: brandBoost && hasBrandData,
      model,
      duration,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Film className="w-4.5 h-4.5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">Video Generator</h3>
          <p className="text-xs text-muted-foreground">{selectedModel.cost} credits per video</p>
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
              placeholder="A cinematic brand reveal with logo animation..."
              className="min-h-[120px] resize-none bg-secondary/30 border-border/30 text-sm"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Model</Label>
            <div className="flex gap-2">
              {VIDEO_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setModel(m.value)}
                  className={cn(
                    'flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all border',
                    model === m.value
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                      : 'bg-secondary/20 border-border/20 text-muted-foreground hover:bg-secondary/40'
                  )}
                >
                  <div>{m.label}</div>
                  <div className="text-[10px] opacity-60">{m.cost} pts — {m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border',
                    duration === d.value
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                      : 'bg-secondary/20 border-border/20 text-muted-foreground hover:bg-secondary/40'
                  )}
                >
                  {d.label}
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
            className="w-full gap-2 bg-purple-600 hover:bg-purple-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Video ({selectedModel.cost} pts)
              </>
            )}
          </Button>
        </div>

        {/* Right: Result */}
        <div>
          {lastResult?.type === 'video' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 rounded-2xl border border-border/30 bg-secondary/10 text-center space-y-4"
            >
              {lastResult.status === 'pending' ? (
                <>
                  <Clock className="w-10 h-10 text-purple-400/50 mx-auto" />
                  <div>
                    <p className="text-sm font-medium">Video is being generated</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This takes 2-5 minutes. Check your gallery for the result.
                    </p>
                  </div>
                  <div className="text-[10px] text-muted-foreground/50 font-mono">{lastResult.predictionId}</div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-400/60 mx-auto" />
                  <p className="text-sm font-medium">Video ready!</p>
                </>
              )}
            </motion.div>
          ) : isGenerating ? (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-border/30 bg-secondary/10">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400/50 mx-auto" />
                <p className="text-sm text-muted-foreground/60">Submitting video request...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-border/30 bg-secondary/5">
              <div className="text-center space-y-2">
                <Film className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <p className="text-xs text-muted-foreground/40">Video result will appear here</p>
                <p className="text-[10px] text-muted-foreground/25">Videos generate asynchronously (2-5 min)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
