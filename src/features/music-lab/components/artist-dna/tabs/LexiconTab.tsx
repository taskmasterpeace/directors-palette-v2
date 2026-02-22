'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BookOpen } from 'lucide-react'
import { TagInput } from '../TagInput'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function LexiconTab() {
  const { draft, updateDraft, suggestionCache, setSuggestions, consumeSuggestion, dismissSuggestion } =
    useArtistDnaStore()
  const lexicon = draft.lexicon

  const [loadingField, setLoadingField] = useState<string | null>(null)

  const fetchTagSuggestions = async (field: string, existing: string[]) => {
    setLoadingField(field)
    try {
      const res = await fetch('/api/artist-dna/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          section: 'lexicon',
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
          <BookOpen className="w-5 h-5" />
          Lexicon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Signature Phrases</Label>
            <TagInput
              tags={lexicon.signaturePhrases}
              onTagsChange={(signaturePhrases) => updateDraft('lexicon', { signaturePhrases })}
              placeholder="Catchphrases, mottos..."
              onWandClick={() => fetchTagSuggestions('signaturePhrases', lexicon.signaturePhrases)}
              isLoading={loadingField === 'signaturePhrases'}
              suggestions={suggestionCache['signaturePhrases']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!lexicon.signaturePhrases.includes(val)) {
                  updateDraft('lexicon', { signaturePhrases: [...lexicon.signaturePhrases, val] })
                }
                consumeSuggestion('signaturePhrases', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('signaturePhrases', i)}
            />
          </div>
          <div className="space-y-2">
            <Label>Slang</Label>
            <TagInput
              tags={lexicon.slang}
              onTagsChange={(slang) => updateDraft('lexicon', { slang })}
              placeholder="Regional/personal slang..."
              onWandClick={() => fetchTagSuggestions('slang', lexicon.slang)}
              isLoading={loadingField === 'slang'}
              suggestions={suggestionCache['slang']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!lexicon.slang.includes(val)) {
                  updateDraft('lexicon', { slang: [...lexicon.slang, val] })
                }
                consumeSuggestion('slang', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('slang', i)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ad-Libs</Label>
            <TagInput
              tags={lexicon.adLibs}
              onTagsChange={(adLibs) => updateDraft('lexicon', { adLibs })}
              placeholder="e.g. yeah, skrrt, uh..."
              onWandClick={() => fetchTagSuggestions('adLibs', lexicon.adLibs)}
              isLoading={loadingField === 'adLibs'}
              suggestions={suggestionCache['adLibs']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!lexicon.adLibs.includes(val)) {
                  updateDraft('lexicon', { adLibs: [...lexicon.adLibs, val] })
                }
                consumeSuggestion('adLibs', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('adLibs', i)}
            />
          </div>
          <div className="space-y-2">
            <Label>Banned Words</Label>
            <TagInput
              tags={lexicon.bannedWords}
              onTagsChange={(bannedWords) => updateDraft('lexicon', { bannedWords })}
              placeholder="Words to never use..."
              onWandClick={() => fetchTagSuggestions('bannedWords', lexicon.bannedWords)}
              isLoading={loadingField === 'bannedWords'}
              suggestions={suggestionCache['bannedWords']?.suggestions?.slice(0, 5) ?? []}
              onSuggestionClick={(val) => {
                if (!lexicon.bannedWords.includes(val)) {
                  updateDraft('lexicon', { bannedWords: [...lexicon.bannedWords, val] })
                }
                consumeSuggestion('bannedWords', val)
              }}
              onSuggestionDismiss={(i) => dismissSuggestion('bannedWords', i)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
