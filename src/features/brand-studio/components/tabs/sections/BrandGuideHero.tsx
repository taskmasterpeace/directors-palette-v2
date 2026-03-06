'use client'

import { RefreshCw, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Brand } from '../../../types'

interface BrandGuideHeroProps {
  brand: Brand
  isGenerating: boolean
  onRegenerate: () => void
}

export function BrandGuideHero({ brand, isGenerating, onRegenerate }: BrandGuideHeroProps) {
  // Extract brand's primary color for the banner gradient
  const primaryColor = brand.visual_identity_json?.colors?.find(c => c.role === 'primary')?.hex || '#6366f1'
  const secondaryColor = brand.visual_identity_json?.colors?.find(c => c.role === 'secondary')?.hex || '#8b5cf6'

  return (
    <div className="space-y-5">
      {/* Brand-Colored Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 pb-8"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}18 0%, ${secondaryColor}0a 50%, transparent 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(${primaryColor} 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative flex items-center gap-5">
          {/* Logo */}
          {brand.logo_url ? (
            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 shadow-xl shadow-black/10 flex items-center justify-center overflow-hidden shrink-0 backdrop-blur-sm">
              <img src={brand.logo_url} alt={`${brand.name} logo`} className="w-16 h-16 object-contain" />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-2xl border border-white/15 shadow-xl shadow-black/10 flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${primaryColor}10)` }}
            >
              <span className="text-2xl font-bold text-foreground/80">{brand.name.charAt(0)}</span>
            </div>
          )}

          {/* Brand Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{brand.name}</h2>
            {brand.tagline && (
              <p className="text-sm text-muted-foreground/70 truncate mt-0.5">{brand.tagline}</p>
            )}
            {brand.industry && (
              <span
                className="inline-block mt-2 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: `${primaryColor}cc`,
                  border: `1px solid ${primaryColor}25`,
                }}
              >
                {brand.industry}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Brand Guide Image */}
      {brand.brand_guide_image_url ? (
        <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
          <img src={brand.brand_guide_image_url} alt={`${brand.name} brand guide`} className="w-full object-contain" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5 bg-background/90 backdrop-blur-md border border-border/40 shadow-lg"
                onClick={onRegenerate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />
                }
                Regenerate Guide (15 pts)
              </Button>
            </div>
          </div>
        </div>
      ) : isGenerating ? (
        <div className="flex items-center justify-center py-16 rounded-2xl border border-dashed border-border/30 bg-secondary/10">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50 mx-auto" />
            <p className="text-sm text-muted-foreground/60">Generating brand guide image...</p>
          </div>
        </div>
      ) : (
        <button
          onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-border/30 bg-secondary/5 hover:bg-secondary/15 hover:border-border/50 transition-all duration-200 cursor-pointer group/gen"
        >
          <ImageIcon className="w-5 h-5 text-muted-foreground/40 group-hover/gen:text-primary/60 transition-colors" />
          <span className="text-sm text-muted-foreground/50 group-hover/gen:text-muted-foreground transition-colors">
            Generate Visual Brand Guide (15 pts)
          </span>
        </button>
      )}
    </div>
  )
}
