'use client'

import type { Brand } from '../../../types'

interface BrandGuideHeroProps {
  brand: Brand
}

export function BrandGuideHero({ brand }: BrandGuideHeroProps) {
  const primaryColor = brand.visual_identity_json?.colors?.find(c => c.role === 'primary')?.hex || '#6366f1'
  const secondaryColor = brand.visual_identity_json?.colors?.find(c => c.role === 'secondary')?.hex || '#8b5cf6'

  return (
    <div
      className="relative rounded-2xl overflow-hidden px-6 py-5"
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
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 shadow-xl shadow-black/10 flex items-center justify-center overflow-hidden shrink-0 backdrop-blur-sm">
            <img src={brand.logo_url} alt={`${brand.name} logo`} className="w-12 h-12 object-contain" />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-2xl border border-white/15 shadow-xl shadow-black/10 flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${primaryColor}30, ${primaryColor}10)` }}
          >
            <span className="text-2xl font-bold text-foreground/80">{brand.name.charAt(0)}</span>
          </div>
        )}

        {/* Brand Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-black tracking-tight truncate">{brand.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            {brand.tagline && (
              <p className="text-sm text-muted-foreground/70 truncate">{brand.tagline}</p>
            )}
            {brand.industry && (
              <span
                className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-medium shrink-0"
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
    </div>
  )
}
