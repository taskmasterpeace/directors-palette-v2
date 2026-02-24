'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Music2, ChevronDown, ChevronUp } from 'lucide-react'
import { GenreCascade } from '../GenreCascade'
import { TagInput } from '../TagInput'
import { MagicWandField } from '../MagicWandField'
import { MelodyBiasSlider } from '../MelodyBiasSlider'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function SoundTab() {
  const { draft, updateDraft, suggestionCache, setSuggestions, consumeSuggestion, dismissSuggestion } =
    useArtistDnaStore()
  const sound = draft.sound

  const [loadingField, setLoadingField] = useState<string | null>(null)
  const [showGenreEvolution, setShowGenreEvolution] = useState(false)

  const fetchTagSuggestions = async (field: string, existing: string[]) => {
    setLoadingField(field)
    try {
      const res = await fetch('/api/artist-dna/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          section: 'sound',
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
          <Music2 className="w-5 h-5" />
          Sound
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GenreCascade />

        {/* Genre Evolution Timeline */}
        {Array.isArray(sound.genreEvolution) && sound.genreEvolution.length > 0 && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowGenreEvolution(!showGenreEvolution)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showGenreEvolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Genre Evolution ({sound.genreEvolution.length} eras)
            </button>
            {showGenreEvolution && (
              <div className="relative pl-4 border-l-2 border-amber-500/30 space-y-3">
                {sound.genreEvolution.map((era, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[calc(1rem+5px)] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <p className="text-sm font-medium text-foreground">{era.era}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(era.genres || []).map((g, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Vocal Textures</Label>
            <TagInput
              tags={sound.vocalTextures}
              onTagsChange={(vocalTextures) => updateDraft('sound', { vocalTextures })}
              placeholder="e.g. raspy, smooth, falsetto..."
              onWandClick={() => fetchTagSuggestions('vocalTextures', sound.vocalTextures)}
              isLoading={loadingField === 'vocalTextures'}
              suggestions={suggestionCache['vocalTextures']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!sound.vocalTextures.includes(val)) {
                  updateDraft('sound', { vocalTextures: [...sound.vocalTextures, val] })
                }
                consumeSuggestion('vocalTextures', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('vocalTextures', i)}
            />
          </div>
          <div className="space-y-2">
            <Label>Production Preferences</Label>
            <TagInput
              tags={sound.productionPreferences}
              onTagsChange={(productionPreferences) => updateDraft('sound', { productionPreferences })}
              placeholder="e.g. lo-fi, minimalist, layered..."
              onWandClick={() => fetchTagSuggestions('productionPreferences', sound.productionPreferences)}
              isLoading={loadingField === 'productionPreferences'}
              suggestions={suggestionCache['productionPreferences']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!sound.productionPreferences.includes(val)) {
                  updateDraft('sound', { productionPreferences: [...sound.productionPreferences, val] })
                }
                consumeSuggestion('productionPreferences', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('productionPreferences', i)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Flow / Delivery Style</Label>
          <MagicWandField
            field="flowStyle"
            section="sound"
            value={sound.flowStyle}
            onChange={(flowStyle) => updateDraft('sound', { flowStyle })}
            placeholder="Describe rap flow or vocal phrasing style..."
            multiline
          />
        </div>

        <div className="space-y-2">
          <Label>Key Collaborators</Label>
          <TagInput
            tags={sound.keyCollaborators}
            onTagsChange={(keyCollaborators) => updateDraft('sound', { keyCollaborators })}
            placeholder="e.g. producers, frequent features..."
            onWandClick={() => fetchTagSuggestions('keyCollaborators', sound.keyCollaborators)}
            isLoading={loadingField === 'keyCollaborators'}
            suggestions={suggestionCache['keyCollaborators']?.suggestions?.slice(0, 5) ?? []}
            onSuggestionClick={(val) => {
              if (!sound.keyCollaborators.includes(val)) {
                updateDraft('sound', { keyCollaborators: [...sound.keyCollaborators, val] })
              }
              consumeSuggestion('keyCollaborators', val)
            }}
            onSuggestionDismiss={(i) => dismissSuggestion('keyCollaborators', i)}
          />
        </div>

        <div className="space-y-2">
          <Label>Artist Influences</Label>
          <TagInput
            tags={sound.artistInfluences}
            onTagsChange={(artistInfluences) => updateDraft('sound', { artistInfluences })}
            placeholder="e.g. Kendrick Lamar, Radiohead, Billie Eilish..."
            onWandClick={() => fetchTagSuggestions('artistInfluences', sound.artistInfluences)}
            isLoading={loadingField === 'artistInfluences'}
            suggestions={suggestionCache['artistInfluences']?.suggestions?.slice(0, 5) ?? []}
            onSuggestionClick={(val) => {
              if (!sound.artistInfluences.includes(val)) {
                updateDraft('sound', { artistInfluences: [...sound.artistInfluences, val] })
              }
              consumeSuggestion('artistInfluences', val)
            }}
            onSuggestionDismiss={(i) => dismissSuggestion('artistInfluences', i)}
          />
        </div>

        <MelodyBiasSlider
          value={sound.melodyBias}
          onChange={(melodyBias) => updateDraft('sound', { melodyBias })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sound-language">Language</Label>
            <Input
              id="sound-language"
              value={sound.language}
              onChange={(e) => updateDraft('sound', { language: e.target.value })}
              placeholder="Primary language..."
            />
          </div>
          <div className="space-y-2">
            <Label>Secondary Languages</Label>
            <TagInput
              tags={sound.secondaryLanguages}
              onTagsChange={(secondaryLanguages) => updateDraft('sound', { secondaryLanguages })}
              placeholder="Add language..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Sound Description</Label>
          <MagicWandField
            field="soundDescription"
            section="sound"
            value={sound.soundDescription}
            onChange={(soundDescription) => updateDraft('sound', { soundDescription })}
            placeholder="Describe the overall sound..."
            multiline
          />
        </div>
      </CardContent>
    </Card>
  )
}
