'use client'

import React, { useCallback, useRef } from 'react'
import { Upload, ImageIcon, Search, VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ModelSettingsModal } from './ModelSettingsModal'
import {
  AnimationModel,
  AnimatorSettings,
} from '../types'
import {
  ANIMATION_MODELS,
  ACTIVE_VIDEO_MODELS,
  MODEL_TIER_LABELS,
} from '../config/models.config'
import { VIDEO_MODEL_PRICING } from '../types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { ALLOWED_IMAGE_TYPES, GALLERY_IMAGE_MIME_TYPE, GalleryImageDragPayload } from '../constants/drag-drop.constants'
import type { ShotAnimationConfig } from '../types'

/** Convert an array of image Files into ShotAnimationConfig objects (base64). */
function filesToShotConfigs(files: File[]): Promise<ShotAnimationConfig[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<ShotAnimationConfig>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            resolve({
              id: `shot-${Date.now()}-${Math.random()}`,
              imageUrl: event.target?.result as string,
              imageName: file.name,
              prompt: '',
              referenceImages: [],
              includeInBatch: true,
              generatedVideos: [],
            })
          }
          reader.readAsDataURL(file)
        })
    )
  )
}

interface AnimatorControlsProps {
  selectedModel: AnimationModel
  modelSettings: AnimatorSettings
  selectedCount: number
  searchQuery: string
  showOnlySelected: boolean
  onModelChange: (model: AnimationModel) => void
  onSearchChange: (query: string) => void
  onShowOnlySelectedChange: (show: boolean) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSaveModelSettings: (settings: AnimatorSettings) => Promise<void>
  onOpenGalleryModal: () => void
  onOpenVideoModal: () => void
  addShotConfigs: (configs: ShotAnimationConfig[]) => void
}

export function AnimatorControls({
  selectedModel,
  modelSettings,
  selectedCount,
  searchQuery,
  showOnlySelected,
  onModelChange,
  onSearchChange,
  onShowOnlySelectedChange,
  onSelectAll,
  onDeselectAll,
  onSaveModelSettings,
  onOpenGalleryModal,
  onOpenVideoModal,
  addShotConfigs,
}: AnimatorControlsProps) {
  const toolbarDragCounterRef = useRef(0)
  const [isToolbarDragOver, setIsToolbarDragOver] = React.useState(false)

  const currentModelConfig = ANIMATION_MODELS[selectedModel] || ANIMATION_MODELS['seedance-1.5-pro']

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    const rejectedFiles: string[] = []

    Array.from(files).forEach((file) => {
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        validFiles.push(file)
      } else {
        rejectedFiles.push(file.name)
      }
    })

    if (rejectedFiles.length > 0) {
      toast({
        title: 'Unsupported File Type',
        description: `Only JPEG, PNG, and WebP images are supported. Rejected: ${rejectedFiles.join(', ')}`,
        variant: 'destructive',
      })
    }

    if (validFiles.length === 0) {
      e.target.value = ""
      return
    }

    const newConfigs = await filesToShotConfigs(validFiles)
    addShotConfigs(newConfigs)
    e.target.value = ""
  }

  const handleToolbarDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toolbarDragCounterRef.current++
    if (toolbarDragCounterRef.current === 1) setIsToolbarDragOver(true)
  }, [])

  const handleToolbarDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleToolbarDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toolbarDragCounterRef.current--
    if (toolbarDragCounterRef.current <= 0) {
      toolbarDragCounterRef.current = 0
      setIsToolbarDragOver(false)
    }
  }, [])

  const handleToolbarDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toolbarDragCounterRef.current = 0
    setIsToolbarDragOver(false)

    const galleryData = e.dataTransfer?.getData(GALLERY_IMAGE_MIME_TYPE)
    if (galleryData) {
      try {
        const parsed = JSON.parse(galleryData) as GalleryImageDragPayload
        addShotConfigs([{
          id: `shot-${Date.now()}-${Math.random()}`,
          imageUrl: parsed.url,
          imageName: parsed.name,
          imageModel: parsed.imageModel,
          prompt: '',
          originalPrompt: parsed.originalPrompt,
          referenceImages: [],
          includeInBatch: true,
          generatedVideos: [],
        }])
      } catch { /* ignore */ }
      return
    }

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    const validFiles = Array.from(files).filter((f) => ALLOWED_IMAGE_TYPES.includes(f.type))
    if (validFiles.length === 0) return
    const newConfigs = await filesToShotConfigs(validFiles)
    addShotConfigs(newConfigs)
  }, [addShotConfigs])

  return (
    <div
      className={`border-b border-border bg-background/50 transition-colors ${isToolbarDragOver ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}`}
      onDragEnter={handleToolbarDragEnter}
      onDragOver={handleToolbarDragOver}
      onDragLeave={handleToolbarDragLeave}
      onDrop={handleToolbarDrop}
    >
      {/* MOBILE: Compact single-row toolbar */}
      <div className="flex sm:hidden items-center gap-2 px-2 py-2" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}>
        {/* Model selector - compact */}
        <Select
          value={selectedModel}
          onValueChange={(value) => onModelChange(value as AnimationModel)}
        >
          <SelectTrigger className="h-10 w-28 flex-shrink-0 bg-card border-border text-white text-xs">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {ACTIVE_VIDEO_MODELS.map((modelId) => {
              const config = ANIMATION_MODELS[modelId]
              const tierLabel = MODEL_TIER_LABELS[modelId]
              return (
                <SelectItem key={modelId} value={modelId} className="cursor-pointer text-sm">
                  <div className="flex items-center gap-1">
                    <span>{config.displayName}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{tierLabel}</Badge>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        {/* Action buttons - horizontal scroll */}
        <div className="flex gap-1.5 flex-shrink-0 overflow-x-auto">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 flex-shrink-0 border-border text-white hover:bg-card"
            onClick={() => document.getElementById("file-upload-toolbar")?.click()}
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={onOpenVideoModal}
            className="h-10 w-10 flex-shrink-0 bg-secondary hover:bg-muted"
          >
            <VideoIcon className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            onClick={onOpenGalleryModal}
            className="h-10 w-10 flex-shrink-0 bg-secondary hover:bg-muted"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <ModelSettingsModal settings={modelSettings} onSave={onSaveModelSettings} selectedModel={selectedModel} />
        </div>

        {selectedCount > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
            {selectedCount} sel
          </Badge>
        )}
      </div>

      {/* DESKTOP: Full toolbar */}
      <div className="hidden sm:block" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}>
        <div className="px-4 py-2 flex flex-col gap-3">
          <div className="flex flex-row gap-2 items-center">
            <Label className="text-muted-foreground text-sm whitespace-nowrap">Model:</Label>
            <Select
              value={selectedModel}
              onValueChange={(value) => onModelChange(value as AnimationModel)}
            >
              <SelectTrigger className="w-[320px] h-10 bg-card border-border text-white">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {ACTIVE_VIDEO_MODELS.map((modelId) => {
                  const config = ANIMATION_MODELS[modelId]
                  const pricing = VIDEO_MODEL_PRICING[modelId]
                  const tierLabel = MODEL_TIER_LABELS[modelId]
                  const priceDisplay = config.pricingType === 'per-video'
                    ? `${pricing['720p']} pts/video`
                    : `${pricing['720p']} pts/sec`

                  return (
                    <SelectItem key={modelId} value={modelId} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.displayName}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {tierLabel}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {priceDisplay}
                        </span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-wrap">
              {currentModelConfig.supportsLastFrame && (
                <Badge variant="secondary" className="text-[10px]">Last Frame</Badge>
              )}
              {currentModelConfig.maxReferenceImages > 0 && (
                <Badge variant="secondary" className="text-[10px]">Ref Images</Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                Max {currentModelConfig.maxDuration}s
              </Badge>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between">
            <div className="relative w-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 h-8 w-48 bg-card border-border text-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-border text-white hover:bg-card"
                onClick={() => document.getElementById("file-upload-toolbar")?.click()}
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
              <Button
                onClick={onOpenVideoModal}
                size="sm"
                className="h-8 bg-secondary hover:bg-muted"
              >
                <VideoIcon className="w-4 h-4 mr-1" />
                Video
              </Button>
              <Button
                onClick={onOpenGalleryModal}
                size="sm"
                className="h-8 bg-secondary hover:bg-muted"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Gallery
              </Button>
              <ModelSettingsModal settings={modelSettings} onSave={onSaveModelSettings} selectedModel={selectedModel} />
            </div>
          </div>
        </div>

        <div className="px-4 py-2 flex flex-row items-center justify-between border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="h-7 text-xs text-muted-foreground hover:text-white"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="h-7 text-xs text-muted-foreground hover:text-white"
            >
              Deselect All
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-selected"
                checked={showOnlySelected}
                onCheckedChange={(checked) => onShowOnlySelectedChange(checked as boolean)}
              />
              <Label htmlFor="show-selected" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                Show only selected
              </Label>
            </div>
          </div>
        </div>
      </div>

      <input
        id="file-upload-toolbar"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
