'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

// ─── Color Schemes ───────────────────────────────────────────────────────────

const COLOR_SCHEMES = {
  amber: {
    pill: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    pillHover: 'hover:bg-amber-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-amber-500/40 hover:text-amber-300',
    tagActive: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_oklch(0.6_0.2_55/0.15)]',
    groupLabel: 'text-amber-400/70',
  },
  blue: {
    pill: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    pillHover: 'hover:bg-blue-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-blue-500/40 hover:text-blue-300',
    tagActive: 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_8px_oklch(0.55_0.15_260/0.15)]',
    groupLabel: 'text-blue-400/70',
  },
  rose: {
    pill: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    pillHover: 'hover:bg-rose-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-rose-500/40 hover:text-rose-300',
    tagActive: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_oklch(0.55_0.15_15/0.15)]',
    groupLabel: 'text-rose-400/70',
  },
  emerald: {
    pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    pillHover: 'hover:bg-emerald-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-emerald-500/40 hover:text-emerald-300',
    tagActive: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_oklch(0.55_0.15_155/0.15)]',
    groupLabel: 'text-emerald-400/70',
  },
  purple: {
    pill: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    pillHover: 'hover:bg-purple-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-purple-500/40 hover:text-purple-300',
    tagActive: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_8px_oklch(0.55_0.15_290/0.15)]',
    groupLabel: 'text-purple-400/70',
  },
  orange: {
    pill: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    pillHover: 'hover:bg-orange-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-orange-500/40 hover:text-orange-300',
    tagActive: 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_8px_oklch(0.55_0.15_40/0.15)]',
    groupLabel: 'text-orange-400/70',
  },
  cyan: {
    pill: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    pillHover: 'hover:bg-cyan-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-cyan-500/40 hover:text-cyan-300',
    tagActive: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_oklch(0.55_0.15_200/0.15)]',
    groupLabel: 'text-cyan-400/70',
  },
  pink: {
    pill: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    pillHover: 'hover:bg-pink-500/30',
    tag: 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border-[oklch(0.30_0.03_55)] hover:border-pink-500/40 hover:text-pink-300',
    tagActive: 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-[0_0_8px_oklch(0.55_0.15_350/0.15)]',
    groupLabel: 'text-pink-400/70',
  },
} as const

export type ColorScheme = keyof typeof COLOR_SCHEMES

// ─── Types ───────────────────────────────────────────────────────────────────

interface TagItem {
  id: string
  label: string
  group?: string
}

interface MultiSelectPillsProps {
  items: TagItem[]
  selected: string[]
  onChange: (selected: string[]) => void
  color?: ColorScheme
  showSearch?: boolean
  searchPlaceholder?: string
  grouped?: boolean
  compact?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MultiSelectPills({
  items,
  selected,
  onChange,
  color = 'amber',
  showSearch = false,
  searchPlaceholder = 'Search...',
  grouped = false,
  compact = false,
}: MultiSelectPillsProps) {
  const [search, setSearch] = useState('')
  const scheme = COLOR_SCHEMES[color]

  const filtered = useMemo(() => {
    if (!search) return items
    const lower = search.toLowerCase()
    return items.filter((item) => item.label.toLowerCase().includes(lower))
  }, [items, search])

  const toggle = (label: string) => {
    if (selected.includes(label)) {
      onChange(selected.filter((s) => s !== label))
    } else {
      onChange([...selected, label])
    }
  }

  const remove = (label: string) => {
    onChange(selected.filter((s) => s !== label))
  }

  // Group items if requested
  const groups = useMemo(() => {
    if (!grouped) return null
    const map = new Map<string, TagItem[]>()
    for (const item of filtered) {
      const g = item.group || 'Other'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(item)
    }
    return map
  }, [filtered, grouped])

  return (
    <div className="space-y-2.5">
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((label) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${scheme.pill}`}
            >
              {label}
              <button
                onClick={() => remove(label)}
                className={`p-0.5 rounded-full transition-colors ${scheme.pillHover}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[oklch(0.45_0.03_55)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs bg-[oklch(0.22_0.025_55)] border-[oklch(0.32_0.03_55)] text-[oklch(0.88_0.02_55)] placeholder:text-[oklch(0.45_0.03_55)] rounded-lg"
          />
        </div>
      )}

      {/* Grouped display */}
      {grouped && groups ? (
        <div className="space-y-2">
          {Array.from(groups.entries()).map(([groupName, groupItems]) => (
            <div key={groupName}>
              <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${scheme.groupLabel}`}>
                {groupName}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groupItems.map((item) => {
                  const isSelected = selected.includes(item.label)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.label)}
                      className={`${compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-full font-medium transition-all border ${
                        isSelected ? scheme.tagActive : scheme.tag
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat display */
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((item) => {
            const isSelected = selected.includes(item.label)
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.label)}
                className={`${compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-full font-medium transition-all border ${
                  isSelected ? scheme.tagActive : scheme.tag
                }`}
              >
                {item.label}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-[oklch(0.45_0.03_55)] py-1">No matches.</p>
          )}
        </div>
      )}
    </div>
  )
}
