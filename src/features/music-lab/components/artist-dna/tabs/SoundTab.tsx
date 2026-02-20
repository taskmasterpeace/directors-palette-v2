'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Music2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GenreCascade } from '../GenreCascade'
import { TagInput } from '../TagInput'
import { MagicWandField } from '../MagicWandField'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

const TEMPO_OPTIONS = ['Slow (60-80 BPM)', 'Mid (80-110 BPM)', 'Upbeat (110-140 BPM)', 'Fast (140-170 BPM)', 'Variable']

export function SoundTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const sound = draft.sound

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

        <div className="space-y-2">
          <Label>Vocal Textures</Label>
          <TagInput
            tags={sound.vocalTextures}
            onTagsChange={(vocalTextures) => updateDraft('sound', { vocalTextures })}
            placeholder="e.g. raspy, smooth, falsetto..."
          />
        </div>

        <div className="space-y-2">
          <Label>Tempo</Label>
          <Select
            value={sound.tempoPreference}
            onValueChange={(tempoPreference) => updateDraft('sound', { tempoPreference })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tempo..." />
            </SelectTrigger>
            <SelectContent>
              {TEMPO_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Production Styles</Label>
          <TagInput
            tags={sound.productionStyles}
            onTagsChange={(productionStyles) => updateDraft('sound', { productionStyles })}
            placeholder="e.g. lo-fi, minimalist, layered..."
          />
        </div>

        <div className="space-y-2">
          <Label>Era Influences</Label>
          <TagInput
            tags={sound.eraInfluences}
            onTagsChange={(eraInfluences) => updateDraft('sound', { eraInfluences })}
            placeholder="e.g. 90s, Y2K, modern..."
          />
        </div>

        <div className="space-y-2">
          <Label>Instruments</Label>
          <TagInput
            tags={sound.instruments}
            onTagsChange={(instruments) => updateDraft('sound', { instruments })}
            placeholder="e.g. 808s, guitar, piano..."
          />
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
