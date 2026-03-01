'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles,
  X,
  Music,
  Lightbulb,
  Newspaper,
  Image,
  Drum,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InspirationItem } from '@/features/music-lab/types/artist-chat.types'

// ─── Type icon mapping ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  InspirationItem['type'],
  { icon: typeof Music; label: string; color: string; bgColor: string }
> = {
  lyric: {
    icon: Music,
    label: 'Lyrics',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
  },
  concept: {
    icon: Lightbulb,
    label: 'Concepts',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
  },
  article: {
    icon: Newspaper,
    label: 'Articles',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
  },
  photo: {
    icon: Image,
    label: 'Photos',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
  },
  beat: {
    icon: Drum,
    label: 'Beats',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
  },
}

// ─── Inspiration Card ─────────────────────────────────────────────────────────

function InspirationCard({
  item,
  onRemove,
}: {
  item: InspirationItem
  onRemove: (id: string) => void
}) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <div className="group relative p-3 rounded-[0.625rem] border border-[oklch(0.32_0.03_55)] bg-[oklch(0.22_0.025_55)] hover:border-[oklch(0.38_0.03_55)] transition-all">
      {/* Type badge */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        </div>
        <span className="text-[10px] uppercase tracking-wider font-medium text-[oklch(0.50_0.04_55)]">
          {config.label}
        </span>
      </div>

      {/* Content */}
      {item.type === 'photo' && item.url ? (
        <div className="rounded-lg overflow-hidden mb-2">
          <img src={item.url} alt="" className="w-full h-24 object-cover" />
        </div>
      ) : null}

      <p className="text-sm text-[oklch(0.82_0.02_55)] leading-relaxed line-clamp-3">
        {item.content}
      </p>

      {/* Date */}
      <p className="text-[10px] text-[oklch(0.40_0.03_55)] mt-2">
        {new Date(item.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>

      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-[oklch(0.20_0.02_55)] opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
        title="Remove from feed"
      >
        <Trash2 className="w-3 h-3 text-[oklch(0.55_0.04_55)] group-hover:text-red-400" />
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InspirationFeedProps {
  artistId: string
  onClose: () => void
}

export function InspirationFeed({ artistId: _artistId, onClose }: InspirationFeedProps) {
  // Local state placeholder -- will connect to DB later
  const [items, setItems] = useState<InspirationItem[]>([])
  const [activeFilter, setActiveFilter] = useState<InspirationItem['type'] | 'all'>('all')

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const filteredItems =
    activeFilter === 'all' ? items : items.filter((item) => item.type === activeFilter)

  const filterTypes: Array<{ key: InspirationItem['type'] | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'lyric', label: 'Lyrics' },
    { key: 'concept', label: 'Concepts' },
    { key: 'article', label: 'Articles' },
    { key: 'photo', label: 'Photos' },
    { key: 'beat', label: 'Beats' },
  ]

  return (
    <div className="flex flex-col h-full bg-[oklch(0.18_0.02_55)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[oklch(0.32_0.03_55)] bg-[oklch(0.20_0.025_55)]">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[oklch(0.28_0.03_55)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[oklch(0.65_0.04_55)]" />
        </button>
        <Sparkles className="w-5 h-5 text-amber-400" />
        <div className="flex-1">
          <h2 className="font-semibold text-sm text-[oklch(0.92_0.02_55)] tracking-[-0.025em]">
            Inspiration Feed
          </h2>
          <p className="text-xs text-[oklch(0.50_0.04_55)]">
            Thumbs-up content saved here
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-[oklch(0.55_0.04_55)] hover:text-[oklch(0.75_0.04_55)] hover:bg-[oklch(0.25_0.03_55)]"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto border-b border-[oklch(0.28_0.03_55)]">
        {filterTypes.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeFilter === f.key
                ? 'bg-amber-500 text-[oklch(0.15_0.02_55)]'
                : 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.60_0.04_55)] hover:bg-[oklch(0.28_0.03_55)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <InspirationCard key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-16">
            <div className="w-16 h-16 rounded-full bg-[oklch(0.22_0.025_55)] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber-400/40" />
            </div>
            <p className="text-[oklch(0.55_0.04_55)] text-sm font-medium">
              No inspiration saved yet
            </p>
            <p className="text-[oklch(0.40_0.03_55)] text-xs max-w-[260px]">
              Give a thumbs-up to artist messages in chat and they will appear here for reference.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
