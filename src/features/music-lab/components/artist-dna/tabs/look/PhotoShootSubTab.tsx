'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Camera } from 'lucide-react'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import {
  PHOTO_SHOOT_CATEGORIES,
  getScenesByCategory,
  type PhotoShootCategory,
  type PhotoShootScene,
} from '../../../../services/photo-shoot.service'
import { logger } from '@/lib/logger'

export function PhotoShootSubTab() {
  const { draft, addGalleryItem } = useArtistDnaStore()
  const look = draft.look
  const [activeCategory, setActiveCategory] = useState<PhotoShootCategory>('wardrobe')
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<{ url: string; prompt: string; aspectRatio: string } | null>(null)

  const scenes = getScenesByCategory(activeCategory)
  const hasCharacterSheet = !!look.characterSheetUrl

  const handleGenerate = async (scene: PhotoShootScene) => {
    setGeneratingId(scene.id)
    setLastGenerated(null)
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
          setLastGenerated({ url: data.url, prompt: data.prompt, aspectRatio: data.aspectRatio })
          // Auto-save to gallery
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

  return (
    <div className="space-y-3">
      {/* Warning if no character sheet */}
      {!hasCharacterSheet && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-400">
            Generate a character sheet first for best results. Photo shoots use it as the identity reference.
          </p>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {PHOTO_SHOOT_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            size="sm"
            variant={activeCategory === cat.id ? 'default' : 'outline'}
            onClick={() => {
              setActiveCategory(cat.id)
              setLastGenerated(null)
            }}
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

      {/* Last generated result */}
      {lastGenerated && !generatingId && (
        <div className="space-y-2">
          <div className="rounded-lg overflow-hidden border border-border/40">
            <img
              src={lastGenerated.url}
              alt="Photo shoot result"
              className="w-full h-auto"
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60 break-words">
            Saved to Gallery
          </p>
        </div>
      )}
    </div>
  )
}
