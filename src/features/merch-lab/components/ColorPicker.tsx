'use client'

import { useMemo, useState } from 'react'
import { useMerchLabStore } from '../hooks'
import { cn } from '@/utils/utils'
import { ChevronDown, Search } from 'lucide-react'

const NO_COLOR_PRODUCTS = [282, 937, 532, 400, 413]

// Group colors into families for better organization
const COLOR_FAMILIES: Record<string, string[]> = {
  'Neutrals': ['White', 'Natural', 'Sand', 'Ash', 'Sport Grey', 'Ice Grey', 'Light Grey', 'Grey', 'Dark Grey', 'Charcoal', 'Dark Heather', 'Black'],
  'Blues': ['Light Blue', 'Baby Blue', 'Sky', 'Carolina Blue', 'Sapphire', 'Royal', 'Indigo', 'Navy', 'Dark Navy', 'True Royal'],
  'Reds': ['Light Pink', 'Pink', 'Coral', 'Coral Silk', 'Red', 'Cardinal', 'Cherry Red', 'Maroon', 'Garnet', 'Dark Red'],
  'Greens': ['Mint', 'Pistachio', 'Lime', 'Irish Green', 'Kelly Green', 'Forest Green', 'Military Green', 'Army', 'Dark Green', 'Olive'],
  'Warm': ['Daisy', 'Yellow', 'Gold', 'Orange', 'Burnt Orange', 'Texas Orange', 'Autumn', 'Sunset'],
  'Purples': ['Lilac', 'Orchid', 'Purple', 'Team Purple', 'Heather Purple', 'Eggplant'],
  'Earth': ['Tan', 'Pebble', 'Stone', 'Brown', 'Dark Chocolate', 'Coyote Brown', 'Heather Dust'],
}

function getColorFamily(name: string): string {
  for (const [family, names] of Object.entries(COLOR_FAMILIES)) {
    if (names.some(n => name.toLowerCase().includes(n.toLowerCase()))) return family
  }
  return 'Other'
}

export function ColorPicker() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const variants = useMerchLabStore((s) => s.variants)
  const isLoadingCatalog = useMerchLabStore((s) => s.isLoadingCatalog)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const setColor = useMerchLabStore((s) => s.setColor)

  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  const colors = useMemo(() => {
    const seen = new Set<string>()
    return variants.filter((v) => {
      if (seen.has(v.color)) return false
      seen.add(v.color)
      return true
    }).map((v) => ({ name: v.color, hex: v.colorHex }))
  }, [variants])

  // Group colors by family
  const grouped = useMemo(() => {
    const groups: Record<string, typeof colors> = {}
    for (const c of colors) {
      const family = getColorFamily(c.name)
      if (!groups[family]) groups[family] = []
      groups[family].push(c)
    }
    return groups
  }, [colors])

  // Popular/essential colors shown by default (first of each major family)
  const popularColors = useMemo(() => {
    const popular: typeof colors = []
    const familyOrder = ['Neutrals', 'Blues', 'Reds', 'Greens', 'Warm', 'Purples', 'Earth', 'Other']
    for (const family of familyOrder) {
      const group = grouped[family]
      if (!group) continue
      // Take 2-3 from each family
      const take = family === 'Neutrals' ? 4 : 2
      popular.push(...group.slice(0, take))
    }
    return popular
  }, [grouped])

  const filteredColors = useMemo(() => {
    if (!search.trim()) return expanded ? colors : popularColors
    const q = search.toLowerCase()
    return colors.filter(c => c.name.toLowerCase().includes(q))
  }, [colors, popularColors, search, expanded])

  if (NO_COLOR_PRODUCTS.includes(selectedProductId ?? 0)) {
    return null
  }

  return (
    <div className="border-b border-border/30 p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Color
        </span>
        {colors.length > 0 && (
          <span className="text-[9px] text-muted-foreground/30">{colors.length} available</span>
        )}
      </div>

      {isLoadingCatalog ? (
        <div className="flex gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-6 animate-pulse rounded-full bg-card/50" />
          ))}
        </div>
      ) : colors.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/40">Select a product first</p>
      ) : (
        <div className="space-y-2">
          {/* Color swatches */}
          <div className="flex flex-wrap gap-1">
            {filteredColors.map((c) => (
              <button
                key={c.name}
                title={c.name}
                onClick={() => setColor(c.name, c.hex)}
                className={cn(
                  'h-6 w-6 rounded-full border-[1.5px] transition-all hover:scale-110',
                  selectedColor === c.name
                    ? 'border-amber-400 ring-2 ring-amber-400/30 scale-110'
                    : 'border-white/10 hover:border-white/30',
                  c.hex === '#FFFFFF' && 'border-border/40',
                  c.hex === '#000000' && 'border-white/15'
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* Expand / Search row */}
          <div className="flex items-center gap-1.5">
            {!search && colors.length > popularColors.length && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} />
                {expanded ? 'Less' : `All ${colors.length}`}
              </button>
            )}
            {(expanded || search) && (
              <div className="relative flex-1">
                <Search className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search colors..."
                  className="w-full rounded-md border border-border/20 bg-card/20 py-0.5 pl-5 pr-2 text-[10px] text-foreground placeholder:text-muted-foreground/30 focus:border-amber-500/30 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Selected color label */}
          {selectedColor && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className="h-3 w-3 rounded-full border border-border/30"
                style={{ backgroundColor: colors.find(c => c.name === selectedColor)?.hex }}
              />
              <span className="font-medium text-foreground/70">{selectedColor}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
