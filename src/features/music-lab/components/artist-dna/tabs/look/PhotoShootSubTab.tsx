'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Camera, X, ShieldCheck } from 'lucide-react'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import {
  PHOTO_SHOOT_CATEGORIES,
  getScenesByCategory,
  type PhotoShootCategory,
  type PhotoShootScene,
} from '../../../../services/photo-shoot.service'
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
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [recentPhotos, setRecentPhotos] = useState<RecentPhoto[]>([])
  const [fullscreenPhoto, setFullscreenPhoto] = useState<RecentPhoto | null>(null)

  const scenes = getScenesByCategory(activeCategory)
  const hasCharacterSheet = !!look.characterSheetUrl

  const handleGenerate = async (scene: PhotoShootScene) => {
    setGeneratingId(scene.id)
    try {
      const res = await fetch('/api/artist-dna/generate-photo-shoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
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
            sceneId: scene.id,
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

  // Hard gate: no character sheet = disabled
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
      {/* Character sheet confirmation */}
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

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {PHOTO_SHOOT_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            onClick={() => setActiveCategory(cat.id)}
            className="h-7 text-xs"
          >
            <span className="mr-1">{cat.icon}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Scene cards */}
      <div className="grid grid-cols-2 gap-2">
        {scenes.map((scene) => {
          const isGenerating = generatingId === scene.id
          return (
            <button
              key={scene.id}
              onClick={() => handleGenerate(scene)}
              disabled={!!generatingId}
              className="text-left rounded-lg border border-border/40 bg-muted/10 hover:bg-muted/20 p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{scene.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{scene.description}</p>
                  <span className="text-[10px] text-muted-foreground/60 mt-1 inline-block">
                    {scene.aspectRatio}
                  </span>
                </div>
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0 mt-0.5" />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Generating indicator */}
      {generatingId && (
        <div className="rounded-lg border border-border/40 bg-muted/20 flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Generating photo shoot...</p>
          </div>
        </div>
      )}

      {/* Recent photos gallery grid */}
      {recentPhotos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground font-medium">Recent shots</p>
          <div className="grid grid-cols-3 gap-2">
            {recentPhotos.map((photo, i) => (
              <div
                key={`${photo.sceneId}-${photo.generatedAt}-${i}`}
                className="relative group rounded-lg overflow-hidden border border-border/40 cursor-pointer bg-muted/10"
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

      {/* Fullscreen dialog */}
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
