'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/utils'
import { WildcardPickerDropdown } from './WildcardPickerDropdown'

interface WildcardPickerFieldProps {
  wildcardName: string
  value: string
  onChange: (value: string) => void
  entries: string[]
  isMissing: boolean
}

export function WildcardPickerField({
  wildcardName,
  value,
  onChange,
  entries,
  isMissing,
}: WildcardPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false)

  // No entries available
  if (entries.length === 0) {
    return (
      <div className="h-9 flex items-center px-3 text-xs text-muted-foreground bg-card border border-border rounded-md opacity-60">
        Wildcard &apos;{wildcardName}&apos; is empty
      </div>
    )
  }

  const isRandom = !value
  const displayValue = value
    ? (value.length > 40 ? value.slice(0, 40) + '...' : value)
    : null

  const handleSelect = (entry: string) => {
    onChange(entry)
    setIsOpen(false)
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-9 flex items-center gap-1.5 px-3 rounded-md text-sm transition-colors',
          'bg-card border hover:border-cyan-500/50 cursor-pointer select-none',
          isRandom
            ? 'border-cyan-500/30 text-cyan-300'
            : 'border-cyan-500/40 text-cyan-200',
          isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
        )}
        title={value || `Random ${wildcardName}`}
      >
        <span className="text-base leading-none">{isRandom ? '🎲' : '📌'}</span>
        <span className="truncate max-w-[180px]">
          {isRandom ? 'Random' : displayValue}
        </span>
        {!isRandom && (
          <span
            role="button"
            onClick={handleReset}
            className="ml-0.5 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <WildcardPickerDropdown
          entries={entries}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
