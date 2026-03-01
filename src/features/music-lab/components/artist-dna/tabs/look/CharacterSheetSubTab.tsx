'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Download } from 'lucide-react'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import { logger } from '@/lib/logger'

export function CharacterSheetSubTab() {
  const { draft, updateDraft, addGalleryItem } = useArtistDnaStore()
  const look = draft.look
  const [generatingSheet, setGeneratingSheet] = useState(false)
  const [generatingPortrait, setGeneratingPortrait] = useState(false)

  const hasLookFields = look.skinTone || look.hairStyle || look.fashionStyle || look.visualDescription
  const hasNameAndLook = (draft.identity.stageName || draft.identity.realName) && hasLookFields

  const handleGenerate = async () => {
    setGeneratingSheet(true)
    try {
      // Phase 1: Generate character sheet
      const sheetRes = await fetch('/api/artist-dna/generate-character-sheet', {
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
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json()
        if (sheetData.url) {
          updateDraft('look', { characterSheetUrl: sheetData.url })
          // Auto-save to gallery
          addGalleryItem({
            url: sheetData.url,
            type: 'character-sheet',
            prompt: sheetData.prompt,
            aspectRatio: '16:9',
          })
        }
      }
    } catch (error) {
      logger.musicLab.error('Failed to generate character sheet', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setGeneratingSheet(false)
    }

    // Phase 2: Auto-generate portrait
    setGeneratingPortrait(true)
    try {
      const portraitRes = await fetch('/api/artist-dna/generate-portrait', {
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
      if (portraitRes.ok) {
        const portraitData = await portraitRes.json()
        if (portraitData.url) {
          updateDraft('look', { portraitUrl: portraitData.url })
          addGalleryItem({
            url: portraitData.url,
            type: 'portrait',
            aspectRatio: '1:1',
          })
        }
      }
    } catch (error) {
      logger.musicLab.error('Failed to generate portrait', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setGeneratingPortrait(false)
    }
  }

  const handleDownload = async () => {
    if (!look.characterSheetUrl) return
    try {
      const response = await fetch(look.characterSheetUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${draft.identity.stageName || 'artist'}-character-sheet.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // silent fail
    }
  }

  const isGenerating = generatingSheet || generatingPortrait

  return (
    <div className="space-y-3">
      {/* Header + actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Character Sheet</p>
          <p className="text-[11px] text-muted-foreground">
            Full reference sheet + auto-portrait. Used as identity anchor for photo shoots.
          </p>
        </div>
        <div className="flex gap-2">
          {look.characterSheetUrl && !isGenerating && (
            <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 text-xs">
              <Download className="w-3 h-3 mr-1" />Download
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating || !hasNameAndLook}
            className="h-7 text-xs"
          >
            {generatingSheet ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sheet...</>
            ) : generatingPortrait ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Portrait...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-1" />{look.characterSheetUrl ? 'Regenerate' : 'Generate'}</>
            )}
          </Button>
        </div>
      </div>

      {/* Character sheet display */}
      {look.characterSheetUrl && !generatingSheet && (
        <div className="rounded-lg overflow-hidden border border-border/40">
          <img
            src={look.characterSheetUrl}
            alt="Artist character sheet"
            className="w-full h-auto"
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      )}

      {/* Loading state */}
      {generatingSheet && (
        <div className="rounded-lg border border-border/40 bg-muted/20 flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Generating character sheet...</p>
          </div>
        </div>
      )}

      {/* No character sheet yet */}
      {!look.characterSheetUrl && !generatingSheet && (
        <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground">
              {hasNameAndLook
                ? 'Click Generate to create your character sheet'
                : 'Fill out the Profile tab first (name + look fields)'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
