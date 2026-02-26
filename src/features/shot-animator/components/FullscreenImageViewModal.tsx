'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Download, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReferenceEditor, ReferenceEditorExport } from '@/features/shot-creator/components/reference-editor'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface FullscreenImageViewModalProps {
  imageUrl: string
  imageName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAnnotationComplete?: (result: ReferenceEditorExport) => void
}

export function FullscreenImageViewModal({
  imageUrl,
  imageName,
  open,
  onOpenChange,
  onAnnotationComplete,
}: FullscreenImageViewModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${imageName || 'shot'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      logger.shotCreator.error('Failed to download image', { error: error instanceof Error ? error.message : String(error) })
      toast({
        title: 'Download failed',
        description: 'Could not download image.',
        variant: 'destructive'
      })
    }
  }

  const handleEditExport = (result: ReferenceEditorExport) => {
    if (onAnnotationComplete) {
      onAnnotationComplete(result)
    }
    setIsEditing(false)
    onOpenChange(false)
    toast({
      title: 'Image Updated',
      description: result.hasAnnotations
        ? 'Annotations applied to shot image'
        : 'Image updated'
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setIsEditing(false); onOpenChange(v) }}>
      <DialogContent
        className="!w-screen !h-screen !max-w-none !max-h-none sm:!max-w-none p-0 bg-black border-none rounded-none overflow-hidden inset-0 translate-x-0 translate-y-0 top-0 left-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{imageName}</DialogTitle>

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 right-16 md:right-4 text-white hover:bg-white/20 z-50 bg-black/50 backdrop-blur-sm rounded-full w-10 h-10 p-0"
          onClick={() => { setIsEditing(false); onOpenChange(false) }}
        >
          <X className="w-6 h-6" />
        </Button>

        {isEditing ? (
          <div className="w-full h-full">
            <ReferenceEditor
              backgroundImageUrl={imageUrl}
              onExport={handleEditExport}
              onClose={() => setIsEditing(false)}
            />
          </div>
        ) : (
          <div className="flex flex-col w-full h-full">
            <div className="relative flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
              <Image
                src={imageUrl}
                alt={imageName}
                className="object-contain"
                fill
                sizes="100vw"
                priority
              />

              {/* Action bar */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 z-20">
                {onAnnotationComplete && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
