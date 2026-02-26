'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useUnifiedGalleryStore } from '@/features/shot-creator/store/unified-gallery-store'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'


const log = createLogger('Workflow')
interface InputNodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (imageUrl: string, type: 'upload' | 'reference') => void
  currentImageUrl?: string
}

export function InputNodeModal({
  isOpen,
  onClose,
  onSelectImage,
  currentImageUrl: _currentImageUrl
}: InputNodeModalProps) {
  const [tab, setTab] = useState<'upload' | 'gallery'>('upload')
  const [uploading, setUploading] = useState(false)
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { images, refreshGallery } = useUnifiedGalleryStore()

  // Load gallery when switching to gallery tab
  const handleTabChange = (newTab: 'upload' | 'gallery') => {
    setTab(newTab)
    if (newTab === 'gallery' && images.length === 0) {
      refreshGallery()
    }
  }

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate image
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB')
      return
    }

    setUploading(true)

    try {
      // Create blob URL for preview
      const blobUrl = URL.createObjectURL(file)

      // TODO: Upload to storage service
      // For now, just use the blob URL
      onSelectImage(blobUrl, 'upload')
      toast.success('Image added to node')
      onClose()
    } catch (error) {
      log.error('Upload failed', { error: error instanceof Error ? error.message : String(error) })
      toast.error('Failed to add image')
    } finally {
      setUploading(false)
    }
  }

  // Handle gallery selection
  const handleGallerySelect = () => {
    if (!selectedGalleryImage) return
    onSelectImage(selectedGalleryImage, 'reference')
    toast.success('Image added from gallery')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Add Input Image</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 mb-4">
          <button
            onClick={() => handleTabChange('upload')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'upload'
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload
          </button>
          <button
            onClick={() => handleTabChange('gallery')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === 'gallery'
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-2" />
            From Gallery
          </button>
        </div>

        {/* Upload Tab */}
        {tab === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center cursor-pointer hover:border-amber-500 transition-colors"
            >
              <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-white font-medium mb-1">Click to upload image</p>
              <p className="text-sm text-zinc-400">PNG, JPG, WEBP up to 10MB</p>
            </div>

            {uploading && (
              <div className="flex items-center justify-center gap-2 text-amber-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {tab === 'gallery' && (
          <div className="space-y-4">
            {images.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400">No images in gallery</p>
                <p className="text-sm text-zinc-500 mt-1">
                  Generate images first, then select them here
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                  {images.slice(0, 30).map((image) => (
                    <div
                      key={image.id}
                      onClick={() => setSelectedGalleryImage(image.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        selectedGalleryImage === image.url
                          ? 'border-amber-500 ring-2 ring-amber-500/20'
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.prompt?.substring(0, 50) || 'Gallery image'}
                        className="w-full h-full object-cover"
                      />
                      {selectedGalleryImage === image.url && (
                        <div className="absolute inset-0 bg-amber-500/10 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleGallerySelect}
                  disabled={!selectedGalleryImage}
                  className="w-full"
                >
                  Select Image
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
