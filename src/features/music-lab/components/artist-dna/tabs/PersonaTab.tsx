'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Drama } from 'lucide-react'
import { TagInput } from '../TagInput'
import { MagicWandField } from '../MagicWandField'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function PersonaTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const persona = draft.persona

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Drama className="w-5 h-5" />
          Persona
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Traits</Label>
          <TagInput
            tags={persona.traits}
            onTagsChange={(traits) => updateDraft('persona', { traits })}
            placeholder="e.g. resilient, introspective..."
            maxTags={8}
          />
        </div>

        <div className="space-y-2">
          <Label>Likes</Label>
          <TagInput
            tags={persona.likes}
            onTagsChange={(likes) => updateDraft('persona', { likes })}
            placeholder="Things they love..."
          />
        </div>

        <div className="space-y-2">
          <Label>Dislikes</Label>
          <TagInput
            tags={persona.dislikes}
            onTagsChange={(dislikes) => updateDraft('persona', { dislikes })}
            placeholder="Things they hate..."
          />
        </div>

        <div className="space-y-2">
          <Label>Attitude</Label>
          <MagicWandField
            field="attitude"
            section="persona"
            value={persona.attitude}
            onChange={(attitude) => updateDraft('persona', { attitude })}
            placeholder="Overall attitude..."
          />
        </div>

        <div className="space-y-2">
          <Label>Worldview</Label>
          <MagicWandField
            field="worldview"
            section="persona"
            value={persona.worldview}
            onChange={(worldview) => updateDraft('persona', { worldview })}
            placeholder="How they see the world..."
            multiline
          />
        </div>

        <div className="space-y-2">
          <Label>Quirks</Label>
          <TagInput
            tags={persona.quirks}
            onTagsChange={(quirks) => updateDraft('persona', { quirks })}
            placeholder="Unique quirks..."
          />
        </div>
      </CardContent>
    </Card>
  )
}
