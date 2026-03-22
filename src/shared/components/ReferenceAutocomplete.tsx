'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/utils/utils'
import type { ReferenceAutocompleteOption } from '../hooks/useReferenceAutocomplete'

interface ReferenceAutocompleteProps {
  isOpen: boolean
  items: ReferenceAutocompleteOption[]
  selectedIndex: number
  onSelect: (item: ReferenceAutocompleteOption) => void
  onClose: () => void
  onNavigate: (direction: 'up' | 'down') => void
}

export function ReferenceAutocomplete({
  isOpen,
  items,
  selectedIndex,
  onSelect,
  onClose,
  onNavigate,
}: ReferenceAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.children[selectedIndex] as HTMLElement
    if (selected) selected.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  if (!isOpen || items.length === 0) return null

  return (
    <div
      ref={listRef}
      className="absolute z-50 mt-1 w-[260px] max-h-[200px] overflow-y-auto bg-popover border border-border rounded-lg shadow-xl"
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); onNavigate('up') }
        if (e.key === 'ArrowDown') { e.preventDefault(); onNavigate('down') }
        if (e.key === 'Escape') onClose()
      }}
    >
      {items.map((item, i) => (
        <button
          key={item.value}
          onClick={() => onSelect(item)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
            i === selectedIndex ? 'bg-accent/50 text-white' : 'hover:bg-accent/30'
          )}
        >
          {/* Thumbnail for references */}
          {item.type === 'reference' && item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="w-6 h-6 rounded object-cover shrink-0"
            />
          ) : (
            <span className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400 shrink-0">
              {item.type === 'category' ? '#' : '@'}
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
