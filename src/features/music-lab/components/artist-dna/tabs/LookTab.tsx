'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Palette, User, Loader2, Upload, Sparkles, Check, X } from 'lucide-react'
import { MagicWandField } from '../MagicWandField'
import { useArtistDnaStore } from '../../../store/artist-dna.store'

interface ModelResult {
  model: string
  label: string
  icon: string
  url: string | null
  error: string | null
}

export function LookTab() {
  const { draft, updateDraft } = useArtistDnaStore()
  const look = draft.look
  const [generatingPortrait, setGeneratingPortrait] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generatingSheet, setGeneratingSheet] = useState(false)
  const [sheetResults, setSheetResults] = useState<ModelResult[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        if (data.url) {
          updateDraft('look', { portraitUrl: data.url })
        }
      }
    } catch (error) {
      console.error('Failed to generate portrait:', error)
    } finally {
      setGeneratingPortrait(false)
    }
  }

  const handleUploadPortrait = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) return
    if (file.size > 10 * 1024 * 1024) return // 10MB limit

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-file', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          updateDraft('look', { portraitUrl: data.url })
        }
      }
    } catch (error) {
      console.error('Failed to upload portrait:', error)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleVisualizeArtist = async () => {
    setGeneratingSheet(true)
    setSheetResults([])
    try {
      const res = await fetch('/api/artist-dna/generate-character-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageName: draft.identity.stageName,
          realName: draft.identity.realName,
          ethnicity: draft.identity.ethnicity,
          genres: draft.sound.genres,
          skinTone: look.skinTone,
          hairStyle: look.hairStyle,
          fashionStyle: look.fashionStyle,
          jewelry: look.jewelry,
          tattoos: look.tattoos,
          visualDescription: look.visualDescription,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.results) {
          setSheetResults(data.results)
          // Auto-select the first successful result
          const first = data.results.find((r: ModelResult) => r.url)
          if (first?.url) {
            updateDraft('look', { characterSheetUrl: first.url })
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate character sheet:', error)
    } finally {
      setGeneratingSheet(false)
    }
  }

  const handlePickSheet = (url: string) => {
    updateDraft('look', { characterSheetUrl: url })
  }

  const hasLookFields = look.skinTone || look.hairStyle || look.fashionStyle || look.visualDescription
  const hasNameAndLook = (draft.identity.stageName || draft.identity.realName) && hasLookFields

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5" />
          Look
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
              {look.portraitUrl ? 'Portrait generated from your Look profile' : 'Generate a portrait from your Look fields'}
            </p>
            <div className="flex gap-2">
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
                  <>{look.portraitUrl ? 'Regenerate Portrait' : 'Generate Portrait'}</>
                )}
              </Button>
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

        {/* Character Sheet section */}
        <div className="pt-2 border-t border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Character Sheet</p>
              <p className="text-[11px] text-muted-foreground">
                {sheetResults.length > 0 ? 'Pick your favorite below' : 'Generates across 4 models — pick the best'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleVisualizeArtist}
              disabled={generatingSheet || !hasNameAndLook}
              className="h-7 text-xs"
            >
              {generatingSheet ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-1" />{look.characterSheetUrl ? 'Regenerate Sheet' : 'Visualize Artist'}</>
              )}
            </Button>
          </div>

          {/* Multi-model results grid */}
          {sheetResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {sheetResults.map((result) => {
                const isSelected = result.url === look.characterSheetUrl
                return (
                  <div key={result.model} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{result.icon}</span>
                      <span className="text-[11px] font-medium">{result.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-green-400 ml-auto" />}
                    </div>
                    {result.url ? (
                      <button
                        type="button"
                        onClick={() => handlePickSheet(result.url!)}
                        className={`rounded-md overflow-hidden border-2 transition-all cursor-pointer w-full ${
                          isSelected
                            ? 'border-green-400 ring-1 ring-green-400/30'
                            : 'border-border/40 hover:border-primary/50'
                        }`}
                      >
                        <img
                          src={result.url}
                          alt={`${result.label} character sheet`}
                          className="w-full h-auto"
                          style={{ aspectRatio: '16/9' }}
                        />
                      </button>
                    ) : (
                      <div className="rounded-md border border-border/40 bg-muted/20 flex items-center justify-center p-3" style={{ aspectRatio: '16/9' }}>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <X className="w-3 h-3" />
                          <span>{result.error || 'Failed'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Selected sheet (full-width preview) */}
          {look.characterSheetUrl && !generatingSheet && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Selected sheet:</p>
              <div className="rounded-lg overflow-hidden border border-border/40">
                <img
                  src={look.characterSheetUrl}
                  alt="Artist character sheet"
                  className="w-full h-auto"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
