'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Download, Link2 } from 'lucide-react'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import { logger } from '@/lib/logger'
import { WARDROBE_STYLES } from '../../../../data/wardrobe-wildcards'

export function CharacterSheetSubTab() {
  const { draft, updateDraft, addGalleryItem, saveArtist } = useArtistDnaStore()
  const look = draft.look
  const [generatingSheet, setGeneratingSheet] = useState(false)
  const [generatingPortrait, setGeneratingPortrait] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceTag, setReferenceTag] = useState<string | null>(null)

  const hasLookFields = look.skinTone || look.hairStyle || look.fashionStyle || look.visualDescription
  const hasNameAndLook = (draft.identity.stageName || draft.identity.realName) && hasLookFields

  const handleGenerate = async () => {
    setError(null)
    setGeneratingSheet(true)
    let sheetSuccess = false
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
          wardrobeStyle: look.wardrobeStyle,
          jewelry: look.jewelry,
          tattoos: look.tattoos,
          visualDescription: look.visualDescription,
        }),
      })
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json()
        if (sheetData.url) {
          updateDraft('look', { characterSheetUrl: sheetData.url })
          addGalleryItem({
            url: sheetData.url,
            type: 'character-sheet',
            prompt: sheetData.prompt,
            aspectRatio: '16:9',
          })
          // Show reference tag created for Shot Creator
          const artistName = draft.identity.stageName || draft.identity.realName || 'artist'
          setReferenceTag(`@${artistName.toLowerCase().replace(/\s+/g, '-')}`)
          sheetSuccess = true
        } else {
          setError('Character sheet generation returned no image. Try again.')
        }
      } else {
        const errData = await sheetRes.json().catch(() => ({ error: 'Unknown error' }))
        setError(`Character sheet failed: ${errData.error || sheetRes.statusText}`)
        logger.musicLab.error('Character sheet API error', { status: sheetRes.status, error: errData })
      }
    } catch (err) {
      setError('Character sheet generation failed. Check your connection and try again.')
      logger.musicLab.error('Failed to generate character sheet', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setGeneratingSheet(false)
    }

    // Phase 2: Auto-generate portrait FROM the character sheet (only if sheet succeeded)
    if (!sheetSuccess) return
    const currentSheetUrl = useArtistDnaStore.getState().draft.look.characterSheetUrl
    setGeneratingPortrait(true)
    try {
      const portraitRes = await fetch('/api/artist-dna/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageName: draft.identity.stageName,
          realName: draft.identity.realName,
          skinTone: look.skinTone,
          hairStyle: look.hairStyle,
          fashionStyle: look.fashionStyle,
          wardrobeStyle: look.wardrobeStyle,
          jewelry: look.jewelry,
          tattoos: look.tattoos,
          visualDescription: look.visualDescription,
          ethnicity: draft.identity.ethnicity,
          characterSheetUrl: currentSheetUrl,
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
    } catch (err) {
      logger.musicLab.error('Failed to generate portrait', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setGeneratingPortrait(false)
    }

    // Auto-save to DB so portrait and character sheet persist across reloads
    if (sheetSuccess) {
      await saveArtist()
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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Character Sheet</p>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Full reference sheet + auto-portrait. Used as identity anchor for photo shoots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {look.characterSheetUrl && !isGenerating && (
              <Button size="sm" variant="outline" onClick={handleDownload} className="h-8 sm:h-7 text-xs">
                <Download className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">Download</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating || !hasNameAndLook}
              className="h-8 sm:h-7 text-xs"
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
        {/* Wardrobe selector — full width row */}
        <select
          value={look.wardrobeStyle}
          onChange={(e) => updateDraft('look', { wardrobeStyle: e.target.value })}
          className="w-full h-8 sm:h-7 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Wardrobe: Use Fashion Style</option>
          {WARDROBE_STYLES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Reference tag indicator */}
      {referenceTag && look.characterSheetUrl && !generatingSheet && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
          <Link2 className="w-3.5 h-3.5 text-emerald-400" />
          <p className="text-xs text-emerald-300">
            Saved to Shot Creator as <span className="font-mono font-semibold">{referenceTag}</span>
          </p>
        </div>
      )}

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
