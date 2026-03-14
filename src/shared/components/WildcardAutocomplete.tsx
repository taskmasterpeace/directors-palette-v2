'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/utils/utils'

interface WildcardGroupItem {
  id: string
  name: string
  content: string
}

interface WildcardGroup {
  category: string
  wildcards: WildcardGroupItem[]
}

interface WildcardAutocompleteProps {
  groups: WildcardGroup[]
  selectedIndex: number
  onSelect: (name: string) => void
  onHover: (index: number) => void
  position: { top: number; left: number; width: number }
}

function getEntryCount(content: string): number {
  return content.split('\n').filter((l) => l.trim().length > 0).length
}

export function WildcardAutocomplete({
  groups,
  selectedIndex,
  onSelect,
  onHover,
  position,
}: WildcardAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector('[data-selected="true"]')
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  if (groups.length === 0) return null

  // Track flat index across groups
  let flatIdx = 0

  return (
    <div
      className="fixed z-50 max-h-[300px] overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${Math.min(position.width, 400)}px`,
      }}
      ref={listRef}
      onMouseDown={(e) => e.preventDefault()} // prevent blur on click
    >
      {groups.map((group) => (
        <div key={group.category}>
          {/* Category header */}
          <div className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-950/90 backdrop-blur-sm">
            {group.category}
          </div>
          {group.wildcards.map((wc) => {
            const idx = flatIdx++
            const isSelected = idx === selectedIndex
            const count = getEntryCount(wc.content)
            return (
              <button
                key={wc.id}
                data-selected={isSelected}
                onClick={() => onSelect(wc.name)}
                onMouseEnter={() => onHover(idx)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'text-slate-300 hover:bg-slate-800'
                )}
              >
                <span className="font-mono text-xs text-amber-400 font-medium">
                  _{wc.name}_
                </span>
                <span className="ml-auto text-[11px] text-slate-500 tabular-nums">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
