'use client'

import { useState, useRef } from 'react'
import { Mic2, Sparkles, Loader2, Download, ArrowLeft, Play, Pause } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/utils/utils'
import { useGenerationStore } from '../../../hooks/useGenerationStore'
import { useActiveBrand } from '../../../hooks/useBrandStore'

const VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'Deep, warm male' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Clear female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'Well-rounded male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', desc: 'Soft female' },
]

export function VoiceGenerator({ onBack }: { onBack: () => void }) {
  const brand = useActiveBrand()
  const { generateVoice, isGenerating, error, lastResult } = useGenerationStore()
  const [text, setText] = useState('')
  const [voiceId, setVoiceId] = useState(VOICES[0].id)
  const [brandBoost, setBrandBoost] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const hasBrandData = !!brand?.voice_json

  const handleGenerate = () => {
    if (!text.trim() || isGenerating) return
    generateVoice({
      text: text.trim(),
      brandId: brand?.id,
      brandBoost: brandBoost && hasBrandData,
      voiceId,
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
        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Mic2 className="w-4.5 h-4.5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">Voice Generator</h3>
          <p className="text-xs text-muted-foreground">5 credits per voiceover</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Text */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Text to speak</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Welcome to our brand. We believe in crafting exceptional experiences..."
              className="min-h-[140px] resize-none bg-secondary/30 border-border/30 text-sm"
            />
            <p className="text-[10px] text-muted-foreground/40">{text.length} characters</p>
          </div>

          {/* Voice Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Voice</Label>
            <div className="grid grid-cols-2 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoiceId(v.id)}
                  className={cn(
                    'py-2 px-3 rounded-lg text-xs font-medium transition-all border text-left',
                    voiceId === v.id
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : 'bg-secondary/20 border-border/20 text-muted-foreground hover:bg-secondary/40'
                  )}
                >
                  <div>{v.name}</div>
                  <div className="text-[10px] opacity-60">{v.desc}</div>
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
                  <p className="text-[10px] text-muted-foreground">Adjust voice to brand tone</p>
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
            disabled={!text.trim() || isGenerating}
            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Voice (5 pts)
              </>
            )}
          </Button>
        </div>

        {/* Right: Result */}
        <div>
          {lastResult?.type === 'voice' && lastResult.url ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="p-6 rounded-2xl border border-border/30 bg-gradient-to-br from-indigo-500/5 to-transparent">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center hover:bg-indigo-500/30 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-indigo-300" />
                    ) : (
                      <Play className="w-6 h-6 text-indigo-300 ml-0.5" />
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
                <span className="text-xs text-muted-foreground">{lastResult.creditsUsed} credits used</span>
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
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400/50 mx-auto" />
                <p className="text-sm text-muted-foreground/60">Generating voiceover...</p>
                <p className="text-[10px] text-muted-foreground/30">Usually 5-15 seconds</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 rounded-2xl border border-dashed border-border/30 bg-secondary/5">
              <div className="text-center space-y-2">
                <Mic2 className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <p className="text-xs text-muted-foreground/40">Your voiceover will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
