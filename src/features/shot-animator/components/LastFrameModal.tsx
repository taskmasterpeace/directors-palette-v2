'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
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

interface LastFrameModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (imageUrl?: string) => void
  initialImage?: string
  imageName: string
}

export function LastFrameModal({
  isOpen,
  onClose,
  onSave,
  initialImage,
  imageName
}: LastFrameModalProps) {
  const [image, setImage] = useState<string | undefined>(initialImage)

  useEffect(() => {
    setImage(initialImage)
  }, [initialImage, isOpen])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert to base64 data URL so it survives localStorage persistence
    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemove = () => {
    setImage(undefined)
  }

  const handleSave = () => {
    onSave(image)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl bg-background border-border text-white safe-bottom">
        <DialogHeader>
          <DialogTitle>Last Frame Image</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {imageName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-4 sm:px-6 max-h-[60vh] sm:max-h-none overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-white">Last Frame Image (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              Specify the ending frame for the animation
            </p>
          </div>

          {/* Image Preview */}
          <div className="flex justify-center">
            {image ? (
              <div className="relative w-full max-w-sm aspect-square sm:w-64 sm:h-64">
                <Image
                  src={image}
                  alt="Last frame"
                  fill
                  className="object-cover rounded border border-border"
                />
                <button
                  onClick={handleRemove}
                  className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-2.5 sm:p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center touch-manipulation"
                  aria-label="Remove image"
                >
                  <X className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <label className="w-full max-w-sm aspect-square sm:w-64 sm:h-64 border-2 border-dashed border-border rounded flex flex-col items-center justify-center cursor-pointer hover:border-border transition-colors touch-manipulation">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-16 h-16 sm:w-12 sm:h-12 text-muted-foreground mb-4" />
                <span className="text-base sm:text-sm text-muted-foreground">Upload Last Frame</span>
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 px-4 sm:px-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-card border-border min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 min-h-[44px] touch-manipulation w-full sm:w-auto"
          >
            Save Last Frame
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
