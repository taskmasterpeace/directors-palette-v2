'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import { cn } from '@/utils/utils'

interface WildcardPickerDropdownProps {
  entries: string[]
  onSelect: (entry: string) => void
  onClose: () => void
}

export function WildcardPickerDropdown({
  entries,
  onSelect,
  onClose,
}: WildcardPickerDropdownProps) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.innerWidth < 640)
  }, [])

  // Focus search on open
  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 50)
  }, [])

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on click outside (desktop only)
  useEffect(() => {
    if (isMobile) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, isMobile])

  const filtered = search
    ? entries.filter(e => e.toLowerCase().includes(search.toLowerCase()))
    : entries

  const content = (
    <div ref={containerRef} className={cn(
      'bg-popover border border-border rounded-lg shadow-xl overflow-hidden',
      isMobile
        ? 'fixed bottom-0 left-0 right-0 z-50 rounded-b-none max-h-[70vh] animate-in slide-in-from-bottom duration-200'
        : 'absolute z-50 mt-1 w-[280px] max-h-[300px]'
    )}>
      {/* Search */}
      <div className="p-2 border-b border-border sticky top-0 bg-popover z-10">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            ref={searchRef}
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm pl-7 pr-7 bg-card border-border"
            onKeyDown={(e) => e.stopPropagation()}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Entries list */}
      <div className="overflow-y-auto max-h-[240px] overscroll-contain">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            No matches
          </div>
        ) : (
          filtered.map((entry, i) => {
            const truncated = entry.length > 60 ? entry.slice(0, 60) + '...' : entry
            return (
              <button
                key={`${entry}-${i}`}
                onClick={() => onSelect(entry)}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors truncate"
                title={entry}
              >
                {truncated}
              </button>
            )
          })
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground">
        {filtered.length} of {entries.length} entries
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
        {content}
      </>
    )
  }

  return <div className="relative">{content}</div>
}
