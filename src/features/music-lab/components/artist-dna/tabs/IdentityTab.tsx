'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { User } from 'lucide-react'
import { MagicWandField } from '../MagicWandField'
import { TagInput } from '../TagInput'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { logger } from '@/lib/logger'

export function IdentityTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const identity = draft.identity

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="artist-stage-name">Stage Name</Label>
            <Input
              id="artist-stage-name"
              value={identity.stageName}
              onChange={(e) => updateDraft('identity', { stageName: e.target.value })}
              placeholder="Stage name..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist-real-name">Real Name</Label>
            <Input
              id="artist-real-name"
              value={identity.realName}
              onChange={(e) => updateDraft('identity', { realName: e.target.value })}
              placeholder="Legal name..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="artist-ethnicity">Ethnicity</Label>
            <Input
              id="artist-ethnicity"
              value={identity.ethnicity}
              onChange={(e) => updateDraft('identity', { ethnicity: e.target.value })}
              placeholder="Ethnicity..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist-city">City</Label>
            <Input
              id="artist-city"
              value={identity.city}
              onChange={(e) => updateDraft('identity', { city: e.target.value })}
              placeholder="City..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist-state">State</Label>
            <Input
              id="artist-state"
              value={identity.state}
              onChange={(e) => updateDraft('identity', { state: e.target.value })}
              placeholder="State..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist-neighborhood">Neighborhood</Label>
            <Input
              id="artist-neighborhood"
              value={identity.neighborhood}
              onChange={(e) => updateDraft('identity', { neighborhood: e.target.value })}
              placeholder="Neighborhood..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Backstory</Label>
          <MagicWandField
            field="backstory"
            section="identity"
            value={identity.backstory}
            onChange={(backstory) => updateDraft('identity', { backstory })}
            placeholder="Artist backstory..."
            multiline
          />
        </div>

        <div className="space-y-2">
          <Label>Significant Events</Label>
          <TagInput
            tags={identity.significantEvents}
            onTagsChange={(significantEvents) => updateDraft('identity', { significantEvents })}
            placeholder="Add life event..."
            onWandClick={() => {
              fetch('/api/artist-dna/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  field: 'significantEvents',
                  section: 'identity',
                  currentValue: '',
                  context: draft,
                  exclude: identity.significantEvents,
                }),
              })
                .then((r) => r.json())
                .then((d) => {
                  if (d.suggestions?.length) {
                    useArtistDnaStore.getState().setSuggestions('significantEvents', d.suggestions)
                  }
                })
                .catch((err: unknown) => logger.musicLab.error('Identity suggestion fetch failed', { error: err instanceof Error ? err.message : String(err) }))
            }}
            suggestions={useArtistDnaStore.getState().suggestionCache['significantEvents']?.suggestions?.slice(0, 5) ?? []}
            onSuggestionClick={(val) => {
              if (!identity.significantEvents.includes(val)) {
                updateDraft('identity', { significantEvents: [...identity.significantEvents, val] })
              }
              useArtistDnaStore.getState().consumeSuggestion('significantEvents', val)
            }}
            onSuggestionDismiss={(i) => useArtistDnaStore.getState().dismissSuggestion('significantEvents', i)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
