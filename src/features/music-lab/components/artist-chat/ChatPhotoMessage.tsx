'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'

interface ChatPhotoMessageProps {
  photoUrl?: string
  caption?: string
  isGenerating: boolean
}

export function ChatPhotoMessage({ photoUrl, caption, isGenerating }: ChatPhotoMessageProps) {
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (isGenerating || !photoUrl) {
    return (
      <div className="max-w-[260px] w-full">
        <div className="rounded-2xl overflow-hidden border border-border/30 bg-card/50">
          <Skeleton className="w-full aspect-square" />
          {/* Shimmer overlay */}
          <div className="relative -mt-[100%] w-full aspect-square overflow-hidden">
            <div
              className={cn(
                'absolute inset-0',
                'bg-gradient-to-r from-transparent via-white/[0.04] to-transparent',
                'animate-[shimmer_2s_ease-in-out_infinite]',
              )}
              style={{
                backgroundSize: '200% 100%',
              }}
            />
          </div>
          {caption && (
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground">{caption}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[260px] w-full">
      <div
        className={cn(
          'rounded-2xl overflow-hidden cursor-pointer',
          'border border-border/30',
          'shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
          'transition-all duration-300',
          'hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
          'hover:border-amber-500/30',
          expanded && 'max-w-none w-[400px]',
        )}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded)
        }}
      >
        {/* Image */}
        <div className="relative bg-card/50">
          {!loaded && <Skeleton className="absolute inset-0" />}
          <img
            src={photoUrl}
            alt={caption || 'Photo from artist'}
            className={cn(
              'w-full h-auto object-cover transition-opacity duration-500',
              loaded ? 'opacity-100' : 'opacity-0',
            )}
            onLoad={() => setLoaded(true)}
          />
        </div>

        {/* Caption */}
        {caption && (
          <div className="px-3 py-2 bg-card/60">
            <p className="text-xs text-muted-foreground leading-snug">{caption}</p>
          </div>
        )}
      </div>
    </div>
  )
}
