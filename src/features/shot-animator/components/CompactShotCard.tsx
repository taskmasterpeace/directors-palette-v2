'use client'

import React, { memo, useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Film, Trash2, Wand2, ZoomIn, Replace, Clapperboard, Info } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ShotAnimationConfig, ShotGeneratedVideo, AnimationModel, ModelSettings } from '../types'
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CompactVideoCard } from './CompactVideoCard'
import { FullscreenImageViewModal } from './FullscreenImageViewModal'
import { VideoGalleryService } from '../services/gallery.service'
import { generateAnimationPrompt } from '../services/animation-prompt.service'
import { ANIMATION_MODELS, getVideoModelIcon } from '../config/models.config'
import { getModelIcon } from '@/features/shot-creator/constants/model-icons'
import { toast } from '@/hooks/use-toast'
import type { ReferenceEditorExport } from '@/features/shot-creator/components/reference-editor'
import { ALLOWED_IMAGE_TYPES, GALLERY_IMAGE_MIME_TYPE } from '../constants/drag-drop.constants'
import { logger } from '@/lib/logger'

interface CompactShotCardProps {
  config: ShotAnimationConfig
  maxReferenceImages: number
  supportsLastFrame: boolean
  selectedModel: AnimationModel
  currentModelSettings?: ModelSettings
  onUpdate: (config: ShotAnimationConfig) => void
  onDelete: () => void
  onManageReferences: () => void
  onManageLastFrame: () => void
  onRetryVideo?: (galleryId: string) => void
  onDropStartFrame?: (imageUrl: string, imageName?: string) => void
  onDropLastFrame?: (imageUrl: string) => void
}

type DropZoneSide = 'left' | 'right' | null

const CompactShotCardComponent = ({
  config,
  maxReferenceImages,
  supportsLastFrame,
  selectedModel,
  currentModelSettings,
  onUpdate,
  onDelete,
  onManageReferences,
  onManageLastFrame: _onManageLastFrame,
  onRetryVideo,
  onDropStartFrame,
  onDropLastFrame,
}: CompactShotCardProps) => {
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [multiShotMode, setMultiShotMode] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const [dropZoneSide, setDropZoneSide] = useState<DropZoneSide>(null)
  const dropZoneSideRef = useRef<DropZoneSide>(null)
  const cardDragCounterRef = useRef(0)
  const imageAreaRef = useRef<HTMLDivElement>(null)
  const recentDropRef = useRef(false)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const lastFrameInputRef = useRef<HTMLInputElement>(null)

  /** Handle file picker for replacing the start frame image */
  const handleReplaceImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      if (url && onDropStartFrame) onDropStartFrame(url, file.name)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [onDropStartFrame])

  /** Handle file picker for setting the last frame image */
  const handleLastFrameFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      if (url && onDropLastFrame) onDropLastFrame(url)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [onDropLastFrame])

  /** Read an image URL from drag data - supports files (base64) or gallery JSON. */
  const readDroppedImage = useCallback((dt: DataTransfer): Promise<{ url: string; name?: string } | null> => {
    // Gallery image drag
    const galleryData = dt.getData(GALLERY_IMAGE_MIME_TYPE)
    if (galleryData) {
      try {
        const parsed = JSON.parse(galleryData)
        return Promise.resolve({ url: parsed.url, name: parsed.name })
      } catch { /* ignore */ }
    }
    // File drag
    const file = Array.from(dt.files).find(f => ALLOWED_IMAGE_TYPES.includes(f.type))
    if (!file) return Promise.resolve(null)
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve({ url: ev.target?.result as string, name: file.name })
      reader.readAsDataURL(file)
    })
  }, [])

  const updateSide = useCallback((side: DropZoneSide) => {
    dropZoneSideRef.current = side
    setDropZoneSide(side)
  }, [])

  const handleImageDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cardDragCounterRef.current++
    if (cardDragCounterRef.current === 1) {
      const rect = imageAreaRef.current?.getBoundingClientRect()
      const initialSide: DropZoneSide = rect ? (e.clientX < rect.left + rect.width / 2 ? 'left' : 'right') : 'left'
      updateSide(initialSide)
    }
  }, [updateSide])

  const handleImageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
    const rect = imageAreaRef.current?.getBoundingClientRect()
    if (rect) {
      const midX = rect.left + rect.width / 2
      const newSide: DropZoneSide = e.clientX < midX ? 'left' : 'right'
      if (dropZoneSideRef.current !== newSide) updateSide(newSide)
    }
  }, [updateSide])

  const handleImageDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cardDragCounterRef.current--
    if (cardDragCounterRef.current <= 0) {
      cardDragCounterRef.current = 0
      updateSide(null)
    }
  }, [updateSide])

  const handleImageDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cardDragCounterRef.current = 0
    updateSide(null)

    // Compute side directly from drop position — most reliable, no stale state issues
    const rect = imageAreaRef.current?.getBoundingClientRect()
    const side: DropZoneSide = rect ? (e.clientX < rect.left + rect.width / 2 ? 'left' : 'right') : 'left'

    // Prevent click-through after drop
    recentDropRef.current = true
    setTimeout(() => { recentDropRef.current = false }, 300)

    const result = await readDroppedImage(e.dataTransfer)
    if (!result) return

    if (side === 'right' && supportsLastFrame && onDropLastFrame) {
      onDropLastFrame(result.url)
    } else if (onDropStartFrame) {
      onDropStartFrame(result.url, result.name)
    }
  }, [supportsLastFrame, onDropStartFrame, onDropLastFrame, readDroppedImage, updateSide])

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
      const audioEnabled = currentModelSettings?.generateAudio && modelConfig?.supportsAudio
      const result = await generateAnimationPrompt(config.imageUrl, {
        originalPrompt: config.originalPrompt,
        existingPrompt: wandMode === 'enhance' ? config.prompt : undefined,
        mode: wandMode,
        promptStyle: modelConfig?.promptStyle,
        audioEnabled: !!audioEnabled,
        multiShot: multiShotMode,
        lastFrameUrl: config.lastFrameImage,
      })
      onUpdate({ ...config, prompt: result.animationPrompt })
      toast({
        title: wandMode === 'generate' ? 'Prompt Generated' : 'Prompt Enhanced',
        description: wandMode === 'generate'
          ? 'AI animation prompt has been added.'
          : 'Your prompt has been enhanced.',
      })
    } catch (error) {
      logger.shotCreator.error('Failed to generate animation prompt', { error: error instanceof Error ? error.message : String(error) })
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
      logger.shotCreator.error('Error deleting video', { error: error instanceof Error ? error.message : String(error) })
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
        <div
          ref={imageAreaRef}
          data-shot-card-image
          className="relative aspect-square max-h-[180px] sm:max-h-none bg-background group overflow-hidden"
          onDragEnter={handleImageDragEnter}
          onDragOver={handleImageDragOver}
          onDragLeave={handleImageDragLeave}
          onDrop={handleImageDrop}
        >
          <Image
            src={config.imageUrl}
            alt={config.imageName}
            fill
            className="object-cover"
          />

          {/* Selection Overlay */}
          {config.includeInBatch && (
            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
          )}

          {/* Per-card drop zone overlays — pointer-events-none so drag events pass through to parent */}
          {dropZoneSide && (
            <>
              {/* Left half - Start Frame */}
              <div className={`absolute inset-y-0 left-0 w-1/2 z-20 flex items-center justify-center transition-colors pointer-events-none ${
                dropZoneSide === 'left' ? 'bg-blue-500/30 border-r-2 border-blue-400' : ''
              }`}>
                {dropZoneSide === 'left' && (
                  <span className="text-xs font-bold text-white bg-blue-600/80 px-2 py-1 rounded shadow-lg">Start Frame</span>
                )}
              </div>
              {/* Right half - End Frame (or Start if not supported) */}
              <div className={`absolute inset-y-0 right-0 w-1/2 z-20 flex items-center justify-center transition-colors pointer-events-none ${
                dropZoneSide === 'right'
                  ? supportsLastFrame
                    ? 'bg-amber-500/30 border-l-2 border-amber-400'
                    : 'bg-blue-500/30 border-l-2 border-blue-400'
                  : ''
              }`}>
                {dropZoneSide === 'right' && (
                  <span className={`text-xs font-bold text-white px-2 py-1 rounded shadow-lg ${
                    supportsLastFrame ? 'bg-amber-600/80' : 'bg-blue-600/80'
                  }`}>
                    {supportsLastFrame ? 'End Frame' : 'Start Frame'}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Hover overlay with actions — pointer-events-none during drag so drops reach imageAreaRef */}
          <div
            className={`absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-3 z-[5] ${dropZoneSide ? 'pointer-events-none' : ''}`}
          >
            {/* Replace image button */}
            <button
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              onClick={(e) => { e.stopPropagation(); replaceInputRef.current?.click() }}
              title="Replace image"
            >
              <Replace className="w-5 h-5 text-white" />
            </button>
            {/* Zoom / fullscreen button */}
            <button
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (recentDropRef.current) return
                setIsFullscreenOpen(true)
              }}
              title="View fullscreen"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>
          {/* Hidden file inputs for replacing start frame / setting last frame */}
          <input
            ref={replaceInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleReplaceImage}
            className="hidden"
          />
          <input
            ref={lastFrameInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLastFrameFile}
            className="hidden"
          />

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
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
              {/* Model icon */}
              {config.generatedVideos[config.generatedVideos.length - 1]?.model && (
                <span className="text-sm drop-shadow-lg pointer-events-none">
                  {getVideoModelIcon(config.generatedVideos[config.generatedVideos.length - 1].model)}
                </span>
              )}
              {config.generatedVideos.some(v => v.status === 'processing') && (
                <Badge className="bg-primary text-white text-xs flex items-center gap-1">
                  <LoadingSpinner size="xs" color="current" />
                  Processing
                </Badge>
              )}
              {config.generatedVideos.every(v => v.status === 'completed') && (
                <Badge className="bg-secondary text-white text-xs">
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

          {/* Image Model Icon - Bottom Left (when no last frame) */}
          {config.imageModel && !(supportsLastFrame && config.lastFrameImage) && (
            <span className="absolute bottom-2 left-2 z-10 text-base drop-shadow-lg pointer-events-none">
              {getModelIcon(config.imageModel)}
            </span>
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
                  onClick={(e) => { e.stopPropagation(); lastFrameInputRef.current?.click() }}
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
              placeholder={multiShotMode
                ? "Describe a multi-shot sequence... Use 'camera switch' between shots."
                : "Describe the animation motion..."
              }
              className={`bg-secondary text-white text-sm sm:text-xs ${multiShotMode ? 'min-h-[120px] sm:min-h-[140px]' : 'min-h-[80px] sm:min-h-[100px]'} resize-none touch-manipulation focus:ring-2 focus:ring-ring transition-shadow p-2 pr-10`}
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
          {/* Prompt Controls: Multi-shot toggle + Tips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Multi-shot toggle - only for Seedance models */}
            {ANIMATION_MODELS[selectedModel]?.promptStyle === 'reasoning' && (
              <Button
                size="sm"
                variant={multiShotMode ? 'default' : 'ghost'}
                onClick={() => setMultiShotMode(!multiShotMode)}
                className={`h-6 px-2 text-[10px] ${multiShotMode ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white bg-secondary/50'}`}
                title="Enable multi-shot mode for camera switch sequences"
              >
                <Clapperboard className="w-3 h-3 mr-1" />
                Multi-Shot
              </Button>
            )}
            {/* Tips toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowTips(!showTips)}
                    className={`h-6 w-6 p-0 ${showTips ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px] text-xs">
                  <p>Prompt tips for better video generation</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {/* Prompt Tips Panel */}
          {showTips && (
            <div className="bg-secondary/50 border border-border/50 rounded p-2 text-[10px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-[11px]">Prompt Tips:</p>
              <p>• Describe <span className="text-primary">motion</span>, not what&apos;s already in the image</p>
              <p>• Use intensity adverbs: <span className="text-primary">slowly, rapidly, gently, powerfully</span></p>
              <p>• Use film terms: <span className="text-primary">dolly push-in, tracking shot, crane up</span></p>
              <p>• Don&apos;t use negatives — describe what <span className="text-primary">does</span> happen</p>
              {ANIMATION_MODELS[selectedModel]?.supportsAudio && currentModelSettings?.generateAudio && (
                <p>• Audio is ON — include sounds: <span className="text-primary">footsteps, wind, speech in English</span></p>
              )}
              {multiShotMode && (
                <>
                  <p className="font-medium text-foreground text-[11px] mt-1.5">Multi-Shot:</p>
                  <p>• Use <span className="text-primary">&quot;camera switch&quot;</span> between shots (max 3 shots)</p>
                  <p>• Each shot: <span className="text-primary">[Shot type] subject + action</span></p>
                  <p>• Maintain continuity across cuts</p>
                </>
              )}
            </div>
          )}
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

            {/* Last Frame Button - click opens file picker */}
            <div className="w-1/2">
              {supportsLastFrame && !config.lastFrameImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => lastFrameInputRef.current?.click()}
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

// Compare generatedVideos arrays by value (length, status, videoUrl)
function videosEqual(a: ShotGeneratedVideo[], b: ShotGeneratedVideo[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].galleryId !== b[i].galleryId ||
      a[i].status !== b[i].status ||
      a[i].videoUrl !== b[i].videoUrl ||
      a[i].model !== b[i].model
    ) return false
  }
  return true
}

// Memoize component - only re-render if config changes
export const CompactShotCard = memo(CompactShotCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.config.id === nextProps.config.id &&
    prevProps.config.prompt === nextProps.config.prompt &&
    prevProps.config.originalPrompt === nextProps.config.originalPrompt &&
    prevProps.config.includeInBatch === nextProps.config.includeInBatch &&
    prevProps.config.imageUrl === nextProps.config.imageUrl &&
    prevProps.config.imageModel === nextProps.config.imageModel &&
    prevProps.config.referenceImages.length === nextProps.config.referenceImages.length &&
    videosEqual(prevProps.config.generatedVideos, nextProps.config.generatedVideos) &&
    prevProps.config.lastFrameImage === nextProps.config.lastFrameImage &&
    prevProps.maxReferenceImages === nextProps.maxReferenceImages &&
    prevProps.supportsLastFrame === nextProps.supportsLastFrame &&
    prevProps.selectedModel === nextProps.selectedModel &&
    prevProps.currentModelSettings?.generateAudio === nextProps.currentModelSettings?.generateAudio
  )
})
