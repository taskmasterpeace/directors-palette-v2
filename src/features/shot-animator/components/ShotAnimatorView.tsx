'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Upload, ImageIcon, Search, Play, VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CompactShotCard } from './CompactShotCard'
import { ReferenceImagesModal } from './ReferenceImagesModal'
import { LastFrameModal } from './LastFrameModal'
import { ModelSettingsModal } from './ModelSettingsModal'
import { GallerySelectModal } from './GallerySelectModal'
import { AnimatorUnifiedGallery } from './AnimatorUnifiedGallery'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useVideoGeneration } from '../hooks/useVideoGeneration'
import { useVideoPolling } from '../hooks/useVideoPolling'
import { useGallery } from '../hooks/useGallery'
import { useSettings } from '@/features/settings/hooks/useSettings'
import { useShotAnimatorStore } from '../store'
import { getClient } from '@/lib/db/client'
import {
  AnimationModel,
  ShotAnimationConfig,
  AnimatorSettings,
} from '../types'
import {
  ANIMATION_MODELS,
  DEFAULT_MODEL_SETTINGS,
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
import VideoPreviewsModal from "./VideoPreviewsModal"

export function ShotAnimatorView() {
  // Auth and hooks
  const { user } = useAuth()
  const { isGenerating, generationPhase, generateVideos, retrySingleVideo } = useVideoGeneration()
  const { galleryImages, currentPage, totalPages, loadPage } = useGallery(true, 6)
  const { shotAnimator, updateShotAnimatorSettings } = useSettings()

  // Shot Animator Store
  const { shotConfigs, setShotConfigs, addShotConfigs, updateShotConfig, removeShotConfig } = useShotAnimatorStore()

  // State — restore last-used model from settings, default to seedance-lite
  const savedModel = shotAnimator.selectedModel as AnimationModel | undefined
  const [selectedModel, setSelectedModel] = useState<AnimationModel>(
    savedModel && ANIMATION_MODELS[savedModel] ? savedModel : 'seedance-lite'
  )

  // Sync local state when settings load from database (async)
  useEffect(() => {
    const persisted = shotAnimator.selectedModel as AnimationModel | undefined
    if (persisted && ANIMATION_MODELS[persisted] && persisted !== selectedModel) {
      setSelectedModel(persisted)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-sync when the persisted value changes
  }, [shotAnimator.selectedModel])

  // Persist model choice when it changes
  const handleModelChange = (model: AnimationModel) => {
    setSelectedModel(model)
    updateShotAnimatorSettings({ selectedModel: model })
  }

  // Get model settings from settings store (fallback to defaults)
  const modelSettings = shotAnimator.modelSettings || DEFAULT_MODEL_SETTINGS

  // Modals
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [showCostConfirm, setShowCostConfirm] = useState(false)
  const [refEditState, setRefEditState] = useState<{ isOpen: boolean; configId?: string }>({ isOpen: false })
  const [lastFrameEditState, setLastFrameEditState] = useState<{ isOpen: boolean; configId?: string }>({ isOpen: false })

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  const currentModelConfig = ANIMATION_MODELS[selectedModel] || ANIMATION_MODELS['seedance-lite']

  // Filtered shots
  const filteredShots = shotConfigs
    .filter((shot) => {
      if (showOnlySelected && !shot.includeInBatch) return false
      if (searchQuery && !shot.imageName.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })

  const selectedCount = shotConfigs.filter((s) => s.includeInBatch).length

  // Calculate estimated cost for the batch
  const estimatedCost = useMemo(() => {
    if (selectedCount === 0) return 0
    const settings = modelSettings[selectedModel]
    const pricing = VIDEO_MODEL_PRICING[selectedModel]

    // Guard against undefined settings or pricing
    if (!settings || !pricing) return 0

    const pricePerUnit = pricing[settings.resolution] ?? pricing['720p'] ?? 0

    if (currentModelConfig.pricingType === 'per-video') {
      // Per-video models: fixed cost per video
      return selectedCount * pricePerUnit
    } else {
      // Per-second models: cost based on duration
      return selectedCount * pricePerUnit * (settings.duration ?? 5)
    }
  }, [selectedCount, selectedModel, modelSettings, currentModelConfig.pricingType])

  // Stable key of processing gallery IDs to avoid subscription churn
  const processingGalleryIdsKey = useMemo(() => {
    const ids: string[] = []
    shotConfigs.forEach(config => {
      config.generatedVideos?.forEach(video => {
        if (video.status === 'processing') {
          ids.push(video.galleryId)
        }
      })
    })
    return ids.sort().join(',')
  }, [shotConfigs])

  // Keep a ref to shotConfigs so the subscription callback reads current state
  const shotConfigsRef = useRef(shotConfigs)
  shotConfigsRef.current = shotConfigs

  // Real-time subscription to update video URLs when generation completes
  useEffect(() => {
    if (!user || !processingGalleryIdsKey) return

    const galleryIds = processingGalleryIdsKey.split(',')
    const galleryIdsSet = new Set(galleryIds)
    let subscription: { unsubscribe: () => void } | null = null

    const setupSubscription = async () => {
      const supabase = await getClient()
      if (!supabase) return

      subscription = supabase
        .channel(`shot-animator-videos-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'gallery',
            filter: `id=in.(${galleryIds.join(',')})`,
          },
          (payload) => {
            const updatedRecord = payload.new as { id: string; public_url?: string; metadata?: Record<string, unknown> }

            // Only process if this ID is in our tracking list
            if (!galleryIdsSet.has(updatedRecord.id)) return

            // Use ref to read current shotConfigs to avoid stale closures
            const currentConfigs = shotConfigsRef.current
            const updatedConfigs = currentConfigs.map(config => {
              const updatedVideos = config.generatedVideos?.map(video => {
                if (video.galleryId === updatedRecord.id) {
                  if (updatedRecord.public_url) {
                    return {
                      ...video,
                      videoUrl: updatedRecord.public_url,
                      status: 'completed' as const
                    }
                  } else if (updatedRecord.metadata?.error) {
                    return {
                      ...video,
                      status: 'failed' as const,
                      error: String(updatedRecord.metadata.error)
                    }
                  }
                }
                return video
              })

              if (updatedVideos && updatedVideos !== config.generatedVideos) {
                return { ...config, generatedVideos: updatedVideos }
              }
              return config
            })
            setShotConfigs(updatedConfigs)
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [processingGalleryIdsKey, user, setShotConfigs])

  // Polling fallback -- if the real-time subscription misses an update,
  // periodically check processing videos via direct DB query.
  // See useVideoPolling for implementation details.
  useVideoPolling({
    shotConfigs,
    setShotConfigs,
    enabled: !!user,
  })

  // Clear last frame images when switching to a model that doesn't support it
  useEffect(() => {
    if (!currentModelConfig.supportsLastFrame) {
      // Check if any shots have last frame images
      const shotsWithLastFrame = shotConfigs.filter(shot => shot.lastFrameImage)

      if (shotsWithLastFrame.length > 0) {
        // Clear last frame from all shots
        const updatedConfigs = shotConfigs.map(shot => ({
          ...shot,
          lastFrameImage: undefined
        }))
        setShotConfigs(updatedConfigs)

        toast({
          title: 'Last Frame Removed',
          description: `${currentModelConfig.displayName} doesn't support last frame. Last frame images have been removed from ${shotsWithLastFrame.length} shot(s).`,
        })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only trigger on model change, not on state updates
  }, [selectedModel, currentModelConfig.supportsLastFrame, currentModelConfig.displayName])

  // Reset aspect ratio when switching to a model that doesn't support the current ratio
  useEffect(() => {
    const currentSettings = modelSettings[selectedModel]
    if (!currentSettings) return

    const currentAspectRatio = currentSettings.aspectRatio
    const supportedRatios = currentModelConfig.supportedAspectRatios

    // If current aspect ratio is not supported by the new model, reset to first supported
    if (supportedRatios && !supportedRatios.includes(currentAspectRatio)) {
      const newRatio = supportedRatios[0] || '16:9'
      updateShotAnimatorSettings({
        modelSettings: {
          ...modelSettings,
          [selectedModel]: {
            ...currentSettings,
            aspectRatio: newRatio
          }
        }
      })

      toast({
        title: 'Aspect Ratio Changed',
        description: `${currentModelConfig.displayName} doesn't support ${currentAspectRatio}. Changed to ${newRatio}.`,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only trigger on model change, not on state updates
  }, [selectedModel, currentModelConfig.displayName, currentModelConfig.supportedAspectRatios])

  // Transform gallery images for the modal
  const transformedGalleryImages = useMemo(() => {
    return galleryImages
      .filter((item) => item.public_url) // Only images with URLs
      .map((item) => {
        const metadata = (item.metadata as Record<string, unknown>) || {}
        const originalPrompt = (metadata.prompt as string) || ''
        return {
          id: item.id,
          url: item.public_url!,
          name: originalPrompt || `Image ${item.id.slice(0, 8)}`,
          originalPrompt, // Store for animation prompt generation
          createdAt: new Date(item.created_at),
        }
      })
  }, [galleryImages])

  // Handlers
  const handleGallerySelect = (images: { id: string; url: string; name: string; originalPrompt?: string; createdAt: Date }[]) => {
    const newConfigs: ShotAnimationConfig[] = images.map((img) => ({
      id: `shot-${Date.now()}-${Math.random()}`,
      imageUrl: img.url,
      imageName: img.name,
      prompt: "",
      originalPrompt: img.originalPrompt, // Store for AI animation prompt generation
      referenceImages: [],
      includeInBatch: true,
      generatedVideos: [] // Initialize empty array
    }))
    addShotConfigs(newConfigs)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const validFiles: File[] = []
    const rejectedFiles: string[] = []

    Array.from(files).forEach((file) => {
      if (allowedTypes.includes(file.type)) {
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

    // Convert files to base64 for persistence
    const filePromises = validFiles.map(async (file) => {
      return new Promise<ShotAnimationConfig>((resolve) => {
        const reader = new FileReader()
        reader.onload = (event) => {
          const base64Url = event.target?.result as string
          resolve({
            id: `shot-${Date.now()}-${Math.random()}`,
            imageUrl: base64Url,
            imageName: file.name,
            prompt: "",
            referenceImages: [],
            includeInBatch: true,
            generatedVideos: []
          })
        }
        reader.readAsDataURL(file)
      })
    })

    const newConfigs = await Promise.all(filePromises)
    addShotConfigs(newConfigs)
    e.target.value = ""
  }

  const handleUpdateShotConfig = (id: string, updates: ShotAnimationConfig) => {
    updateShotConfig(id, updates)
  }

  const handleSaveReferences = (configId: string, images: string[]) => {
    updateShotConfig(configId, { referenceImages: images })
  }

  const handleSaveLastFrame = (configId: string, image?: string) => {
    updateShotConfig(configId, { lastFrameImage: image })
  }

  const handleSelectAll = () => {
    setShotConfigs(shotConfigs.map((config) => ({ ...config, includeInBatch: true })))
  }

  const handleDeselectAll = () => {
    setShotConfigs(shotConfigs.map((config) => ({ ...config, includeInBatch: false })))
  }

  const handleDeleteShot = (id: string) => {
    removeShotConfig(id)
  }

  const executeGeneration = async () => {
    const results = await generateVideos(
      shotConfigs,
      selectedModel,
      modelSettings[selectedModel]
    )

    // Append new videos to generatedVideos array
    if (results && results.length > 0) {
      const updatedConfigs = shotConfigs.map((config) => {
        const result = results.find((r) => r.shotId === config.id)
        if (result && result.success) {
          const newVideo = {
            galleryId: result.galleryId!,
            status: 'processing' as const,
            createdAt: new Date()
          }
          return {
            ...config,
            generatedVideos: [...(config.generatedVideos || []), newVideo],
            includeInBatch: false // Uncheck after submission
          }
        }
        return config
      })
      setShotConfigs(updatedConfigs)
    }

    // Log results for debugging
    console.log('Generation results:', results)
  }

  const handleGenerateAll = async () => {
    if (!user?.id) {
      console.error('User not authenticated')
      return
    }

    // Cost confirmation for expensive batches (>100 pts)
    if (estimatedCost > 100) {
      setShowCostConfirm(true)
      return
    }

    await executeGeneration()
  }

  const handleConfirmGeneration = async () => {
    setShowCostConfirm(false)
    await executeGeneration()
  }

  const handleDeleteVideo = (galleryId: string) => {
    const updatedConfigs = shotConfigs.map(config => {
      const updatedVideos = config.generatedVideos?.filter(v => v.galleryId !== galleryId)
      if (updatedVideos && updatedVideos.length !== config.generatedVideos?.length) {
        return { ...config, generatedVideos: updatedVideos }
      }
      return config
    })
    setShotConfigs(updatedConfigs)
  }

  const handleDownloadVideo = (videoUrl: string) => {
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = ''
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleSaveModelSettings = async (newSettings: AnimatorSettings) => {
    await updateShotAnimatorSettings({ modelSettings: newSettings })
  }

  const handleRetryVideo = async (shotConfigId: string, galleryId: string) => {
    if (!user?.id) {
      console.error('User not authenticated')
      return
    }

    // Find the shot config
    const shotConfig = shotConfigs.find((c) => c.id === shotConfigId)
    if (!shotConfig) {
      console.error('Shot config not found')
      return
    }

    // Update video status to 'processing' before retrying
    const updatedConfigs = shotConfigs.map((config) => {
      if (config.id === shotConfigId) {
        const updatedVideos = config.generatedVideos?.map((video) => {
          if (video.galleryId === galleryId) {
            return {
              ...video,
              status: 'processing' as const,
              error: undefined
            }
          }
          return video
        })
        return { ...config, generatedVideos: updatedVideos }
      }
      return config
    })
    setShotConfigs(updatedConfigs)

    // Retry the video generation
    const result = await retrySingleVideo(
      shotConfig,
      selectedModel,
      modelSettings[selectedModel]
    )

    // Update the generatedVideos array with new galleryId if successful
    if (result.success && result.galleryId) {
      const finalConfigs = shotConfigs.map((config) => {
        if (config.id === shotConfigId) {
          const updatedVideos = config.generatedVideos?.map((video) => {
            if (video.galleryId === galleryId) {
              return {
                ...video,
                galleryId: result.galleryId!,
                status: 'processing' as const,
                error: undefined
              }
            }
            return video
          })
          return { ...config, generatedVideos: updatedVideos }
        }
        return config
      })
      setShotConfigs(finalConfigs)
    } else if (!result.success) {
      // If retry failed, update status back to failed with error
      const failedConfigs = shotConfigs.map((config) => {
        if (config.id === shotConfigId) {
          const updatedVideos = config.generatedVideos?.map((video) => {
            if (video.galleryId === galleryId) {
              return {
                ...video,
                status: 'failed' as const,
                error: result.error || 'Retry failed'
              }
            }
            return video
          })
          return { ...config, generatedVideos: updatedVideos }
        }
        return config
      })
      setShotConfigs(failedConfigs)
    }
  }

  const currentRefEditConfig = shotConfigs.find((c) => c.id === refEditState.configId)
  const currentLastFrameConfig = shotConfigs.find((c) => c.id === lastFrameEditState.configId)

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="border-b border-border bg-background/50">
        {/* MOBILE: Compact single-row toolbar */}
        <div className="flex sm:hidden items-center gap-2 px-2 py-2">
          {/* Model selector - compact */}
          <Select
            value={selectedModel}
            onValueChange={(value) => handleModelChange(value as AnimationModel)}
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
            {/* Upload */}
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 flex-shrink-0 border-border text-white hover:bg-card"
              onClick={() => document.getElementById("file-upload-toolbar")?.click()}
            >
              <Upload className="w-4 h-4" />
            </Button>

            {/* Video Gallery */}
            <Button
              size="icon"
              onClick={() => setIsVideoModalOpen(true)}
              className="h-10 w-10 flex-shrink-0 bg-secondary hover:bg-muted"
            >
              <VideoIcon className="w-4 h-4" />
            </Button>

            {/* Image Gallery */}
            <Button
              size="icon"
              onClick={() => setIsGalleryModalOpen(true)}
              className="h-10 w-10 flex-shrink-0 bg-secondary hover:bg-muted"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>

            {/* Settings - Mobile compact */}
            <ModelSettingsModal settings={modelSettings} onSave={handleSaveModelSettings} />
          </div>

          {/* Selected count badge */}
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
              {selectedCount} sel
            </Badge>
          )}
        </div>

        {/* DESKTOP: Full toolbar */}
        <div className="hidden sm:block">
          {/* Model Selection & Settings */}
          <div className="px-4 py-2 flex flex-col gap-3">
            {/* Model Selection */}
            <div className="flex flex-row gap-2 items-center">
              <Label className="text-muted-foreground text-sm whitespace-nowrap">Model:</Label>
              <Select
                value={selectedModel}
                onValueChange={(value) => handleModelChange(value as AnimationModel)}
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
              {/* Model Info Badge */}
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

            {/* Action Buttons */}
            <div className="flex flex-row items-center justify-between">
              {/* Search */}
              <div className="relative w-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-48 bg-card border-border text-white text-sm"
                />
              </div>

              {/* Button Group */}
              <div className="flex items-center gap-2">
                {/* Upload */}
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

                {/* Video Gallery */}
                <Button
                  onClick={() => setIsVideoModalOpen(true)}
                  size="sm"
                  className="h-8 bg-secondary hover:bg-muted"
                >
                  <VideoIcon className="w-4 h-4 mr-1" />
                  Video
                </Button>

                {/* Image Gallery */}
                <Button
                  onClick={() => setIsGalleryModalOpen(true)}
                  size="sm"
                  className="h-8 bg-secondary hover:bg-muted"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Gallery
                </Button>

                {/* Settings */}
                <ModelSettingsModal settings={modelSettings} onSave={handleSaveModelSettings} />
              </div>
            </div>
          </div>

          {/* Selection Controls - Desktop only */}
          <div className="px-4 py-2 flex flex-row items-center justify-between border-t border-border/50">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs text-muted-foreground hover:text-white"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="h-7 text-xs text-muted-foreground hover:text-white"
              >
                Deselect All
              </Button>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-selected"
                  checked={showOnlySelected}
                  onCheckedChange={(checked) => setShowOnlySelected(checked as boolean)}
                />
                <Label htmlFor="show-selected" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                  Show only selected
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          id="file-upload-toolbar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_400px]">
        {/* Left: Shots Grid */}
        <div className="overflow-hidden">
          <ScrollArea className="h-full">
            {filteredShots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                <ImageIcon className="w-16 h-16 mb-4" />
                <p>No images to display</p>
                <p className="text-sm mt-2">Upload images or add from gallery to get started</p>
              </div>
            ) : (
              <div className="p-2 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pb-24 content-stretch">
                {filteredShots.map((config) => (
                  <CompactShotCard
                    key={config.id}
                    config={config}
                    maxReferenceImages={currentModelConfig.maxReferenceImages}
                    supportsLastFrame={currentModelConfig.supportsLastFrame}
                    onUpdate={(updates) => handleUpdateShotConfig(config.id, updates)}
                    onDelete={() => handleDeleteShot(config.id)}
                    onManageReferences={() => setRefEditState({ isOpen: true, configId: config.id })}
                    onManageLastFrame={() => setLastFrameEditState({ isOpen: true, configId: config.id })}
                    onRetryVideo={(galleryId) => handleRetryVideo(config.id, galleryId)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Unified Gallery */}
        <div className="hidden lg:block">
          <AnimatorUnifiedGallery
            shotConfigs={shotConfigs}
            onDelete={handleDeleteVideo}
            onDownload={handleDownloadVideo}
          />
        </div>
      </div>

      {/* Bottom Generate Bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 sm:p-4 safe-bottom z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <Button
              onClick={handleGenerateAll}
              disabled={isGenerating || !user}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-6 sm:px-8 w-full sm:w-auto min-h-[48px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 mr-2" />
              <span className="text-sm sm:text-base">
                {isGenerating
                  ? generationPhase === 'uploading'
                    ? 'Uploading images...'
                    : generationPhase === 'submitting'
                      ? 'Starting generation...'
                      : 'Generating...'
                  : `Generate ${selectedCount} Video${selectedCount > 1 ? 's' : ''} - ${estimatedCost} pts`}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <GallerySelectModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        onSelect={handleGallerySelect}
        galleryImages={transformedGalleryImages}
        currentPage={currentPage}
        totalPages={totalPages}        
        onPageChange={loadPage}
      />

      {/* Video Modal */}
      <VideoPreviewsModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />

      {currentRefEditConfig && (
        <ReferenceImagesModal
          isOpen={refEditState.isOpen}
          onClose={() => setRefEditState({ isOpen: false })}
          onSave={(images) => handleSaveReferences(currentRefEditConfig.id, images)}
          initialImages={currentRefEditConfig.referenceImages}
          maxImages={currentModelConfig.maxReferenceImages}
          imageName={currentRefEditConfig.imageName}
        />
      )}

      {currentLastFrameConfig && (
        <LastFrameModal
          isOpen={lastFrameEditState.isOpen}
          onClose={() => setLastFrameEditState({ isOpen: false })}
          onSave={(image) => handleSaveLastFrame(currentLastFrameConfig.id, image)}
          initialImage={currentLastFrameConfig.lastFrameImage}
          imageName={currentLastFrameConfig.imageName}
        />
      )}

      {/* Batch Cost Confirmation Dialog */}
      <AlertDialog open={showCostConfirm} onOpenChange={setShowCostConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Batch Generation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to generate a large batch of videos:</p>
                <div className="rounded-md bg-muted p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium text-foreground">{currentModelConfig.displayName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Videos</span>
                    <span className="font-medium text-foreground">{selectedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost per video</span>
                    <span className="font-medium text-foreground">
                      ~{selectedCount > 0 ? Math.round(estimatedCost / selectedCount) : 0} pts
                    </span>
                  </div>
                  <div className="border-t border-border my-1" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Total estimated cost</span>
                    <span className="font-bold text-foreground">{estimatedCost} pts</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  All {selectedCount} videos will begin generating immediately upon confirmation.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGeneration}>
              Generate {selectedCount} Videos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
