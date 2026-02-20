'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { BookOpen } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '../TagInput'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

const PLACEMENT_OPTIONS = ['Start of bar', 'End of bar', 'Between bars', 'Random', 'After punchlines']
const VOCAB_LEVELS = ['Street', 'Conversational', 'Literary', 'Academic', 'Mixed']

export function LexiconTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const lexicon = draft.lexicon

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5" />
          Lexicon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Signature Phrases</Label>
          <TagInput
            tags={lexicon.signaturePhrases}
            onTagsChange={(signaturePhrases) => updateDraft('lexicon', { signaturePhrases })}
            placeholder="Catchphrases, mottos..."
          />
        </div>

        <div className="space-y-2">
          <Label>Slang</Label>
          <TagInput
            tags={lexicon.slang}
            onTagsChange={(slang) => updateDraft('lexicon', { slang })}
            placeholder="Regional/personal slang..."
          />
        </div>

        <div className="space-y-2">
          <Label>Banned Words</Label>
          <TagInput
            tags={lexicon.bannedWords}
            onTagsChange={(bannedWords) => updateDraft('lexicon', { bannedWords })}
            placeholder="Words to never use..."
          />
        </div>

        <div className="space-y-2">
          <Label>Ad-Libs</Label>
          <TagInput
            tags={lexicon.adLibs}
            onTagsChange={(adLibs) => updateDraft('lexicon', { adLibs })}
            placeholder="e.g. yeah, skrrt, uh..."
          />
        </div>

        <div className="space-y-2">
          <Label>Ad-Lib Placement</Label>
          <Select
            value={lexicon.adLibPlacement}
            onValueChange={(adLibPlacement) => updateDraft('lexicon', { adLibPlacement })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select placement..." />
            </SelectTrigger>
            <SelectContent>
              {PLACEMENT_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vocabulary Level</Label>
          <Select
            value={lexicon.vocabularyLevel}
            onValueChange={(vocabularyLevel) => updateDraft('lexicon', { vocabularyLevel })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select level..." />
            </SelectTrigger>
            <SelectContent>
              {VOCAB_LEVELS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
