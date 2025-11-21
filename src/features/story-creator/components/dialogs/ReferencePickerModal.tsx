'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { ImageIcon, CheckCircle2, Grid3x3, List } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GalleryService } from '@/lib/services/gallery.service'
import type { GalleryRow } from '@/lib/db/types'

interface GalleryMetadata {
  prompt?: string
  [key: string]: unknown
}

interface ReferencePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageUrl: string) => void
  entityName: string
  entityType: 'character' | 'location'
}

/**
 * Reference Picker Modal for Story Creator
 * Allows selecting a reference image from gallery for characters/locations
 */
export function ReferencePickerModal({
  isOpen,
  onClose,
  onSelect,
  entityName,
  entityType
}: ReferencePickerModalProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [galleryImages, setGalleryImages] = useState<GalleryRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadGallery()
    }
  }, [isOpen])

  const loadGallery = async () => {
    setLoading(true)
    try {
      const images = await GalleryService.loadUserGallery('image')
      setGalleryImages(images)
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleImage = (url: string) => {
    setSelectedImageUrl(url === selectedImageUrl ? null : url)
  }

  const handleConfirm = () => {
    if (selectedImageUrl) {
      onSelect(selectedImageUrl)
      setSelectedImageUrl(null)
      onClose()
    }
  }

  const handleCancel = () => {
    setSelectedImageUrl(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl bg-slate-900 border-slate-700 text-white safe-bottom">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-red-500" />
            Assign Reference Image
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select a reference image for <span className="text-white font-semibold">{entityName}</span>
            {' '}({entityType})
          </DialogDescription>
        </DialogHeader>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-slate-700">
          <div className="text-sm text-slate-400">
            {selectedImageUrl ? '1 image selected' : 'No image selected'}
          </div>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
            <TabsList className="bg-slate-800 border border-slate-700 rounded-lg h-9">
              <TabsTrigger
                value="grid"
                className="flex items-center gap-2 px-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-300"
              >
                <Grid3x3 className="w-4 h-4" />
                Grid
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="flex items-center gap-2 px-3 data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-300"
              >
                <List className="w-4 h-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Gallery Grid/List */}
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
            </div>
          ) : galleryImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p>No images in gallery</p>
              <p className="text-sm text-slate-600 mt-2">Generate some images first</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {galleryImages.map((image) => {
                const isSelected = selectedImageUrl === image.public_url
                return (
                  <button
                    key={image.id}
                    onClick={() => handleToggleImage(image.public_url || '')}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-red-500 ring-2 ring-red-500 ring-offset-2 ring-offset-slate-900'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Image
                      src={image.public_url || ''}
                      alt={(image.metadata as GalleryMetadata)?.prompt || 'Gallery image'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {galleryImages.map((image) => {
                const isSelected = selectedImageUrl === image.public_url
                return (
                  <button
                    key={image.id}
                    onClick={() => handleToggleImage(image.public_url || '')}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={image.public_url || ''}
                        alt={(image.metadata as GalleryMetadata)?.prompt || 'Gallery image'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {(image.metadata as GalleryMetadata)?.prompt || 'Untitled'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(image.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="border-slate-600 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedImageUrl}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Assign Reference
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
