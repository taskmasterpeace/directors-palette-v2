'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Waves } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MelodyBiasSlider } from '../MelodyBiasSlider'
import { TagInput } from '../TagInput'
import { MagicWandField } from '../MagicWandField'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

const RHYME_DENSITY_OPTIONS = ['Sparse', 'Light', 'Moderate', 'Dense', 'Multisyllabic']
const LINE_LENGTH_OPTIONS = ['Short (4-6 words)', 'Medium (6-10 words)', 'Long (10-14 words)', 'Variable']

export function FlowTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const flow = draft.flow

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Waves className="w-5 h-5" />
          Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Rhyme Density</Label>
          <Select
            value={flow.rhymeDensity}
            onValueChange={(rhymeDensity) => updateDraft('flow', { rhymeDensity })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select density..." />
            </SelectTrigger>
            <SelectContent>
              {RHYME_DENSITY_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Flow Patterns</Label>
          <TagInput
            tags={flow.flowPatterns}
            onTagsChange={(flowPatterns) => updateDraft('flow', { flowPatterns })}
            placeholder="e.g. triplet, double-time, laid-back..."
          />
        </div>

        <MelodyBiasSlider
          value={flow.melodyBias}
          onChange={(melodyBias) => updateDraft('flow', { melodyBias })}
        />

        <div className="space-y-2">
          <Label>Average Line Length</Label>
          <Select
            value={flow.avgLineLength}
            onValueChange={(avgLineLength) => updateDraft('flow', { avgLineLength })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select line length..." />
            </SelectTrigger>
            <SelectContent>
              {LINE_LENGTH_OPTIONS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="flow-language">Language</Label>
          <Input
            id="flow-language"
            value={flow.language}
            onChange={(e) => updateDraft('flow', { language: e.target.value })}
            placeholder="Primary language..."
          />
        </div>

        <div className="space-y-2">
          <Label>Secondary Languages</Label>
          <TagInput
            tags={flow.secondaryLanguages}
            onTagsChange={(secondaryLanguages) => updateDraft('flow', { secondaryLanguages })}
            placeholder="Add language..."
          />
        </div>

        <div className="space-y-2">
          <Label>Flow Description</Label>
          <MagicWandField
            field="flowDescription"
            section="flow"
            value={flow.flowDescription}
            onChange={(flowDescription) => updateDraft('flow', { flowDescription })}
            placeholder="Describe the flow style..."
            multiline
          />
        </div>
      </CardContent>
    </Card>
  )
}
