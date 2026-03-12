'use client'

import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { DESIGN_GENERATION_PTS } from '../constants/products'
import { Sparkles, Loader2 } from 'lucide-react'

export function DesignPrompt() {
  const prompt = useMerchLabStore((s) => s.prompt)
  const setPrompt = useMerchLabStore((s) => s.setPrompt)
  const isGenerating = useMerchLabStore((s) => s.isGenerating)
  const setIsGenerating = useMerchLabStore((s) => s.setIsGenerating)
  const addDesign = useMerchLabStore((s) => s.addDesign)
  const setError = useMerchLabStore((s) => s.setError)

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setError(null)

    try {
      const designStyle = useMerchLabStore.getState().designStyle
      const selectedProductId = useMerchLabStore.getState().selectedProductId
      const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)

      const res = await fetch('/api/merch-lab/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), designStyle, category: product?.category ?? 'apparel' }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Generation failed')
      }

      const data = await res.json()
      addDesign({
        id: data.id,
        url: data.url,
        prompt: prompt.trim(),
        createdAt: Date.now(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
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
        placeholder="A fierce cyberpunk dragon breathing neon fire, vector art style, clean lines..."
        className="w-full rounded-[10px] border border-border/30 bg-card/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
        rows={4}
      />
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate Design — {DESIGN_GENERATION_PTS} pts
          </>
        )}
      </button>
    </div>
  )
}
