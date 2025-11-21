'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ReferenceImagesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (images: string[]) => void
  initialImages: string[]
  maxImages: number
  imageName: string
}

export function ReferenceImagesModal({
  isOpen,
  onClose,
  onSave,
  initialImages,
  maxImages,
  imageName
}: ReferenceImagesModalProps) {
  const [images, setImages] = useState<string[]>(initialImages)

  useEffect(() => {
    setImages(initialImages)
  }, [initialImages, isOpen])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = maxImages - images.length
    const filesToAdd = Array.from(files).slice(0, remainingSlots)

    // TODO: Implement actual file upload
    const newUrls = filesToAdd.map((file) => URL.createObjectURL(file))
    setImages((prev) => [...prev, ...newUrls])
    e.target.value = ''
  }

  const handleRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave(images)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl bg-slate-900 border-slate-700 text-white safe-bottom">
        <DialogHeader>
          <DialogTitle>Manage Reference Images</DialogTitle>
          <DialogDescription className="text-slate-400">
            {imageName} • {images.length}/{maxImages} images
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-4 sm:px-6 max-h-[60vh] sm:max-h-none overflow-y-auto">
          <Label className="text-white">Reference Images</Label>
          <p className="text-sm text-slate-400">
            Add up to {maxImages} reference images to guide the animation style
          </p>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {images.map((imgUrl, index) => (
              <div key={index} className="relative group aspect-square touch-manipulation">
                <Image
                  src={imgUrl}
                  alt={`Reference ${index + 1}`}
                  fill
                  className="object-cover rounded border border-slate-600"
                />
                <button
                  onClick={() => handleRemove(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 sm:p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center touch-manipulation"
                  aria-label="Remove image"
                >
                  <X className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ))}

            {/* Upload Slot */}
            {images.length < maxImages && (
              <label className="aspect-square border-2 border-dashed border-slate-600 rounded flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 transition-colors touch-manipulation min-h-[120px]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 sm:w-8 sm:h-8 text-slate-500 mb-2" />
                <span className="text-sm sm:text-xs text-slate-500">Upload</span>
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 px-4 sm:px-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-800 border-slate-600 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Save References
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
