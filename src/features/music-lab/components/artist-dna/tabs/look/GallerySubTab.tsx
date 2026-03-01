'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Download, Trash2, X, ImageIcon } from 'lucide-react'
import { useArtistDnaStore } from '../../../../store/artist-dna.store'
import type { ArtistGalleryItem, GalleryItemType } from '../../../../types/artist-dna.types'

type FilterType = 'all' | GalleryItemType

const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'character-sheet', label: 'Character Sheets' },
  { id: 'portrait', label: 'Portraits' },
  { id: 'photo-shoot', label: 'Photo Shoots' },
]

export function GallerySubTab() {
  const { draft, removeGalleryItem } = useArtistDnaStore()
  const gallery = Array.isArray(draft.look.gallery) ? draft.look.gallery : []
  const [filter, setFilter] = useState<FilterType>('all')
  const [fullscreenItem, setFullscreenItem] = useState<ArtistGalleryItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const filtered = filter === 'all' ? gallery : gallery.filter((g) => g.type === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleDownload = async (item: ArtistGalleryItem) => {
    try {
      const response = await fetch(item.url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${item.type}-${item.id.slice(0, 8)}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // silent fail
    }
  }

  const handleDelete = (id: string) => {
    removeGalleryItem(id)
    setConfirmDelete(null)
    if (fullscreenItem?.id === id) setFullscreenItem(null)
  }

  const typeBadge = (type: GalleryItemType) => {
    const labels: Record<GalleryItemType, string> = {
      'character-sheet': 'Sheet',
      'portrait': 'Portrait',
      'photo-shoot': 'Photo',
    }
    return labels[type] || type
  }

  if (gallery.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">
            No images yet. Generate a character sheet or photo shoot to populate your gallery.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.id}
            size="sm"
            variant={filter === opt.id ? 'default' : 'outline'}
            onClick={() => setFilter(opt.id)}
            className="h-7 text-xs"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="relative group rounded-lg overflow-hidden border border-border/40 cursor-pointer bg-muted/10"
            onClick={() => setFullscreenItem(item)}
          >
            <img
              src={item.url}
              alt={`${item.type} image`}
              className="w-full aspect-square object-cover"
            />
            {/* Type badge */}
            <span className="absolute top-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
              {typeBadge(item.type)}
            </span>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-1 opacity-0 group-hover:opacity-100">
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(item)
                  }}
                  className="p-1 bg-black/60 rounded text-white hover:bg-black/80"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmDelete(item.id)
                  }}
                  className="p-1 bg-black/60 rounded text-red-400 hover:bg-red-900/50"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen modal */}
      <Dialog open={!!fullscreenItem} onOpenChange={(open) => !open && setFullscreenItem(null)}>
        <DialogContent
          className="!w-screen !h-screen !max-w-none !max-h-none sm:!max-w-none p-0 bg-black border-none rounded-none overflow-hidden inset-0 translate-x-0 translate-y-0 top-0 left-0"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {fullscreenItem && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="fixed top-4 right-4 text-white hover:bg-white/20 z-50 bg-black/50 backdrop-blur-sm rounded-full w-10 h-10 p-0"
                onClick={() => setFullscreenItem(null)}
              >
                <X className="w-6 h-6" />
              </Button>
              <div className="flex flex-col w-full h-full">
                <div className="relative flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
                  <img
                    src={fullscreenItem.url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                  {/* Action bar */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 z-20">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                      onClick={() => handleDownload(fullscreenItem)}
                    >
                      <Download className="h-4 w-4 mr-1" />Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-black/60 text-red-400 border-red-600/50 hover:bg-red-900/50"
                      onClick={() => setConfirmDelete(fullscreenItem.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Delete Image</DialogTitle>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this image? This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button size="sm" variant="destructive" onClick={() => confirmDelete && handleDelete(confirmDelete)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
