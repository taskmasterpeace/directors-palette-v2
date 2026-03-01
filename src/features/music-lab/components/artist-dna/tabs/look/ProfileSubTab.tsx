'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, User } from 'lucide-react'
import { MagicWandField } from '../../MagicWandField'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import { logger } from '@/lib/logger'

export function ProfileSubTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const look = draft.look
  const [uploading, setUploading] = useState(false)
  const [generatingPortrait, setGeneratingPortrait] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasLookFields = look.skinTone || look.hairStyle || look.fashionStyle || look.visualDescription

  const handleGeneratePortrait = async () => {
    setGeneratingPortrait(true)
    try {
      const res = await fetch('/api/artist-dna/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skinTone: look.skinTone,
          hairStyle: look.hairStyle,
          fashionStyle: look.fashionStyle,
          jewelry: look.jewelry,
          tattoos: look.tattoos,
          visualDescription: look.visualDescription,
          ethnicity: draft.identity.ethnicity,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) updateDraft('look', { portraitUrl: data.url })
      }
    } catch (error) {
      logger.musicLab.error('Failed to generate portrait', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setGeneratingPortrait(false)
    }
  }

  const handleUploadPortrait = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) return
    if (file.size > 10 * 1024 * 1024) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        if (data.url) updateDraft('look', { portraitUrl: data.url })
      }
    } catch (error) {
      logger.musicLab.error('Failed to upload portrait', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Portrait section */}
      <div className="flex items-center gap-4 pb-2 border-b border-border/30">
        <div className="w-[80px] h-[80px] rounded-lg overflow-hidden bg-muted/30 border border-border/40 flex items-center justify-center shrink-0">
          {look.portraitUrl ? (
            <img src={look.portraitUrl} alt="Artist portrait" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-muted-foreground/30" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">
            {look.portraitUrl ? 'Portrait generated from your Look profile' : 'Auto-generates when you create a character sheet'}
          </p>
          <div className="flex gap-2">
            {look.portraitUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGeneratePortrait}
                disabled={generatingPortrait || !hasLookFields}
                className="h-7 text-xs"
              >
                {generatingPortrait ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                ) : (
                  <>Regenerate Portrait</>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-7 text-xs"
            >
              {uploading ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="w-3 h-3 mr-1" />Upload Photo</>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadPortrait}
            />
          </div>
        </div>
      </div>

      {/* Row 1: Skin Tone | Hair Style | Fashion Style */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Skin Tone</Label>
          <MagicWandField
            field="skinTone"
            section="look"
            value={look.skinTone}
            onChange={(skinTone) => updateDraft('look', { skinTone })}
            placeholder="Skin tone..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hair Style</Label>
          <MagicWandField
            field="hairStyle"
            section="look"
            value={look.hairStyle}
            onChange={(hairStyle) => updateDraft('look', { hairStyle })}
            placeholder="Hair style..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fashion Style</Label>
          <MagicWandField
            field="fashionStyle"
            section="look"
            value={look.fashionStyle}
            onChange={(fashionStyle) => updateDraft('look', { fashionStyle })}
            placeholder="Fashion style..."
          />
        </div>
      </div>

      {/* Row 2: Jewelry | Tattoos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Jewelry</Label>
          <MagicWandField
            field="jewelry"
            section="look"
            value={look.jewelry}
            onChange={(jewelry) => updateDraft('look', { jewelry })}
            placeholder="Jewelry..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tattoos</Label>
          <MagicWandField
            field="tattoos"
            section="look"
            value={look.tattoos}
            onChange={(tattoos) => updateDraft('look', { tattoos })}
            placeholder="Tattoos..."
          />
        </div>
      </div>

      {/* Full width: Visual Description */}
      <div className="space-y-1">
        <Label className="text-xs">Visual Description</Label>
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
  )
}
