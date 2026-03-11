'use client'

import { useState, useRef } from 'react'
import { Music2, Sparkles, Loader2, Download, ArrowLeft, Play, Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import { useGenerationStore } from '../../../hooks/useGenerationStore'
import { useActiveBrand } from '../../../hooks/useBrandStore'

const DURATIONS = [
  { value: 15, label: '15s', desc: 'Short clip' },
  { value: 30, label: '30s', desc: 'Standard' },
  { value: 60, label: '60s', desc: 'Full track' },
]

export function MusicGenerator({ onBack }: { onBack: () => void }) {
  const brand = useActiveBrand()
  const { generateMusic, isGenerating, error, lastResult } = useGenerationStore()
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(30)
  const [instrumental, setInstrumental] = useState(true)
  const [brandBoost, setBrandBoost] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const hasBrandData = !!brand?.music_json

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return
    generateMusic({
      prompt: prompt.trim(),
      brandId: brand?.id,
      brandBoost: brandBoost && hasBrandData,
      duration,
      instrumental,
    })
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
          <Music2 className="w-4.5 h-4.5 text-fuchsia-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">Music Generator</h3>
          <p className="text-xs text-muted-foreground">15 pts per track</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Describe the music</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Upbeat corporate background music with subtle synths and positive energy..."
              className="min-h-[120px] resize-none bg-secondary/30 border-border/30 text-sm"
            />
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
                      ? 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300'
                      : 'bg-secondary/20 border-border/20 text-muted-foreground hover:bg-secondary/40'
                  )}
                >
                  <div>{d.label}</div>
                  <div className="text-[10px] opacity-60">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Instrumental Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/20">
            <div>
              <p className="text-xs font-medium">Instrumental Only</p>
              <p className="text-[10px] text-muted-foreground">No vocals, background music only</p>
            </div>
            <Switch checked={instrumental} onCheckedChange={setInstrumental} />
          </div>

          {/* Brand Boost */}
          {hasBrandData && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <p className="text-xs font-medium">Brand Boost</p>
                  <p className="text-[10px] text-muted-foreground">Use brand genre, mood & BPM</p>
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
            className="w-full gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Music (15 pts)
              </>
            )}
          </Button>
        </div>

        {/* Right: Result */}
        <div>
          {lastResult?.type === 'music' && lastResult.url ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="p-6 rounded-2xl border border-border/30 bg-gradient-to-br from-fuchsia-500/5 to-transparent">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center hover:bg-fuchsia-500/30 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-fuchsia-300" />
                    ) : (
                      <Play className="w-6 h-6 text-fuchsia-300 ml-0.5" />
                    )}
                  </button>
                </div>
                <audio
                  ref={audioRef}
                  src={lastResult.url}
                  onEnded={() => setIsPlaying(false)}
                />
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
                <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400/50 mx-auto" />
                <p className="text-sm text-muted-foreground/60">Generating music...</p>
                <p className="text-[10px] text-muted-foreground/30">This takes 30-90 seconds</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-border/30 bg-secondary/5">
              <div className="text-center space-y-2">
                <Music2 className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <p className="text-xs text-muted-foreground/40">Your music will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
