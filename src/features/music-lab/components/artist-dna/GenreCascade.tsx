'use client'

import { Label } from '@/components/ui/label'
import { TagInput } from './TagInput'
import { getGenres, getSubgenres, getMicrogenres } from '../../data/genre-taxonomy.data'
import { useArtistDnaStore } from '../../store/artist-dna.store'

export function GenreCascade() {
  const { draft, updateDraft, suggestionCache, setSuggestions, consumeSuggestion, dismissSuggestion } =
    useArtistDnaStore()

  const allGenres = getGenres()
  const availableSubgenres = getSubgenres(draft.sound.genres)
  const availableMicrogenres = getMicrogenres(draft.sound.subgenres)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Genres</Label>
        <TagInput
          tags={draft.sound.genres}
          onTagsChange={(genres) => updateDraft('sound', { genres })}
          placeholder="Add genre..."
          suggestions={
            draft.sound.genres.length === 0
              ? allGenres.slice(0, 5)
              : suggestionCache['genres']?.suggestions?.slice(0, 5) ?? []
          }
          onSuggestionClick={(val) => {
            if (!draft.sound.genres.includes(val)) {
              updateDraft('sound', { genres: [...draft.sound.genres, val] })
            }
            consumeSuggestion('genres', val)
          }}
          onSuggestionDismiss={(i) => dismissSuggestion('genres', i)}
          onWandClick={() => {
            setSuggestions('genres', allGenres.filter((g) => !draft.sound.genres.includes(g)))
          }}
        />
      </div>

      {draft.sound.genres.length > 0 && (
        <div className="space-y-2">
          <Label>Sub-genres</Label>
          <TagInput
            tags={draft.sound.subgenres}
            onTagsChange={(subgenres) => updateDraft('sound', { subgenres })}
            placeholder="Add sub-genre..."
            suggestions={
              availableSubgenres.length > 0
                ? availableSubgenres.filter((s) => !draft.sound.subgenres.includes(s)).slice(0, 5)
                : []
            }
            onSuggestionClick={(val) => {
              if (!draft.sound.subgenres.includes(val)) {
                updateDraft('sound', { subgenres: [...draft.sound.subgenres, val] })
              }
            }}
          />
        </div>
      )}

      {draft.sound.subgenres.length > 0 && (
        <div className="space-y-2">
          <Label>Micro-genres</Label>
          <TagInput
            tags={draft.sound.microgenres}
            onTagsChange={(microgenres) => updateDraft('sound', { microgenres })}
            placeholder="Add micro-genre..."
            suggestions={
              availableMicrogenres.length > 0
                ? availableMicrogenres.filter((m) => !draft.sound.microgenres.includes(m)).slice(0, 5)
                : []
            }
            onSuggestionClick={(val) => {
              if (!draft.sound.microgenres.includes(val)) {
                updateDraft('sound', { microgenres: [...draft.sound.microgenres, val] })
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
