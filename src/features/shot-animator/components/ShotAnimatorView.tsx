'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Upload, ImageIcon, Search, Play, VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CompactShotCard } from './CompactShotCard'
import { ReferenceImagesModal } from './ReferenceImagesModal'
import { LastFrameModal } from './LastFrameModal'
import { ModelSettingsModal } from './ModelSettingsModal'
import { GallerySelectModal } from './GallerySelectModal'
// import { AnimatorUnifiedGallery } from './AnimatorUnifiedGallery'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useVideoGeneration } from '../hooks/useVideoGeneration'
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
} from '../config/models.config'
import VideoPreviewsModal from "./VideoPreviewsModal"

export function ShotAnimatorView() {
  // Auth and hooks
  const { user } = useAuth()
  const { isGenerating, generateVideos, retrySingleVideo } = useVideoGeneration()
  const { galleryImages, currentPage, totalPages, loadPage } = useGallery(true, 6)
  const { shotAnimator, updateShotAnimatorSettings } = useSettings()

  // Shot Animator Store
  const { shotConfigs, setShotConfigs, addShotConfigs, updateShotConfig, removeShotConfig } = useShotAnimatorStore()

  // State
  const [selectedModel, setSelectedModel] = useState<AnimationModel>("seedance-lite")

  // Get model settings from settings store (fallback to defaults)
  const modelSettings = shotAnimator.modelSettings || DEFAULT_MODEL_SETTINGS

  // Modals
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
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

  // Real-time subscription to update video URLs when generation completes
  useEffect(() => {
    if (!user) return

    // Collect all processing video gallery IDs
    const galleryIds: string[] = []
    shotConfigs.forEach(config => {
      config.generatedVideos?.forEach(video => {
        if (video.status === 'processing') {
          galleryIds.push(video.galleryId)
        }
      })
    })

    if (galleryIds.length === 0) return

    const galleryIdsSet = new Set(galleryIds) // For O(1) lookup
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
          },
          (payload) => {
            const updatedRecord = payload.new as { id: string; public_url?: string; metadata?: Record<string, unknown> }

            // Only process if this ID is in our tracking list
            if (!galleryIdsSet.has(updatedRecord.id)) return

            // Update the specific video in the generatedVideos array
            const updatedConfigs = shotConfigs.map(config => {
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
  }, [shotConfigs, user, setShotConfigs])

  // Transform gallery images for the modal
  const transformedGalleryImages = useMemo(() => {
    return galleryImages
      .filter((item) => item.public_url) // Only images with URLs
      .map((item) => {
        const metadata = (item.metadata as Record<string, unknown>) || {}
        return {
          id: item.id,
          url: item.public_url!,
          name: (metadata.prompt as string) || `Image ${item.id.slice(0, 8)}`,
          createdAt: new Date(item.created_at),
        }
      })
  }, [galleryImages])

  // Handlers
  const handleGallerySelect = (images: typeof transformedGalleryImages) => {
    const newConfigs: ShotAnimationConfig[] = images.map((img) => ({
      id: `shot-${Date.now()}-${Math.random()}`,
      imageUrl: img.url,
      imageName: img.name,
      prompt: "",
      referenceImages: [],
      includeInBatch: true,
      generatedVideos: [] // Initialize empty array
    }))
    addShotConfigs(newConfigs)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Convert files to base64 for persistence
    const filePromises = Array.from(files).map(async (file) => {
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

  const handleDeselectAll = () => {
    setShotConfigs(shotConfigs.map((config) => ({ ...config, includeInBatch: false })))
  }

  const handleDeleteShot = (id: string) => {
    removeShotConfig(id)
  }

  const handleGenerateAll = async () => {
    if (!user?.id) {
      console.error('User not authenticated')
      return
    }

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

  // const handleDeleteVideo = async (id: string) => {
  //   await deleteVideo(id)
  // }

  // const handleDownloadVideo = (videoUrl: string) => {
  //   // TODO: Implement actual download
  //   console.log("Downloading video:", videoUrl)
  // }

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
        {/* Model Selection & Settings */}
        <div className="px-2 sm:px-4 py-2 flex flex-col gap-3">
          {/* Model Selection */}
          <RadioGroup
            value={selectedModel}
            onValueChange={(value) => setSelectedModel(value as AnimationModel)}
            className="flex gap-3 sm:gap-4"
          >
            <div className="flex items-center space-x-2 touch-manipulation">
              <RadioGroupItem value="seedance-lite" id="model-lite" className="min-w-[20px] min-h-[20px]" />
              <Label htmlFor="model-lite" className="cursor-pointer text-white text-sm whitespace-nowrap">
                Seedance Lite
              </Label>
            </div>
            <div className="flex items-center space-x-2 touch-manipulation">
              <RadioGroupItem value="seedance-pro" id="model-pro" className="min-w-[20px] min-h-[20px]" />
              <Label htmlFor="model-pro" className="cursor-pointer text-white text-sm whitespace-nowrap">
                Seedance Pro
              </Label>
            </div>
          </RadioGroup>

          {/* Action Buttons - Responsive Layout */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Search - Full width on mobile, auto on desktop */}
            <div className="relative w-full sm:w-auto order-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-10 sm:h-8 w-full sm:w-48 bg-card border-border text-white text-sm touch-manipulation"
              />
            </div>

            {/* Button Group - Grid on mobile for equal spacing */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 order-2">
              {/* Upload */}
              <label htmlFor="file-upload-toolbar" className="contents">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 sm:h-8 w-full sm:w-auto min-h-[44px] sm:min-h-0 border-border text-white hover:bg-card touch-manipulation justify-center"
                  onClick={() => document.getElementById("file-upload-toolbar")?.click()}
                >
                  <Upload className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline ml-1">Upload</span>
                </Button>
              </label>
              <input
                id="file-upload-toolbar"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Video Gallery */}
              <Button
                onClick={() => setIsVideoModalOpen(true)}
                size="sm"
                className="h-10 sm:h-8 w-full sm:w-auto min-h-[44px] sm:min-h-0 bg-secondary hover:bg-muted touch-manipulation justify-center"
              >
                <VideoIcon className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline ml-1">Video</span>
              </Button>

              {/* Image Gallery */}
              <Button
                onClick={() => setIsGalleryModalOpen(true)}
                size="sm"
                className="h-10 sm:h-8 w-full sm:w-auto min-h-[44px] sm:min-h-0 bg-secondary hover:bg-muted touch-manipulation justify-center"
              >
                <ImageIcon className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline ml-1">Gallery</span>
              </Button>

              {/* Settings */}
              <div className="w-full sm:w-auto">
                <ModelSettingsModal settings={modelSettings} onSave={handleSaveModelSettings} />
              </div>
            </div>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 border-t border-border/50">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="h-8 sm:h-7 text-xs text-muted-foreground hover:text-white min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              Deselect All
            </Button>
            <div className="flex items-center gap-2 min-h-[44px] sm:min-h-0">
              <Checkbox
                id="show-selected"
                checked={showOnlySelected}
                onCheckedChange={(checked) => setShowOnlySelected(checked as boolean)}
                className="min-h-[20px] min-w-[20px]"
              />
              <Label htmlFor="show-selected" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                Show only selected
              </Label>
            </div>
          </div>
        </div>
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
        {/* <AnimatorUnifiedGallery
          videos={generatedVideos}
          onDelete={handleDeleteVideo}
          onDownload={handleDownloadVideo}
        /> */}
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
                {isGenerating ? `Generating...` : `Generate Videos (${selectedCount} selected) - 75 credits`}
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
    </div>
  )
}
