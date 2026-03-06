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
  return (
    <div className="space-y-4">
      {/* Logo + Brand Name Header */}
      <div className="flex items-center gap-4">
        {brand.logo_url && (
          <img
            src={brand.logo_url}
            alt={`${brand.name} logo`}
            className="w-16 h-16 rounded-xl object-contain bg-white/5 border border-border/20 p-1.5"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight truncate">{brand.name}</h2>
          {brand.tagline && (
            <p className="text-sm text-muted-foreground/70 truncate">{brand.tagline}</p>
          )}
          {brand.industry && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/40 bg-secondary/40 px-2 py-0.5 rounded-full">
              {brand.industry}
            </span>
          )}
        </div>
      </div>

      {/* Brand Guide Image */}
      {brand.brand_guide_image_url ? (
        <div className="relative group rounded-2xl overflow-hidden border border-border/30 shadow-lg shadow-black/20">
          <img
            src={brand.brand_guide_image_url}
            alt={`${brand.name} brand guide`}
            className="w-full object-contain"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
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
