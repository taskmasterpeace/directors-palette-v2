'use client'

import React, { memo, useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Film, Trash2, Wand2, ZoomIn } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ShotAnimationConfig, AnimationModel } from '../types'
import { Textarea } from "@/components/ui/textarea"
import { CompactVideoCard } from './CompactVideoCard'
import { FullscreenImageViewModal } from './FullscreenImageViewModal'
import { VideoGalleryService } from '../services/gallery.service'
import { generateAnimationPrompt } from '../services/animation-prompt.service'
import { ANIMATION_MODELS } from '../config/models.config'
import { toast } from '@/hooks/use-toast'
import type { ReferenceEditorExport } from '@/features/shot-creator/components/reference-editor'

interface CompactShotCardProps {
  config: ShotAnimationConfig
  maxReferenceImages: number
  supportsLastFrame: boolean
  selectedModel: AnimationModel
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
  selectedModel,
  onUpdate,
  onDelete,
  onManageReferences,
  onManageLastFrame,
  onRetryVideo
}: CompactShotCardProps) => {
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)

  const handleToggleSelect = () => {
    onUpdate({ ...config, includeInBatch: !config.includeInBatch })
  }

  // Determine mode based on whether prompt box has text
  const wandMode = config.prompt?.trim() ? 'enhance' as const : 'generate' as const
  const wandTooltip = wandMode === 'generate' ? 'Generate animation prompt' : 'Enhance animation prompt'

  const handleGenerateAnimationPrompt = async () => {
    setIsGeneratingPrompt(true)
    try {
      const modelConfig = ANIMATION_MODELS[selectedModel]
      const result = await generateAnimationPrompt(config.imageUrl, {
        originalPrompt: config.originalPrompt,
        existingPrompt: wandMode === 'enhance' ? config.prompt : undefined,
        mode: wandMode,
        promptStyle: modelConfig?.promptStyle,
      })
      onUpdate({ ...config, prompt: result.animationPrompt })
      toast({
        title: wandMode === 'generate' ? 'Prompt Generated' : 'Prompt Enhanced',
        description: wandMode === 'generate'
          ? 'AI animation prompt has been added.'
          : 'Your prompt has been enhanced.',
      })
    } catch (error) {
      console.error('Failed to generate animation prompt:', error)
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Could not generate animation prompt.',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingPrompt(false)
    }
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

  const handleAnnotationComplete = (result: ReferenceEditorExport) => {
    const updates: Partial<ShotAnimationConfig> = {
      imageUrl: result.imageDataUrl,
    }
    // If annotations include context, prepend to prompt
    if (result.annotationContext && result.hasAnnotations) {
      const prefix = `[${result.annotationContext}] `
      const currentPrompt = config.prompt || ''
      updates.prompt = currentPrompt.startsWith('[') ? currentPrompt.replace(/^\[.*?\]\s*/, prefix) : prefix + currentPrompt
    }
    onUpdate({ ...config, ...updates })
  }

  return (
    <>
      <Card
        className={`h-full flex flex-col bg-card/50 border-2 transition-all hover:border-border touch-manipulation ${config.includeInBatch ? 'border-primary' : 'border-border'
          }`}
      >
        {/* Image with Checkbox Overlay - Constrained height on mobile */}
        <div className="relative aspect-square max-h-[180px] sm:max-h-none bg-background group overflow-hidden">
          <Image
            src={config.imageUrl}
            alt={config.imageName}
            fill
            className="object-cover"
          />

          {/* Selection Overlay */}
          {config.includeInBatch && (
            <div className="absolute inset-0 bg-primary/10" />
          )}

          {/* Zoom overlay on hover */}
          <div
            className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors cursor-pointer flex items-center justify-center z-[5]"
            onClick={() => setIsFullscreenOpen(true)}
          >
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
          </div>

          {/* Larger checkbox touch target for mobile */}
          <div className="absolute top-2 left-2 z-10">
            <div
              onClick={(e) => { e.stopPropagation(); handleToggleSelect() }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95 transition-transform cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={config.includeInBatch ? "Deselect shot" : "Select shot"}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleSelect() }}
            >
              <Checkbox
                checked={config.includeInBatch}
                onCheckedChange={handleToggleSelect}
                className="bg-white/90 border-white w-6 h-6 sm:w-5 sm:h-5 pointer-events-none"
              />
            </div>
          </div>
          {/* Video Status Badge - Top Right */}
          {config.generatedVideos && config.generatedVideos.length > 0 && (
            <div className="absolute top-2 right-2 z-10">
              {config.generatedVideos.some(v => v.status === 'processing') && (
                <Badge className="bg-primary text-white text-xs flex items-center gap-1">
                  <LoadingSpinner size="xs" color="current" />
                  Processing
                </Badge>
              )}
              {config.generatedVideos.every(v => v.status === 'completed') && (
                <Badge className="bg-emerald-600 text-white text-xs">
                  {config.generatedVideos.length} Video{config.generatedVideos.length > 1 ? 's' : ''}
                </Badge>
              )}
              {config.generatedVideos.some(v => v.status === 'failed') && (
                <Badge className="bg-primary text-white text-xs">
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
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="min-w-[44px] min-h-[44px] w-11 h-11 sm:h-8 sm:w-8 bg-primary/90 hover:bg-primary active:bg-primary text-white touch-manipulation active:scale-95 transition-transform"
              aria-label="Delete shot"
            >
              <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>
          </div>

          {/* Last Frame Thumbnail - Bottom Left */}
          {supportsLastFrame && config.lastFrameImage && (
            <div className="absolute bottom-2 left-2 z-10 group/lastframe">
              <div className="relative w-12 h-12 sm:w-10 sm:h-10 rounded border-2 border-amber-500 overflow-hidden bg-black/50 cursor-pointer hover:scale-110 transition-transform">
                <img
                  src={config.lastFrameImage}
                  alt="Last frame"
                  className="w-full h-full object-cover"
                  onClick={(e) => { e.stopPropagation(); onManageLastFrame() }}
                />
                {/* Remove button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate({ ...config, lastFrameImage: undefined })
                  }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover/lastframe:opacity-100 transition-opacity"
                  aria-label="Remove last frame"
                >
                  ×
                </button>
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-[8px] text-black font-bold text-center py-0.5">
                  END
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card Content - Tighter spacing on mobile */}
        <div className="px-2 sm:px-3 py-1 sm:py-0 space-y-1 sm:space-y-2">
          <p className="text-xs text-foreground truncate font-medium">
            {config.imageName}
          </p>
          {/* Prompt Textarea with AI Generate Button */}
          <div className="relative">
            <Textarea
              value={config.prompt}
              onChange={(e) => onUpdate({ ...config, prompt: e.target.value })}
              placeholder="Describe the animation..."
              className="bg-secondary text-white text-sm sm:text-xs min-h-[80px] sm:min-h-[100px] resize-none touch-manipulation focus:ring-2 focus:ring-ring transition-shadow p-2 pr-10"
            />
            {/* AI Generate/Enhance Button - Always visible */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleGenerateAnimationPrompt}
              disabled={isGeneratingPrompt}
              className="absolute top-1 right-1 w-8 h-8 bg-secondary hover:bg-muted text-primary border border-primary/30 touch-manipulation"
              aria-label={wandTooltip}
              title={wandTooltip}
            >
              {isGeneratingPrompt ? (
                <LoadingSpinner size="xs" color="current" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
            </Button>
          </div>
          {/* Action Buttons - Compact on mobile */}
          <div className="flex w-full items-center gap-1 sm:gap-2 pb-2">
            {/* Reference Images Button */}
            <div className="w-1/2">
              {maxReferenceImages > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onManageReferences}
                  className="min-h-[36px] h-9 sm:h-8 px-2 w-full text-xs bg-secondary/50 hover:bg-secondary active:bg-muted text-primary border border-primary/30 touch-manipulation active:scale-95 transition-transform"
                  aria-label="Manage reference images"
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  <span>Refs</span>
                  {config.referenceImages.length > 0 && (
                    <Badge className="ml-1 h-4 px-1 text-[10px] bg-primary">
                      {config.referenceImages.length}
                    </Badge>
                  )}
                </Button>
              )}
            </div>

            {/* Last Frame Button - Only show when no last frame is set */}
            <div className="w-1/2">
              {supportsLastFrame && !config.lastFrameImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onManageLastFrame}
                  className="min-h-[36px] h-9 sm:h-8 px-2 w-full text-xs bg-secondary/50 hover:bg-secondary active:bg-muted text-primary border border-primary/30 touch-manipulation active:scale-95 transition-transform"
                  aria-label="Add last frame"
                >
                  <Film className="w-3 h-3 mr-1" />
                  <span>+ End</span>
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

      {/* Fullscreen Image Viewer */}
      <FullscreenImageViewModal
        imageUrl={config.imageUrl}
        imageName={config.imageName}
        open={isFullscreenOpen}
        onOpenChange={setIsFullscreenOpen}
        onAnnotationComplete={handleAnnotationComplete}
      />
    </>
  )
}

// Memoize component - only re-render if config changes
export const CompactShotCard = memo(CompactShotCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.config.id === nextProps.config.id &&
    prevProps.config.prompt === nextProps.config.prompt &&
    prevProps.config.originalPrompt === nextProps.config.originalPrompt &&
    prevProps.config.includeInBatch === nextProps.config.includeInBatch &&
    prevProps.config.imageUrl === nextProps.config.imageUrl &&
    prevProps.config.referenceImages.length === nextProps.config.referenceImages.length &&
    prevProps.config.generatedVideos.length === nextProps.config.generatedVideos.length &&
    prevProps.config.lastFrameImage === nextProps.config.lastFrameImage &&
    prevProps.maxReferenceImages === nextProps.maxReferenceImages &&
    prevProps.supportsLastFrame === nextProps.supportsLastFrame &&
    prevProps.selectedModel === nextProps.selectedModel
  )
})
