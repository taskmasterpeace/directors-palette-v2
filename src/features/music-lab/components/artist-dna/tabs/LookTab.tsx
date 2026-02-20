'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Palette } from 'lucide-react'
import { MagicWandField } from '../MagicWandField'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

export function LookTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const look = draft.look

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5" />
          Look
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="look-skin-tone">Skin Tone</Label>
          <Input
            id="look-skin-tone"
            value={look.skinTone}
            onChange={(e) => updateDraft('look', { skinTone: e.target.value })}
            placeholder="Skin tone..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="look-hair">Hair Style</Label>
          <Input
            id="look-hair"
            value={look.hairStyle}
            onChange={(e) => updateDraft('look', { hairStyle: e.target.value })}
            placeholder="Hair style..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="look-fashion">Fashion Style</Label>
          <Input
            id="look-fashion"
            value={look.fashionStyle}
            onChange={(e) => updateDraft('look', { fashionStyle: e.target.value })}
            placeholder="Fashion style..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="look-jewelry">Jewelry</Label>
          <Input
            id="look-jewelry"
            value={look.jewelry}
            onChange={(e) => updateDraft('look', { jewelry: e.target.value })}
            placeholder="Jewelry..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="look-tattoos">Tattoos</Label>
          <Input
            id="look-tattoos"
            value={look.tattoos}
            onChange={(e) => updateDraft('look', { tattoos: e.target.value })}
            placeholder="Tattoos..."
          />
        </div>

        <div className="space-y-2">
          <Label>Visual Description</Label>
          <MagicWandField
            field="visualDescription"
            section="look"
            value={look.visualDescription}
            onChange={(visualDescription) => updateDraft('look', { visualDescription })}
            placeholder="Overall visual vibe..."
            multiline
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="look-ref-image">Reference Image URL</Label>
          <Input
            id="look-ref-image"
            value={look.referenceImageUrl || ''}
            onChange={(e) => updateDraft('look', { referenceImageUrl: e.target.value || undefined })}
            placeholder="https://..."
            type="url"
          />
        </div>
      </CardContent>
    </Card>
  )
}
