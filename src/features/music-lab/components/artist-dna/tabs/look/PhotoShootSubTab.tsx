'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader2, X, ShieldCheck, ChevronDown, Sparkles } from 'lucide-react'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import {
  PHOTO_SHOOT_CATEGORIES,
  getScenesByCategory,
  buildSubScenePrompt,
} from '../../../../services/photo-shoot.service'
import type { PhotoShootCategory } from '../../../../types/photo-shoot.types'
import type { PhotoShootScene, PhotoShootSubScene } from '../../../../types/photo-shoot.types'
import { logger } from '@/lib/logger'

interface RecentPhoto {
  url: string
  prompt: string
  aspectRatio: string
  sceneId: string
  generatedAt: string
}

export function PhotoShootSubTab() {
  const { draft, addGalleryItem } = useArtistDnaStore()
  const look = draft.look
  const [activeCategory, setActiveCategory] = useState<PhotoShootCategory>('wardrobe')
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({})
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([])
  const [fullscreenPhoto, setFullscreenPhoto] = useState<RecentPhoto | null>(null)

  const scenes = getScenesByCategory(activeCategory)
  const hasCharacterSheet = !!look.characterSheetUrl

  // ---------------------------------------------------------------------------
  // Field value helpers
  // ---------------------------------------------------------------------------
  const updateFieldValue = (subSceneId: string, fieldId: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [subSceneId]: {
        ...(prev[subSceneId] || {}),
        [fieldId]: value,
      },
    }))
  }

  const getFieldValue = (subSceneId: string, fieldId: string, defaultValue?: string) => {
    return fieldValues[subSceneId]?.[fieldId] || defaultValue || ''
  }

  // ---------------------------------------------------------------------------
  // Accordion toggle — only one scene open at a time
  // ---------------------------------------------------------------------------
  const toggleScene = (sceneId: string) => {
    setExpandedSceneId(prev => prev === sceneId ? null : sceneId)
  }

  // ---------------------------------------------------------------------------
  // Generate handler
  // ---------------------------------------------------------------------------
  const handleGenerate = async (scene: PhotoShootScene, subScene: PhotoShootSubScene) => {
    const subFieldValues = { ...(fieldValues[subScene.id] || {}) }
    // Apply default values for fields not explicitly set
    for (const field of subScene.fields) {
      if (field.defaultValue && !subFieldValues[field.id]) {
        subFieldValues[field.id] = field.defaultValue
      }
    }

    const result = buildSubScenePrompt(scene.id, subScene.id, draft, subFieldValues)
    if (!result) return

    setGeneratingId(subScene.id)
    try {
      const res = await fetch('/api/artist-dna/generate-photo-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: result.prompt,
          aspectRatio: result.aspectRatio,
          dna: draft,
          characterSheetUrl: look.characterSheetUrl || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.url) {
          const photo: RecentPhoto = {
            url: data.url,
            prompt: data.prompt,
            aspectRatio: data.aspectRatio,
            sceneId: subScene.id,
            generatedAt: new Date().toISOString(),
          }
          setRecentPhotos((prev) => [photo, ...prev].slice(0, 12))
          addGalleryItem({
            url: data.url,
            type: 'photo-shoot',
            category: scene.category,
            prompt: data.prompt,
            aspectRatio: data.aspectRatio,
          })
        }
      }
    } catch (error) {
      logger.musicLab.error('Failed to generate photo shoot', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setGeneratingId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Hard gate: no character sheet = disabled
  // ---------------------------------------------------------------------------
  if (!hasCharacterSheet) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-6 text-center space-y-3">
          <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm font-medium text-amber-300">
            Character sheet required
          </p>
          <p className="text-xs text-amber-400/80 max-w-xs mx-auto">
            Generate a character sheet first — it&apos;s the identity anchor for all photo shoots. Tattoos, body type, and features stay consistent across every shot.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ── Character sheet confirmation bar ── */}
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
        <img
          src={look.characterSheetUrl!}
          alt="Character sheet"
          className="w-10 h-10 rounded object-cover border border-border/40 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Identity locked
          </p>
          <p className="text-[10px] text-muted-foreground/60 truncate">
            Character sheet active — photos will match
          </p>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1 flex-wrap">
        {PHOTO_SHOOT_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            onClick={() => { setActiveCategory(cat.id); setExpandedSceneId(null) }}
            className="h-7 text-xs"
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* ── Scene accordion list ── */}
      <div className="space-y-1.5">
        {scenes.map((scene) => {
          const isExpanded = expandedSceneId === scene.id

          return (
            <div key={scene.id}>
              {/* Accordion header */}
              <button
                type="button"
                onClick={() => toggleScene(scene.id)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer group ${
                  isExpanded
                    ? 'bg-muted/15 border-border/50'
                    : 'border-border/30 bg-muted/5 hover:bg-muted/15 hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-left truncate">{scene.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 text-left truncate">
                      {scene.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/20 text-muted-foreground/60">
                    {scene.subScenes.length} shots
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground/60 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded sub-scenes */}
              {isExpanded && (
                <div className="ml-2 pl-3 border-l-2 border-border/20 space-y-2 mt-2">
                  {scene.subScenes.map((sub) => {
                    const selectFields = sub.fields.filter(f => f.type === 'select')
                    const textFields = sub.fields.filter(f => f.type === 'text')
                    const useGrid = selectFields.length >= 3

                    return (
                      <div
                        key={sub.id}
                        className="rounded-lg border border-border/30 bg-muted/5 p-3 space-y-2.5"
                      >
                        {/* Sub-scene header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium">{sub.label}</p>
                            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                              {sub.description}
                            </p>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground/50 font-mono shrink-0">
                            {sub.aspectRatio}
                          </span>
                        </div>

                        {/* Recipe fields — selects */}
                        {selectFields.length > 0 && (
                          <div className={useGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                            {selectFields.map((field) => (
                              <div key={field.id} className="space-y-1">
                                <label className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider">
                                  {field.label}
                                </label>
                                <select
                                  value={getFieldValue(sub.id, field.id, field.defaultValue)}
                                  onChange={(e) => updateFieldValue(sub.id, field.id, e.target.value)}
                                  className="w-full text-xs bg-muted/10 border border-border/30 rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:border-border/60 focus:ring-1 focus:ring-border/30 transition-colors"
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Recipe fields — text inputs */}
                        {textFields.map((field) => (
                          <div key={field.id} className="space-y-1">
                            <label className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wider">
                              {field.label}
                            </label>
                            <input
                              type="text"
                              value={getFieldValue(sub.id, field.id)}
                              onChange={(e) => updateFieldValue(sub.id, field.id, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full text-xs bg-muted/10 border border-border/30 rounded-md px-2 py-1.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-border/60 focus:ring-1 focus:ring-border/30 transition-colors"
                            />
                          </div>
                        ))}

                        {/* Generate button */}
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(scene, sub)}
                          disabled={!!generatingId}
                          className="h-7 text-xs w-full hover-lift-sm"
                        >
                          {generatingId === sub.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1.5" />
                              Generate &middot; 6 pts
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Generating indicator (global) ── */}
      {generatingId && (
        <div className="rounded-lg border border-border/40 bg-muted/20 flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Generating photo shoot...</p>
          </div>
        </div>
      )}

      {/* ── Recent shots — 4 col grid, smaller thumbs ── */}
      {recentPhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium">Recent shots</p>
          <div className="grid grid-cols-4 gap-1.5">
            {recentPhotos.map((photo, i) => (
              <div
                key={`${photo.sceneId}-${photo.generatedAt}-${i}`}
                className="relative group rounded-md overflow-hidden border border-border/30 cursor-pointer bg-muted/10"
                onClick={() => setFullscreenPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt="Photo shoot result"
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            All photos saved to Gallery tab
          </p>
        </div>
      )}

      {/* ── Fullscreen dialog ── */}
      <Dialog open={!!fullscreenPhoto} onOpenChange={(open) => !open && setFullscreenPhoto(null)}>
        <DialogContent
          className="!w-screen !h-screen !max-w-none !max-h-none sm:!max-w-none p-0 bg-black border-none rounded-none overflow-hidden inset-0 translate-x-0 translate-y-0 top-0 left-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          {fullscreenPhoto && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="fixed top-4 right-4 text-white hover:bg-white/20 z-50 bg-black/50 backdrop-blur-sm rounded-full w-10 h-10 p-0"
                onClick={() => setFullscreenPhoto(null)}
              >
                <X className="w-6 h-6" />
              </Button>
              <div className="flex flex-col w-full h-full">
                <div className="relative flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
                  <img
                    src={fullscreenPhoto.url}
                    alt="Photo shoot full view"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
