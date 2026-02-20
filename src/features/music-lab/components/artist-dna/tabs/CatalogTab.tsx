'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ListMusic, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { CatalogEntryDialog } from '../CatalogEntryDialog'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function CatalogTab() {
  const { draft, removeCatalogEntry } = useArtistDnaStore()
  const [showDialog, setShowDialog] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const entries = draft.catalog.entries

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <ListMusic className="w-5 h-5" />
            Catalog
          </span>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Song
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No songs in catalog yet. Add songs to help generate unique lyrics.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.title}</span>
                    {entry.mood && <Badge variant="secondary">{entry.mood}</Badge>}
                    {entry.tempo && <Badge variant="outline">{entry.tempo}</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.lyrics && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      >
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCatalogEntry(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {expandedId === entry.id && entry.lyrics && (
                  <pre className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-2 rounded">
                    {entry.lyrics}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        <CatalogEntryDialog open={showDialog} onOpenChange={setShowDialog} />
      </CardContent>
    </Card>
  )
}
