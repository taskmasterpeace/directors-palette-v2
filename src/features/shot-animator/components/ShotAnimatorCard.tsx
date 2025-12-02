'use client'

import React from 'react'
import Image from 'next/image'
import { X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ShotAnimationConfig } from '../types'
import { CompactVideoCard } from './CompactVideoCard'

interface ShotAnimatorCardProps {
  config: ShotAnimationConfig
  maxReferenceImages: number
  supportsLastFrame: boolean
  onUpdate: (config: ShotAnimationConfig) => void
  onRemove: () => void
}

export function ShotAnimatorCard({
  config,
  maxReferenceImages,
  supportsLastFrame,
  onUpdate,
  onRemove
}: ShotAnimatorCardProps) {
  const handlePromptChange = (value: string) => {
    onUpdate({ ...config, prompt: value })
  }

  const handleIncludeChange = (checked: boolean) => {
    onUpdate({ ...config, includeInBatch: checked })
  }

  const handleAddReferenceImage = (imageUrl: string) => {
    if (config.referenceImages.length < maxReferenceImages) {
      onUpdate({
        ...config,
        referenceImages: [...config.referenceImages, imageUrl]
      })
    }
  }

  const handleRemoveReferenceImage = (index: number) => {
    const newReferenceImages = config.referenceImages.filter((_, i) => i !== index)
    onUpdate({ ...config, referenceImages: newReferenceImages })
  }

  const handleSetLastFrameImage = (imageUrl: string) => {
    onUpdate({ ...config, lastFrameImage: imageUrl })
  }

  const handleRemoveLastFrameImage = () => {
    onUpdate({ ...config, lastFrameImage: undefined })
  }

  const handleDeleteGeneratedVideo = (galleryId: string) => {
    onUpdate({
      ...config,
      generatedVideos: config.generatedVideos.filter(v => v.galleryId !== galleryId)
    })
  }

  // File upload handler (placeholder - will be implemented with actual upload logic)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'reference' | 'lastFrame') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // TODO: Implement actual file upload logic
    // For now, using object URL as placeholder
    const file = files[0]
    const imageUrl = URL.createObjectURL(file)

    if (type === 'reference') {
      handleAddReferenceImage(imageUrl)
    } else {
      handleSetLastFrameImage(imageUrl)
    }
  }

  return (
    <Card className="bg-card/50 border-border hover:border-border transition-colors">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            <div className="relative w-32 h-32 bg-background rounded-lg overflow-hidden">
              <Image
                src={config.imageUrl}
                alt={config.imageName}
                fill
                className="object-cover"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate w-32">{config.imageName}</p>
          </div>

          {/* Configuration */}
          <div className="flex-1 space-y-4">
            {/* Prompt */}
            <div>
              <Label className="text-white text-sm mb-2 block">Prompt</Label>
              <Textarea
                value={config.prompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                placeholder="Describe the animation for this shot..."
                className="bg-background border-border text-white placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>

            {/* Reference Images */}
            {maxReferenceImages > 0 && (
              <div>
                <Label className="text-white text-sm mb-2 block">
                  Reference Images ({config.referenceImages.length}/{maxReferenceImages})
                </Label>
                <div className="flex gap-2 flex-wrap items-center">
                  {config.referenceImages.map((imgUrl, index) => (
                    <div key={index} className="relative group w-16 h-16">
                      <Image
                        src={imgUrl}
                        alt={`Reference ${index + 1}`}
                        fill
                        className="object-cover rounded border border-border"
                      />
                      <button
                        onClick={() => handleRemoveReferenceImage(index)}
                        className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {config.referenceImages.length < maxReferenceImages && (
                    <label className="w-16 h-16 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-border transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'reference')}
                        className="hidden"
                      />
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Last Frame Image */}
            {supportsLastFrame && (
              <div>
                <Label className="text-white text-sm mb-2 block">Last Frame Image (Optional)</Label>
                {config.lastFrameImage ? (
                  <div className="relative group w-24 h-24">
                    <Image
                      src={config.lastFrameImage}
                      alt="Last frame"
                      fill
                      className="object-cover rounded border border-border"
                    />
                    <button
                      onClick={handleRemoveLastFrameImage}
                      className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="w-24 h-24 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-border transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'lastFrame')}
                      className="hidden"
                    />
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </label>
                )}
              </div>
            )}

            {/* Generated Videos */}
            {config.generatedVideos && config.generatedVideos.length > 0 && (
              <div>
                <CompactVideoCard
                  videos={config.generatedVideos}
                  onDeleteVideo={handleDeleteGeneratedVideo}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`include-${config.id}`}
                  checked={config.includeInBatch}
                  onCheckedChange={handleIncludeChange}
                />
                <Label htmlFor={`include-${config.id}`} className="text-sm text-white cursor-pointer">
                  Include in batch
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
