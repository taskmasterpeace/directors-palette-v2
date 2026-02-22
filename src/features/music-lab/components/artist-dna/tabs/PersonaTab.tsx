'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Drama } from 'lucide-react'
import { TagInput } from '../TagInput'
import { MagicWandField } from '../MagicWandField'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function PersonaTab() {
  const { draft, updateDraft, suggestionCache, setSuggestions, consumeSuggestion, dismissSuggestion } =
    useArtistDnaStore()
  const persona = draft.persona

  const [loadingField, setLoadingField] = useState<string | null>(null)

  const fetchTagSuggestions = async (field: string, existing: string[]) => {
    setLoadingField(field)
    try {
      const res = await fetch('/api/artist-dna/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          section: 'persona',
          currentValue: '',
          context: draft,
          exclude: existing,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions?.length) {
          setSuggestions(field, data.suggestions)
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoadingField(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Drama className="w-5 h-5" />
          Persona
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Traits</Label>
            <TagInput
              tags={persona.traits}
              onTagsChange={(traits) => updateDraft('persona', { traits })}
              placeholder="e.g. resilient, introspective..."
              maxTags={8}
              onWandClick={() => fetchTagSuggestions('traits', persona.traits)}
              isLoading={loadingField === 'traits'}
              suggestions={suggestionCache['traits']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!persona.traits.includes(val)) {
                  updateDraft('persona', { traits: [...persona.traits, val] })
                }
                consumeSuggestion('traits', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('traits', i)}
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Likes</Label>
            <TagInput
              tags={persona.likes}
              onTagsChange={(likes) => updateDraft('persona', { likes })}
              placeholder="Things they love..."
              onWandClick={() => fetchTagSuggestions('likes', persona.likes)}
              isLoading={loadingField === 'likes'}
              suggestions={suggestionCache['likes']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!persona.likes.includes(val)) {
                  updateDraft('persona', { likes: [...persona.likes, val] })
                }
                consumeSuggestion('likes', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('likes', i)}
            />
          </div>
          <div className="space-y-2">
            <Label>Dislikes</Label>
            <TagInput
              tags={persona.dislikes}
              onTagsChange={(dislikes) => updateDraft('persona', { dislikes })}
              placeholder="Things they hate..."
              onWandClick={() => fetchTagSuggestions('dislikes', persona.dislikes)}
              isLoading={loadingField === 'dislikes'}
              suggestions={suggestionCache['dislikes']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!persona.dislikes.includes(val)) {
                  updateDraft('persona', { dislikes: [...persona.dislikes, val] })
                }
                consumeSuggestion('dislikes', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('dislikes', i)}
            />
          </div>
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
      </CardContent>
    </Card>
  )
}
