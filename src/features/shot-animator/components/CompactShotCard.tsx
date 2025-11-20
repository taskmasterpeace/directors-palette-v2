'use client'

import React, { memo } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Film, Trash2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ShotAnimationConfig } from '../types'
import { Textarea } from "@/components/ui/textarea"
import { CompactVideoCard } from './CompactVideoCard'
import { VideoGalleryService } from '../services/gallery.service'
import { toast } from '@/hooks/use-toast'

interface CompactShotCardProps {
  config: ShotAnimationConfig
  maxReferenceImages: number
  supportsLastFrame: boolean
  onUpdate: (config: ShotAnimationConfig) => void
  onDelete: () => void
  onManageReferences: () => void
  onManageLastFrame: () => void
  onRetryVideo?: (galleryId: string) => void
}

const CompactShotCardComponent = ({
  config,
  maxReferenceImages,
  supportsLastFrame,
  onUpdate,
  onDelete,
  onManageReferences,
  onManageLastFrame,
  onRetryVideo
}: CompactShotCardProps) => {
  const handleToggleSelect = () => {
    onUpdate({ ...config, includeInBatch: !config.includeInBatch })
  }

  const handleDeleteGeneratedVideo = async (galleryId: string) => {
    try {
      // Delete from Supabase
      const result = await VideoGalleryService.deleteVideo(galleryId)

      if (result.success) {
        // Update local state to remove the video
        onUpdate({
          ...config,
          generatedVideos: config.generatedVideos.filter(v => v.galleryId !== galleryId)
        })
        toast({
          title: 'Video Deleted',
          description: 'The video has been successfully deleted.',
        })
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete video. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      toast({
        title: 'Delete Error',
        description: 'An unexpected error occurred while deleting the video.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card
      className={`h-full flex flex-col bg-slate-800/50 border-2 transition-all hover:border-slate-600 touch-manipulation ${config.includeInBatch ? 'border-red-500' : 'border-slate-700'
        }`}
    >
      {/* Image with Checkbox Overlay */}
      <div className="relative aspect-square bg-slate-900 group">
        <Image
          src={config.imageUrl}
          alt={config.imageName}
          width={400}
          height={400}
          className="object-cover"
        />

        {/* Selection Overlay */}
        {config.includeInBatch && (
          <div className="absolute inset-0 bg-red-500/10" />
        )}

        {/* Larger checkbox touch target for mobile */}
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={handleToggleSelect}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95 transition-transform"
            aria-label={config.includeInBatch ? "Deselect shot" : "Select shot"}
          >
            <Checkbox
              checked={config.includeInBatch}
              onCheckedChange={handleToggleSelect}
              className="bg-white/90 border-white w-6 h-6 sm:w-5 sm:h-5 pointer-events-none"
            />
          </button>
        </div>
        {/* Video Status Badge - Top Right */}
        {config.generatedVideos && config.generatedVideos.length > 0 && (
          <div className="absolute top-2 right-2 z-10">
            {config.generatedVideos.some(v => v.status === 'processing') && (
              <Badge className="bg-red-600 text-white text-xs flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing
              </Badge>
            )}
            {config.generatedVideos.every(v => v.status === 'completed') && (
              <Badge className="bg-green-600 text-white text-xs">
                {config.generatedVideos.length} Video{config.generatedVideos.length > 1 ? 's' : ''}
              </Badge>
            )}
            {config.generatedVideos.some(v => v.status === 'failed') && (
              <Badge className="bg-red-600 text-white text-xs">
                Failed
              </Badge>
            )}
          </div>
        )}

        {/* Delete Button - Bottom Right - Larger touch target for mobile */}
        <div className="absolute bottom-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="min-w-[44px] min-h-[44px] w-11 h-11 sm:h-8 sm:w-8 bg-red-500/90 hover:bg-red-600 active:bg-red-700 text-white touch-manipulation active:scale-95 transition-transform"
            aria-label="Delete shot"
          >
            <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Card Content */}
      <div className="px-3 space-y-2">
        <p className="text-xs text-slate-300 truncate font-medium">
          {config.imageName}
        </p>
        {/* Prompt Textarea - Enhanced for mobile */}
        <Textarea
          value={config.prompt}
          onChange={(e) => onUpdate({ ...config, prompt: e.target.value })}
          placeholder="Describe the animation..."
          className="bg-slate-700 text-white text-sm sm:text-xs min-h-[120px] sm:min-h-[100px] resize-none touch-manipulation focus:ring-2 focus:ring-red-500 transition-shadow p-3 sm:p-2"
        />
        {/* Action Buttons - Enhanced for mobile touch */}
        <div className="flex w-full items-center gap-2 sm:gap-2">
          {/* Reference Images Button */}
          <div className="w-1/2">
            {maxReferenceImages > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onManageReferences}
                className="min-h-[44px] h-11 sm:h-8 px-3 sm:px-2 w-full text-sm sm:text-xs bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 text-red-400 border border-red-500/30 touch-manipulation active:scale-95 transition-transform"
                aria-label="Manage reference images"
              >
                <ImageIcon className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                <span className="hidden sm:inline">Refs</span>
                <span className="sm:hidden">References</span>
                {config.referenceImages.length > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 sm:h-4 sm:px-1 text-xs bg-red-600">
                    {config.referenceImages.length}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Last Frame Button */}
          <div className="w-1/2">
            {supportsLastFrame && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onManageLastFrame}
                className="min-h-[44px] h-11 sm:h-8 px-3 sm:px-2 w-full text-sm sm:text-xs bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 text-red-400 border border-red-500/30 touch-manipulation active:scale-95 transition-transform"
                aria-label="Manage last frame"
              >
                <Film className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
                Last Frame
                {config.lastFrameImage && (
                  <Badge className="ml-1 h-5 px-1.5 sm:h-4 sm:px-1 text-xs bg-red-600">1</Badge>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Generated Videos */}
        {config.generatedVideos && config.generatedVideos.length > 0 && (
          <div className="mt-2">
            <CompactVideoCard
              videos={config.generatedVideos}
              onDeleteVideo={handleDeleteGeneratedVideo}
              onRetryVideo={onRetryVideo}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

// Memoize component - only re-render if config changes
export const CompactShotCard = memo(CompactShotCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.config.id === nextProps.config.id &&
    prevProps.config.prompt === nextProps.config.prompt &&
    prevProps.config.includeInBatch === nextProps.config.includeInBatch &&
    prevProps.config.imageUrl === nextProps.config.imageUrl &&
    prevProps.config.referenceImages.length === nextProps.config.referenceImages.length &&
    prevProps.config.generatedVideos.length === nextProps.config.generatedVideos.length &&
    prevProps.maxReferenceImages === nextProps.maxReferenceImages &&
    prevProps.supportsLastFrame === nextProps.supportsLastFrame
  )
})
