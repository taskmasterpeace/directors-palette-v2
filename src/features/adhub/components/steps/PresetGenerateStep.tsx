'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  ArrowLeft,
  Video,
  User,
  Mic,
  Settings2,
  Loader2,
  Coins,
  Check,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

import { useAdhubStore } from '../../store/adhub.store'
import { ADHUB_PRESETS } from '../../data/presets.data'
import { ASPECT_RATIO_OPTIONS } from '../../types/adhub.types'
import type { AdhubPreset, AdhubBrandImage, AdhubLipSyncModel, AdhubLipSyncResolution } from '../../types/adhub.types'
import { AdhubModelSelector } from '../AdhubModelSelector'
import { ReferenceImagesInfoTip } from '../InfoTip'

import {
  AvatarImageUploader,
  AudioInputSection,
  LipSyncCostPreview,
} from '@/features/lip-sync/components'
import {
  getAllLipSyncModels,
  calculateLipSyncCost,
} from '@/features/lip-sync/config/lip-sync-models.config'
import { formatCost } from '@/features/lip-sync/services/lip-sync-generation.service'
import { createLogger } from '@/lib/logger'


const log = createLogger('AdHub')
export function PresetGenerateStep() {
  const [isGeneratingTts, setIsGeneratingTts] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [brandImages, setBrandImages] = useState<AdhubBrandImage[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(true)

  const {
    selectedBrand,
    selectedProduct,
    selectedPreset,
    selectPreset,
    selectedReferenceImages,
    toggleReferenceImage,
    aspectRatio,
    setAspectRatio,
    selectedModel,
    // Video config
    videoAdConfig,
    setVideoAdEnabled,
    setSpokespersonImage,
    setVideoAudioSource,
    setUploadedAudio,
    setTtsScript,
    setTtsVoiceId,
    setGeneratedTtsAudio,
    setLipSyncModel,
    setLipSyncResolution,
    setLipSyncResult,
    // Generation state
    setGenerationResult,
    setError,
    previousStep,
  } = useAdhubStore()

  const lipSyncModels = getAllLipSyncModels()

  // Fetch brand images
  useEffect(() => {
    async function fetchBrandImages() {
      if (!selectedBrand) return
      try {
        const response = await fetch(`/api/adhub/brands/${selectedBrand.id}/images`)
        if (response.ok) {
          const data = await response.json()
          setBrandImages(data.images || [])
        }
      } catch (error) {
        log.error('Failed to fetch brand images', { error: error instanceof Error ? error.message : String(error) })
      } finally {
        setIsLoadingImages(false)
      }
    }
    fetchBrandImages()
  }, [selectedBrand])

  // Calculate video cost
  const estimatedCost = useMemo(() => {
    if (!videoAdConfig.enabled || !videoAdConfig.audioDurationSeconds) return 0
    return calculateLipSyncCost(
      videoAdConfig.modelSettings.model,
      videoAdConfig.audioDurationSeconds,
      videoAdConfig.modelSettings.resolution
    )
  }, [videoAdConfig.enabled, videoAdConfig.audioDurationSeconds, videoAdConfig.modelSettings.model, videoAdConfig.modelSettings.resolution])

  const effectiveAudioUrl = useMemo(() => {
    return videoAdConfig.audioSource === 'tts'
      ? videoAdConfig.generatedTtsAudioUrl
      : videoAdConfig.uploadedAudioUrl
  }, [videoAdConfig.audioSource, videoAdConfig.generatedTtsAudioUrl, videoAdConfig.uploadedAudioUrl])

  // Check if ready to generate
  const canGenerate = useMemo(() => {
    if (!selectedPreset) return false
    if (videoAdConfig.enabled) {
      return !!(
        videoAdConfig.spokespersonImageUrl &&
        effectiveAudioUrl &&
        videoAdConfig.audioDurationSeconds &&
        videoAdConfig.audioDurationSeconds > 0
      )
    }
    return true
  }, [selectedPreset, videoAdConfig, effectiveAudioUrl])

  // Handle TTS generation
  const handleGenerateTts = useCallback(async () => {
    if (!videoAdConfig.ttsScript.trim()) {
      toast.error('Please enter a script')
      return
    }
    setIsGeneratingTts(true)
    try {
      const response = await fetch('/api/storybook/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: videoAdConfig.ttsScript,
          voiceId: videoAdConfig.ttsVoiceId,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate audio')
      }
      const result = await response.json()
      setGeneratedTtsAudio(result.audioUrl, result.durationSeconds)
      toast.success('Audio generated successfully!')
    } catch (error) {
      log.error('TTS generation error', { error: error instanceof Error ? error.message : String(error) })
      toast.error(error instanceof Error ? error.message : 'Failed to generate audio')
    } finally {
      setIsGeneratingTts(false)
    }
  }, [videoAdConfig.ttsScript, videoAdConfig.ttsVoiceId, setGeneratedTtsAudio])

  const handleAudioChange = useCallback((url: string | null, duration: number | null, file?: File) => {
    setUploadedAudio(url, duration, file)
  }, [setUploadedAudio])

  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/upload-file', { method: 'POST', body: formData })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload file')
    }
    const result = await response.json()
    return result.url
  }, [])

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!selectedBrand || !selectedProduct || !selectedPreset) {
      setError('Missing required selections')
      return
    }

    setIsGenerating(true)
    setError(undefined)

    try {
      const requestBody: Record<string, unknown> = {
        brandId: selectedBrand.id,
        productId: selectedProduct.id,
        presetSlug: selectedPreset.slug,
        selectedReferenceImages,
        aspectRatio,
        model: selectedModel,
      }

      toast.info('Generating your image ad...')
      const imageResponse = await fetch('/api/adhub/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!imageResponse.ok) {
        const errorData = await imageResponse.json()
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to generate ad'
        throw new Error(errorMessage)
      }

      const imageResult = await imageResponse.json()

      // Optional video generation
      if (videoAdConfig.enabled) {
        toast.info(`Generating lip-sync video (${formatCost(estimatedCost)})...`)

        let avatarUrl = videoAdConfig.spokespersonImageUrl
        let audioUrl = effectiveAudioUrl

        if (videoAdConfig.spokespersonImageFile) {
          avatarUrl = await uploadFile(videoAdConfig.spokespersonImageFile)
        }
        if (videoAdConfig.audioSource === 'upload' && videoAdConfig.uploadedAudioFile) {
          audioUrl = await uploadFile(videoAdConfig.uploadedAudioFile)
        }

        if (!avatarUrl || !audioUrl || !videoAdConfig.audioDurationSeconds) {
          throw new Error('Missing avatar image or audio for video generation')
        }

        const lipSyncResponse = await fetch('/api/generation/lip-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            avatarImageUrl: avatarUrl,
            audioUrl: audioUrl,
            audioDurationSeconds: videoAdConfig.audioDurationSeconds,
            modelSettings: {
              model: videoAdConfig.modelSettings.model,
              resolution: videoAdConfig.modelSettings.resolution,
            },
            metadata: { source: 'adhub', projectId: imageResult.adId },
          }),
        })

        if (!lipSyncResponse.ok) {
          const errorData = await lipSyncResponse.json()
          toast.error(`Video generation failed: ${errorData.error || 'Unknown error'}`)
          setLipSyncResult(null, null, null, errorData.error || 'Video generation failed')
        } else {
          const lipSyncResult = await lipSyncResponse.json()
          setLipSyncResult(lipSyncResult.predictionId, lipSyncResult.galleryId, null)
          toast.success('Video generation started!')
        }
      }

      setGenerationResult(imageResult)
    } catch (error) {
      log.error('Generation failed', { error: error instanceof Error ? error.message : String(error) })
      setError(error instanceof Error ? error.message : 'Failed to generate ad')
      toast.error(error instanceof Error ? error.message : 'Failed to generate ad')
    } finally {
      setIsGenerating(false)
    }
  }, [
    selectedBrand, selectedProduct, selectedPreset,
    selectedReferenceImages, aspectRatio, selectedModel,
    videoAdConfig, effectiveAudioUrl, estimatedCost,
    uploadFile, setError, setGenerationResult, setLipSyncResult,
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Create Your Ad</h2>
        <p className="text-muted-foreground mt-1">
          Pick a preset, configure settings, and generate.
        </p>
      </div>

      {/* Preset Picker */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Ad Preset
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ADHUB_PRESETS.map((preset: AdhubPreset) => {
            const isSelected = selectedPreset?.slug === preset.slug
            return (
              <button
                key={preset.slug}
                onClick={() => selectPreset(preset)}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all text-left',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-transparent bg-muted/50 hover:border-primary/30'
                )}
              >
                <span className="text-2xl block mb-2">{preset.icon}</span>
                <span className="font-medium text-sm block">{preset.name}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{preset.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedPreset && (
        <>
          {/* Model Selector */}
          <AdhubModelSelector />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Aspect Ratio + Reference Images */}
            <div className="space-y-6">
              {/* Aspect Ratio */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Aspect Ratio
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ASPECT_RATIO_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setAspectRatio(option.value)}
                      className={cn(
                        'flex flex-col items-center p-2 rounded-lg border-2 transition-all text-center min-h-[44px]',
                        aspectRatio === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted/50 hover:border-primary/30'
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-center w-10 h-10">
                        <div
                          className={cn(
                            'bg-foreground/20 rounded-sm',
                            option.value === '1:1' && 'w-8 h-8',
                            option.value === '4:5' && 'w-7 h-8',
                            option.value === '9:16' && 'w-5 h-9',
                            option.value === '16:9' && 'w-10 h-6',
                            option.value === '4:3' && 'w-9 h-7'
                          )}
                        />
                      </div>
                      <span className="text-xs font-medium">{option.label}</span>
                      <span className="text-[10px] text-muted-foreground">{option.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Reference Images */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Brand Reference Images
                  </h3>
                  <ReferenceImagesInfoTip />
                </div>

                {selectedBrand?.logoUrl && (
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">Brand Logo (auto-included)</p>
                    <img
                      src={selectedBrand.logoUrl}
                      alt="Brand Logo"
                      className="h-12 object-contain"
                    />
                  </div>
                )}

                {isLoadingImages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : brandImages.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-lg">
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No reference images for this brand.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {brandImages.map((image) => {
                      const isSelected = selectedReferenceImages.includes(image.imageUrl)
                      return (
                        <button
                          key={image.id}
                          onClick={() => toggleReferenceImage(image.imageUrl)}
                          className={cn(
                            'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                            isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50'
                          )}
                        >
                          <img src={image.imageUrl} alt={image.description || 'Reference'} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Config Summary + Make It Talk */}
            <div className="space-y-6">
              {/* Config Summary */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Configuration Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Brand</p>
                    <p className="font-medium">{selectedBrand?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Product</p>
                    <p className="font-medium">{selectedProduct?.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Preset</p>
                    <p className="font-medium">{selectedPreset.icon} {selectedPreset.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Aspect Ratio</p>
                    <p className="font-medium">{aspectRatio}</p>
                  </div>
                </div>
              </div>

              {/* Make It Talk Section (collapsed) */}
              <div className="space-y-4 rounded-lg border border-border/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-medium">Make It Talk</h3>
                      <p className="text-xs text-muted-foreground">Add a video spokesperson</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setVideoAdEnabled(!videoAdConfig.enabled)}
                    className={cn(
                      'relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                      videoAdConfig.enabled ? 'bg-amber-500' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform',
                      videoAdConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </button>
                </div>

                {videoAdConfig.enabled && (
                  <div className="space-y-4 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Spokesperson */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-400" />
                          <Label className="text-xs uppercase tracking-wide">Spokesperson</Label>
                        </div>
                        <AvatarImageUploader
                          imageUrl={videoAdConfig.spokespersonImageUrl}
                          onImageChange={(url, file) => setSpokespersonImage(url, file)}
                          model={videoAdConfig.modelSettings.model}
                        />
                      </div>

                      {/* Audio */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-amber-400" />
                          <Label className="text-xs uppercase tracking-wide">Audio</Label>
                        </div>
                        <AudioInputSection
                          audioSource={videoAdConfig.audioSource}
                          onAudioSourceChange={setVideoAudioSource}
                          audioUrl={effectiveAudioUrl}
                          onAudioChange={handleAudioChange}
                          ttsScript={videoAdConfig.ttsScript}
                          onTtsScriptChange={setTtsScript}
                          ttsVoiceId={videoAdConfig.ttsVoiceId}
                          onTtsVoiceChange={setTtsVoiceId}
                          audioDuration={videoAdConfig.audioDurationSeconds}
                          isGeneratingTts={isGeneratingTts}
                          onGenerateTts={handleGenerateTts}
                        />
                      </div>

                      {/* Quality Settings */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-amber-400" />
                          <Label className="text-xs uppercase tracking-wide">Quality Settings</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="lip-sync-model" className="text-xs text-muted-foreground">Model</Label>
                            <Select value={videoAdConfig.modelSettings.model} onValueChange={(v) => setLipSyncModel(v as AdhubLipSyncModel)}>
                              <SelectTrigger id="lip-sync-model">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {lipSyncModels.map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    <div className="flex items-center gap-2">
                                      <Sparkles className="w-3 h-3 text-amber-400" />
                                      <span>{m.displayName}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="lip-sync-resolution" className="text-xs text-muted-foreground">Resolution</Label>
                            <Select value={videoAdConfig.modelSettings.resolution} onValueChange={(v) => setLipSyncResolution(v as AdhubLipSyncResolution)}>
                              <SelectTrigger id="lip-sync-resolution">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="720p">720p Standard</SelectItem>
                                <SelectItem value="1080p">1080p HD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <LipSyncCostPreview
                        model={videoAdConfig.modelSettings.model}
                        resolution={videoAdConfig.modelSettings.resolution}
                        durationSeconds={videoAdConfig.audioDurationSeconds}
                        showBreakdown
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Navigation + Generate */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <Button variant="outline" onClick={previousStep} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          {videoAdConfig.enabled && estimatedCost > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">{formatCost(estimatedCost)}</span>
              <span className="text-xs text-muted-foreground">for video</span>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-900 font-semibold px-6"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : videoAdConfig.enabled ? (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Ad + Video
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Ad
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
