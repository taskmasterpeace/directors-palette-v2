'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Skin Tone</Label>
            <MagicWandField
              field="skinTone"
              section="look"
              value={look.skinTone}
              onChange={(skinTone) => updateDraft('look', { skinTone })}
              placeholder="Skin tone..."
            />
          </div>
          <div className="space-y-2">
            <Label>Hair Style</Label>
            <MagicWandField
              field="hairStyle"
              section="look"
              value={look.hairStyle}
              onChange={(hairStyle) => updateDraft('look', { hairStyle })}
              placeholder="Hair style..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fashion Style</Label>
            <MagicWandField
              field="fashionStyle"
              section="look"
              value={look.fashionStyle}
              onChange={(fashionStyle) => updateDraft('look', { fashionStyle })}
              placeholder="Fashion style..."
            />
          </div>
          <div className="space-y-2">
            <Label>Jewelry</Label>
            <MagicWandField
              field="jewelry"
              section="look"
              value={look.jewelry}
              onChange={(jewelry) => updateDraft('look', { jewelry })}
              placeholder="Jewelry..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tattoos</Label>
            <MagicWandField
              field="tattoos"
              section="look"
              value={look.tattoos}
              onChange={(tattoos) => updateDraft('look', { tattoos })}
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
        </div>
      </CardContent>
    </Card>
  )
}
