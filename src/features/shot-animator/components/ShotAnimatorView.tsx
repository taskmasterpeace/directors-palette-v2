'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { AnimatorControls } from './AnimatorControls'
import { AnimatorPreview } from './AnimatorPreview'
import { AnimatorSettings } from './AnimatorSettings'
import { ReferenceImagesModal } from './ReferenceImagesModal'
import { LastFrameModal } from './LastFrameModal'
import { GallerySelectModal } from './GallerySelectModal'
import VideoPreviewsModal from "./VideoPreviewsModal"
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
  AnimatorSettings as AnimatorSettingsType,
} from '../types'
import {
  ANIMATION_MODELS,
  DEFAULT_MODEL_SETTINGS,
  ACTIVE_VIDEO_MODELS,
  DEFAULT_ACTIVE_MODEL,
  COST_CONFIRM_THRESHOLD_PTS,
} from '../config/models.config'
import { VIDEO_MODEL_PRICING } from '../types'
import { toast } from '@/hooks/use-toast'
import { ALLOWED_IMAGE_TYPES, GALLERY_IMAGE_MIME_TYPE, GalleryImageDragPayload } from '../constants/drag-drop.constants'
import { filesToShotConfigs, findOversizedFiles } from '../utils/files-to-shot-configs'
import { logger } from '@/lib/logger'

export function ShotAnimatorView() {
  // Auth and hooks
  const { user } = useAuth()
  const { isGenerating, generationPhase, generateVideos, retrySingleVideo } = useVideoGeneration()
  const { galleryImages, currentPage, totalPages, loadPage } = useGallery(true, 6)
  const { shotAnimator, updateShotAnimatorSettings } = useSettings()

  // Shot Animator Store
  const { shotConfigs, setShotConfigs, addShotConfigs, updateShotConfig, removeShotConfig, clearShotConfigs, moveShotConfig } = useShotAnimatorStore()
  const [mobileGalleryOpen, setMobileGalleryOpen] = useState(false)

  // State — restore last-used model from settings, falling back to the curated default.
  // A saved model that's no longer in ACTIVE_VIDEO_MODELS (old Seedance Lite, Kling, WAN, etc.)
  // is migrated to DEFAULT_ACTIVE_MODEL so the dropdown always matches selectedModel.
  const savedModel = shotAnimator.selectedModel as AnimationModel | undefined
  const [selectedModel, setSelectedModel] = useState<AnimationModel>(
    savedModel && ACTIVE_VIDEO_MODELS.includes(savedModel)
      ? savedModel
      : DEFAULT_ACTIVE_MODEL
  )

  // Show the migration toast exactly once per session if we bumped a legacy model.
  const migrationToastShownRef = useRef(false)

  // Sync local state when settings load from database (async). If the persisted
  // value is a legacy model, migrate to DEFAULT_ACTIVE_MODEL and persist the change
  // so the next session starts clean.
  useEffect(() => {
    const persisted = shotAnimator.selectedModel as AnimationModel | undefined
    if (!persisted) return

    if (ACTIVE_VIDEO_MODELS.includes(persisted)) {
      if (persisted !== selectedModel) setSelectedModel(persisted)
      return
    }

    // Legacy model — migrate and notify once.
    const legacyConfig = ANIMATION_MODELS[persisted]
    const legacyName = legacyConfig?.displayName ?? persisted
    setSelectedModel(DEFAULT_ACTIVE_MODEL)
    updateShotAnimatorSettings({ selectedModel: DEFAULT_ACTIVE_MODEL })
    if (!migrationToastShownRef.current) {
      migrationToastShownRef.current = true
      toast({
        title: 'Model updated',
        description: `${legacyName} has been retired. Shot Animator now uses Seedance 1.5 Pro, 2.0 Fast, and 2.0. Switched you to ${ANIMATION_MODELS[DEFAULT_ACTIVE_MODEL].displayName}.`,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-sync when the persisted value changes
  }, [shotAnimator.selectedModel])

  // Persist model choice when it changes
  const handleModelChange = (model: AnimationModel) => {
    setSelectedModel(model)
    updateShotAnimatorSettings({ selectedModel: model })
  }

  // Get model settings from settings store, merging with defaults per-model
  const modelSettings = useMemo(() => {
    const saved = shotAnimator.modelSettings as Partial<AnimatorSettingsType> | undefined
    if (!saved) return DEFAULT_MODEL_SETTINGS
    const merged = { ...DEFAULT_MODEL_SETTINGS } as AnimatorSettingsType
    for (const key of Object.keys(merged) as AnimationModel[]) {
      if (saved[key]) {
        merged[key] = { ...merged[key], ...saved[key] }
      }
    }
    return merged
  }, [shotAnimator.modelSettings])

  // Modals
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [showCostConfirm, setShowCostConfirm] = useState(false)
  const [refEditState, setRefEditState] = useState<{ isOpen: boolean; configId?: string }>({ isOpen: false })
  const [lastFrameEditState, setLastFrameEditState] = useState<{ isOpen: boolean; configId?: string }>({ isOpen: false })

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  // Gallery panel state
  const [galleryCollapsed, setGalleryCollapsed] = useState(false)

  // Clipboard paste — Ctrl+V adds images as new shots, but only when the
  // user isn't typing into an input/textarea/contenteditable. Without this
  // guard, pasting an image while focused inside the prompt textarea would
  // both steal the text paste and add an orphan shot.
  useEffect(() => {
    const isEditableTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false
      if (el.isContentEditable) return true
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }

    const handlePaste = async (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length === 0) return
      e.preventDefault()
      const oversized = findOversizedFiles(imageFiles)
      const newConfigs = await filesToShotConfigs(imageFiles)
      addShotConfigs(newConfigs)
      if (oversized.length > 0) {
        toast({
          title: 'Large pasted image — won\'t persist on refresh',
          description: `${oversized[0]} exceeds 3MB. Ships fine to Replicate, but won't survive a reload.`,
        })
      } else {
        toast({ title: 'Image Pasted', description: `Added ${newConfigs.length} image${newConfigs.length > 1 ? 's' : ''} from clipboard.` })
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [addShotConfigs])

  // Alt+ArrowUp / Alt+ArrowDown — reorder the shot card under the user's focus.
  // We resolve the target card by walking up from document.activeElement to the
  // nearest [data-shot-id], which lets users focus any interactive element
  // inside a card (checkbox, prompt box, button) and still reorder.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return
      const card = active.closest('[data-shot-id]') as HTMLElement | null
      if (!card) return
      const id = card.getAttribute('data-shot-id')
      if (!id) return
      e.preventDefault()
      moveShotConfig(id, e.key === 'ArrowUp' ? -1 : 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moveShotConfig])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  const currentModelConfig = ANIMATION_MODELS[selectedModel] || ANIMATION_MODELS['seedance-1.5-pro']

  // Filtered shots — search matches both imageName and prompt (case-insensitive OR).
  const filteredShots = shotConfigs
    .filter((shot) => {
      if (showOnlySelected && !shot.includeInBatch) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const inName = shot.imageName.toLowerCase().includes(q)
        const inPrompt = (shot.prompt ?? '').toLowerCase().includes(q)
        if (!inName && !inPrompt) return false
      }
      return true
    })

  const selectedCount = shotConfigs.filter((s) => s.includeInBatch).length

  // Calculate estimated cost for the batch
  const estimatedCost = useMemo(() => {
    if (selectedCount === 0) return 0
    const settings = modelSettings[selectedModel]
    const pricing = VIDEO_MODEL_PRICING[selectedModel]

    if (!settings || !pricing) return 0

    const pricePerUnit = pricing[settings.resolution] ?? pricing['720p'] ?? 0

    if (currentModelConfig.pricingType === 'per-video') {
      return selectedCount * pricePerUnit
    } else {
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

            if (!galleryIdsSet.has(updatedRecord.id)) return

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

  // Polling fallback
  useVideoPolling({
    shotConfigs,
    setShotConfigs,
    enabled: !!user,
  })

  // Notify (don't wipe) when switching to a model that doesn't support last frame.
  // The lastFrameImage stays on each shot so switching back restores it.
  // Generation-time filtering in useVideoGeneration skips the field for unsupported models.
  useEffect(() => {
    if (currentModelConfig.supportsLastFrame) return
    const shotsWithLastFrame = shotConfigs.filter(shot => shot.lastFrameImage).length
    if (shotsWithLastFrame === 0) return

    toast({
      title: 'Last frame will be ignored',
      description: `${currentModelConfig.displayName} doesn't support last frame control. ${shotsWithLastFrame} shot${shotsWithLastFrame > 1 ? 's' : ''} will generate without it. Your images are preserved — switch back to restore.`,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only trigger on model change
  }, [selectedModel, currentModelConfig.supportsLastFrame, currentModelConfig.displayName])

  // Adjust aspect ratio only when the stored per-model ratio is no longer valid
  // for that model (defensive: this can only happen after a model config change).
  useEffect(() => {
    const currentSettings = modelSettings[selectedModel]
    if (!currentSettings) return

    const currentAspectRatio = currentSettings.aspectRatio
    const supportedRatios = currentModelConfig.supportedAspectRatios

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
        title: 'Aspect ratio adjusted',
        description: `${currentModelConfig.displayName} doesn't support ${currentAspectRatio}. Using ${newRatio} instead.`,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Only trigger on model change
  }, [selectedModel, currentModelConfig.displayName, currentModelConfig.supportedAspectRatios])

  // Transform gallery images for the modal
  const transformedGalleryImages = useMemo(() => {
    return galleryImages
      .filter((item) => item.public_url)
      .map((item) => {
        const metadata = (item.metadata as Record<string, unknown>) || {}
        const originalPrompt = (metadata.prompt as string) || ''
        const imageModel = (metadata.model as string) || undefined
        return {
          id: item.id,
          url: item.public_url!,
          name: originalPrompt || `Image ${item.id.slice(0, 8)}`,
          originalPrompt,
          imageModel,
          createdAt: new Date(item.created_at),
        }
      })
  }, [galleryImages])

  // Handlers
  const handleGallerySelect = (images: { id: string; url: string; name: string; originalPrompt?: string; imageModel?: string; createdAt: Date }[]) => {
    const newConfigs: ShotAnimationConfig[] = images.map((img) => ({
      id: `shot-${Date.now()}-${Math.random()}`,
      imageUrl: img.url,
      imageName: img.name,
      imageModel: img.imageModel,
      prompt: "",
      originalPrompt: img.originalPrompt,
      referenceImages: [],
      includeInBatch: true,
      generatedVideos: []
    }))
    addShotConfigs(newConfigs)
  }

  // Drag-and-drop: React event handlers on the drop zone div
  const handleZoneDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setIsDragOver(true)
    }
  }, [])

  const handleZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleZoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0
      setIsDragOver(false)
    }
  }, [])

  const handleZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragOver(false)
    const galleryData = e.dataTransfer?.getData(GALLERY_IMAGE_MIME_TYPE)
    if (galleryData) {
      try {
        const parsed = JSON.parse(galleryData) as GalleryImageDragPayload
        const newConfig: ShotAnimationConfig = {
          id: `shot-${Date.now()}-${Math.random()}`,
          imageUrl: parsed.url,
          imageName: parsed.name,
          imageModel: parsed.imageModel,
          prompt: '',
          originalPrompt: parsed.originalPrompt,
          referenceImages: [],
          includeInBatch: true,
          generatedVideos: [],
        }
        addShotConfigs([newConfig])
      } catch { /* ignore malformed data */ }
      return
    }

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const validFiles = Array.from(files).filter((f) =>
      ALLOWED_IMAGE_TYPES.includes(f.type)
    )
    if (validFiles.length === 0) return

    const oversized = findOversizedFiles(validFiles)
    if (oversized.length > 0) {
      const preview = oversized.slice(0, 2).join(', ')
      const extra = oversized.length > 2 ? `, +${oversized.length - 2} more` : ''
      toast({
        title: 'Large image — won\'t persist on refresh',
        description: `${preview}${extra} exceeds 3MB. The shot will generate fine, but reload the page and it'll be gone unless you pick it from the gallery instead.`,
      })
    }

    const newConfigs = await filesToShotConfigs(validFiles)
    addShotConfigs(newConfigs)
  }, [addShotConfigs])

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

    if (results && results.length > 0) {
      const updatedConfigs = shotConfigs.map((config) => {
        const result = results.find((r) => r.shotId === config.id)
        if (result && result.success) {
          const newVideo = {
            galleryId: result.galleryId!,
            status: 'processing' as const,
            createdAt: new Date(),
            model: selectedModel,
          }
          return {
            ...config,
            generatedVideos: [...(config.generatedVideos || []), newVideo],
            includeInBatch: false
          }
        }
        return config
      })
      setShotConfigs(updatedConfigs)
    }

    logger.shotCreator.info('Generation results', { results: results })
  }

  const handleGenerateAll = async () => {
    if (!user?.id) {
      logger.shotCreator.error('User not authenticated')
      return
    }

    if (estimatedCost > COST_CONFIRM_THRESHOLD_PTS) {
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

  const handleSaveModelSettings = async (newSettings: AnimatorSettingsType) => {
    await updateShotAnimatorSettings({ modelSettings: newSettings })
  }

  const handleRetryVideo = async (shotConfigId: string, galleryId: string) => {
    if (!user?.id) {
      logger.shotCreator.error('User not authenticated')
      return
    }

    const shotConfig = shotConfigs.find((c) => c.id === shotConfigId)
    if (!shotConfig) {
      logger.shotCreator.error('Shot config not found')
      return
    }

    // Update video status to 'processing' before retrying
    const updatedConfigs = shotConfigs.map((config) => {
      if (config.id === shotConfigId) {
        const updatedVideos = config.generatedVideos?.map((video) => {
          if (video.galleryId === galleryId) {
            return { ...video, status: 'processing' as const, error: undefined }
          }
          return video
        })
        return { ...config, generatedVideos: updatedVideos }
      }
      return config
    })
    setShotConfigs(updatedConfigs)

    const result = await retrySingleVideo(
      shotConfig,
      selectedModel,
      modelSettings[selectedModel]
    )

    if (result.success && result.galleryId) {
      const finalConfigs = shotConfigs.map((config) => {
        if (config.id === shotConfigId) {
          const updatedVideos = config.generatedVideos?.map((video) => {
            if (video.galleryId === galleryId) {
              return { ...video, galleryId: result.galleryId!, status: 'processing' as const, error: undefined }
            }
            return video
          })
          return { ...config, generatedVideos: updatedVideos }
        }
        return config
      })
      setShotConfigs(finalConfigs)
    } else if (!result.success) {
      const failedConfigs = shotConfigs.map((config) => {
        if (config.id === shotConfigId) {
          const updatedVideos = config.generatedVideos?.map((video) => {
            if (video.galleryId === galleryId) {
              return { ...video, status: 'failed' as const, error: result.error || 'Retry failed' }
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
      <AnimatorControls
        selectedModel={selectedModel}
        modelSettings={modelSettings}
        selectedCount={selectedCount}
        totalShotCount={shotConfigs.length}
        searchQuery={searchQuery}
        showOnlySelected={showOnlySelected}
        onModelChange={handleModelChange}
        onSearchChange={setSearchQuery}
        onShowOnlySelectedChange={setShowOnlySelected}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onClearAll={clearShotConfigs}
        onSaveModelSettings={handleSaveModelSettings}
        onOpenGalleryModal={() => setIsGalleryModalOpen(true)}
        onOpenVideoModal={() => setIsVideoModalOpen(true)}
        addShotConfigs={addShotConfigs}
      />

      {/* Main Content - Two Column Layout */}
      <AnimatorPreview
        filteredShots={filteredShots}
        shotConfigs={shotConfigs}
        selectedModel={selectedModel}
        currentModelSettings={modelSettings[selectedModel]}
        isDragOver={isDragOver}
        galleryCollapsed={galleryCollapsed}
        mobileGalleryOpen={mobileGalleryOpen}
        onDragEnter={handleZoneDragEnter}
        onDragOver={handleZoneDragOver}
        onDragLeave={handleZoneDragLeave}
        onDrop={handleZoneDrop}
        onUpdateShotConfig={handleUpdateShotConfig}
        onDeleteShot={handleDeleteShot}
        onManageReferences={(configId) => setRefEditState({ isOpen: true, configId })}
        onManageLastFrame={(configId) => setLastFrameEditState({ isOpen: true, configId })}
        onRetryVideo={handleRetryVideo}
        onDropStartFrame={(configId, imageUrl, imageName) => updateShotConfig(configId, { imageUrl, imageName: imageName || shotConfigs.find(c => c.id === configId)?.imageName || '' })}
        onDropLastFrame={(configId, imageUrl) => updateShotConfig(configId, { lastFrameImage: imageUrl })}
        onDeleteVideo={handleDeleteVideo}
        onToggleGalleryCollapsed={() => setGalleryCollapsed(!galleryCollapsed)}
        onSetMobileGalleryOpen={setMobileGalleryOpen}
        onOpenGalleryModal={() => setIsGalleryModalOpen(true)}
      />

      {/* Bottom Generate Bar & Cost Confirmation */}
      <AnimatorSettings
        selectedCount={selectedCount}
        estimatedCost={estimatedCost}
        isGenerating={isGenerating}
        generationPhase={generationPhase}
        showCostConfirm={showCostConfirm}
        selectedModel={selectedModel}
        hasUser={!!user}
        onGenerateAll={handleGenerateAll}
        onConfirmGeneration={handleConfirmGeneration}
        onCostConfirmChange={setShowCostConfirm}
      />

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
          startFrameUrl={currentLastFrameConfig.imageUrl}
        />
      )}
    </div>
  )
}
