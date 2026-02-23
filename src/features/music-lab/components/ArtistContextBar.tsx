'use client'

import { useEffect } from 'react'
import { Plus, ChevronDown, Music2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useArtistDnaStore } from '../store/artist-dna.store'
import { useLayoutStore } from '@/store/layout.store'
import type { CatalogEntry } from '../types/artist-dna.types'

interface ArtistContextBarProps {
  userId: string
  onArtistSelect?: (artistId: string) => void
  onTrackSelect?: (entry: CatalogEntry) => void
  showDiscography?: boolean
}

export function ArtistContextBar({
  userId,
  onArtistSelect,
  onTrackSelect,
  showDiscography = true,
}: ArtistContextBarProps) {
  const {
    artists,
    activeArtistId,
    draft,
    isInitialized,
    initialize,
    loadArtistIntoDraft,
  } = useArtistDnaStore()
  const { setActiveTab } = useLayoutStore()

  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  const activeArtist = artists.find((a) => a.id === activeArtistId)
  const portraitUrl = draft.look?.portraitUrl

  const handleArtistSwitch = (id: string) => {
    loadArtistIntoDraft(id)
    onArtistSelect?.(id)
  }

  const handleCreateNew = () => {
    setActiveTab('artist-lab')
  }

  // Empty state: no artist selected
  if (!activeArtistId || !activeArtist) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <User className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">Select or Create Artist</p>

        {isInitialized && artists.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md w-full">
            {artists.map((a) => (
              <button
                key={a.id}
                onClick={() => handleArtistSwitch(a.id)}
                className="px-3 py-2 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors text-sm font-medium truncate"
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-1" />
          Create New
        </Button>
      </div>
    )
  }

  // Active state: compact bar
  const catalogEntries = draft.catalog?.entries || []
  const initials = (activeArtist.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-card/50 border-b border-border/50 min-h-[56px]">
      {/* Portrait */}
      <div className="w-12 h-12 rounded-full ring-2 ring-amber-500/60 overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted">
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt={activeArtist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">
            {initials}
          </span>
        )}
      </div>

      {/* Name + city */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{activeArtist.name}</p>
        {draft.identity?.city && (
          <p className="text-xs text-muted-foreground truncate">
            {draft.identity.city}
          </p>
        )}
      </div>

      {/* Artist switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            Switch
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {artists.map((a) => (
            <DropdownMenuItem
              key={a.id}
              onClick={() => handleArtistSwitch(a.id)}
              className={a.id === activeArtistId ? 'bg-accent' : ''}
            >
              {a.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Discography picker */}
      {showDiscography && catalogEntries.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Music2 className="w-4 h-4" />
              Tracks
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
            {catalogEntries.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                onClick={() => onTrackSelect?.(entry)}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{entry.title}</span>
                  {entry.mood && (
                    <span className="text-xs text-muted-foreground">{entry.mood}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
