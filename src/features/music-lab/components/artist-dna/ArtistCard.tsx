'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import type { UserArtistProfile } from '../../types/artist-dna.types'

interface ArtistCardProps {
  artist: UserArtistProfile
  onClick: () => void
  onDelete: () => void
}

export function ArtistCard({ artist, onClick, onDelete }: ArtistCardProps) {
  const initials = artist.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const genres = artist.dna.sound.genres.slice(0, 3)
  const city = artist.dna.identity.city
  const portraitUrl = artist.dna.look?.portraitUrl
  const characterSheetUrl = artist.dna.look?.characterSheetUrl

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
            {portraitUrl ? (
              <img src={portraitUrl} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              initials || '?'
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold truncate">{artist.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                aria-label={`Delete ${artist.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {city && <p className="text-sm text-muted-foreground">{city}</p>}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {genres.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            {characterSheetUrl && (
              <div className="mt-2 rounded-md overflow-hidden border border-border/30">
                <img src={characterSheetUrl} alt="Character sheet" className="w-full h-auto" style={{ aspectRatio: '16/9' }} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
