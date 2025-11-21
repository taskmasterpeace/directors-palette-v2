'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ImageIcon, CheckCircle2, List, Grid3x3 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pagination } from "@/features/shot-creator"

interface GalleryImage {
  id: string
  url: string
  name: string
  createdAt: Date
}

interface GallerySelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (images: GalleryImage[]) => void
  galleryImages: GalleryImage[]
  currentPage: number
  totalPages: number  
  onPageChange: (page: number) => Promise<void>
}

export function GallerySelectModal({
  isOpen,
  onClose,
  onSelect,
  galleryImages,
  currentPage,
  totalPages,
  onPageChange,
}: GallerySelectModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid') 

  const handleToggleImage = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const allCurrentPageSelected = galleryImages.every(img => selectedIds.has(img.id))

    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        galleryImages.forEach(img => newSet.delete(img.id))
        return newSet
      })
    } else {
      // Select all on current page
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        galleryImages.forEach(img => newSet.add(img.id))
        return newSet
      })
    }
  }

  const handleConfirm = () => {
    const selected = galleryImages.filter(img => selectedIds.has(img.id))
    onSelect(selected)
    setSelectedIds(new Set())
    onClose()
  }

  const handleCancel = () => {
    setSelectedIds(new Set())
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl bg-slate-900 border-slate-700 text-white safe-bottom">
        <DialogHeader>
          <DialogTitle>Add from Gallery</DialogTitle>
          <DialogDescription className="text-slate-400">
            Select images from your gallery to animate
          </DialogDescription>
        </DialogHeader>

        {/* Selection Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-3 border-b border-slate-700 p-4 sm:p-0">
          <div className="flex items-center gap-3 touch-manipulation">
            <Checkbox
              id="select-all"
              checked={galleryImages.length > 0 && galleryImages.every(img => selectedIds.has(img.id))}
              onCheckedChange={handleSelectAll}
              className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            />
            <label htmlFor="select-all" className="text-sm text-slate-300 cursor-pointer">
              Select All
            </label>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
            {selectedIds.size > 1 && (
              <Badge variant="outline" className="border-red-600 text-red-400">
                {selectedIds.size} selected
              </Badge>
            )}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')}>
              <TabsList className="bg-slate-800 border border-slate-700 rounded-lg h-11 sm:h-9 touch-manipulation">
                <TabsTrigger
                  value="grid"
                  className="flex items-center gap-2 px-4 sm:px-3 min-h-[44px] sm:min-h-0 data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-300"
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="flex items-center gap-2 px-4 sm:px-3 min-h-[44px] sm:min-h-0 data-[state=active]:bg-red-600 data-[state=active]:text-white text-slate-300"
                >
                  <List className="w-4 h-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Gallery Grid */}
        <ScrollArea className="h-[60vh] sm:h-[500px] px-2 sm:px-0 sm:pr-4">
          {galleryImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <ImageIcon className="w-16 h-16 mb-4" />
              <p>No images in gallery</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 p-4 sm:p-0">
              {galleryImages.map((image) => {
                const isSelected = selectedIds.has(image.id)
                return (
                  <div
                    key={image.id}
                    onClick={() => handleToggleImage(image.id)}
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${isSelected
                      ? 'border-red-500 ring-2 ring-red-500/30'
                      : 'border-slate-700 hover:border-slate-600'
                      }`}
                  >
                    <div className="relative aspect-square bg-slate-800">
                      <Image src={image.url} alt={image.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 53vw" className="object-cover" />
                      <div
                        className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-red-500/20' : 'bg-black/0 group-hover:bg-black/20'
                          }`}
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1.5 sm:p-1">
                          <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <Checkbox checked={isSelected} className="bg-white/90 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" />
                      </div>
                    </div>
                    <div className="p-3 sm:p-2 bg-slate-800/90">
                      <p className="text-sm sm:text-xs text-slate-300 truncate">{image.name}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-4 p-4 sm:p-0">
              {galleryImages.map((image) => {
                const isSelected = selectedIds.has(image.id)
                return (
                  <div
                    key={image.id}
                    onClick={() => handleToggleImage(image.id)}
                    className={`flex items-center gap-3 p-3 sm:p-2 rounded-md border-2 cursor-pointer transition-all touch-manipulation ${isSelected
                      ? 'border-red-500 bg-slate-800/80'
                      : 'border-slate-700 hover:border-slate-600'
                      }`}
                  >
                    <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded overflow-hidden bg-slate-800 flex-shrink-0">
                      <Image src={image.url} alt={image.name} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 53vw" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-sm text-slate-200 truncate">{image.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Checkbox checked={isSelected} className="bg-white/90 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" />
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 px-4 sm:px-0">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </div>
        )}

        <DialogFooter className="gap-2 px-4 sm:px-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="bg-slate-800 border-slate-600 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-700 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}
            {selectedIds.size === 1 ? 'Image' : 'Images'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
