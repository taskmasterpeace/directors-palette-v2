'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { User } from 'lucide-react'
import { MagicWandField } from '../MagicWandField'
import { TagInput } from '../TagInput'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

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
        <div className="space-y-2">
          <Label htmlFor="artist-name">Name</Label>
          <Input
            id="artist-name"
            value={identity.name}
            onChange={(e) => updateDraft('identity', { name: e.target.value })}
            placeholder="Artist name..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="artist-region">Region</Label>
            <Input
              id="artist-region"
              value={identity.region}
              onChange={(e) => updateDraft('identity', { region: e.target.value })}
              placeholder="Region..."
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
          />
        </div>
      </CardContent>
    </Card>
  )
}
