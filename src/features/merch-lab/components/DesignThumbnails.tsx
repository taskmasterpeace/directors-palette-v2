'use client'

import { useMerchLabStore } from '../hooks'
import { cn } from '@/utils/utils'

export function DesignThumbnails() {
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const setActiveDesignIndex = useMerchLabStore((s) => s.setActiveDesignIndex)

  if (generatedDesigns.length <= 1) return null

  return (
    <div className="flex gap-2">
      {generatedDesigns.map((design, i) => (
        <button
          key={design.id}
          onClick={() => setActiveDesignIndex(i)}
          className={cn(
            'h-14 w-14 overflow-hidden rounded-lg border-2 transition-all',
            i === activeDesignIndex
              ? 'border-cyan-500 ring-2 ring-cyan-500/30'
              : 'border-border/30 hover:border-border/60'
          )}
        >
          <img src={design.url} alt={`Design ${i + 1}`} className="h-full w-full object-contain" />
        </button>
      ))}
    </div>
  )
}
