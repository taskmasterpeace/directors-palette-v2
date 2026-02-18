'use client'

import { useState } from 'react'
import { toast as sonnerToast } from 'sonner'
import { useToast } from '@/hooks/use-toast'
import type {
  AnimationModel,
  ShotAnimationConfig,
  ModelSettings,
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationError,
} from '../types'
import { ANIMATION_MODELS } from '../config/models.config'

interface GenerationResult {
  shotId: string
  success: boolean
  galleryId?: string
  predictionId?: string
  error?: string
}

export type GenerationPhase = 'idle' | 'uploading' | 'submitting' | 'done'

interface UseVideoGenerationReturn {
  isGenerating: boolean
  generationPhase: GenerationPhase
  generateVideos: (
    shots: ShotAnimationConfig[],
    model: AnimationModel,
    modelSettings: ModelSettings
  ) => Promise<GenerationResult[]>
  retrySingleVideo: (
    shot: ShotAnimationConfig,
    model: AnimationModel,
    modelSettings: ModelSettings
  ) => Promise<GenerationResult>
}

export function useVideoGeneration(): UseVideoGenerationReturn {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle')

  /**
   * Upload a file to Replicate and return the URL
   */
  const uploadFileToReplicate = async (url: string, filename: string): Promise<string> => {
    try {
      // If it's already a Replicate URL or external URL, return as-is
      if (url.startsWith('https://api.replicate.com') || (url.startsWith('https') && !url.startsWith('data:') && !url.startsWith('blob:'))) {
        return url
      }

      let file: File

      if (url.startsWith('data:')) {
        const response = await fetch(url)
        const blob = await response.blob()
        file = new File([blob], filename, { type: blob.type })
      } else if (url.startsWith('blob:')) {
        const response = await fetch(url)
        const blob = await response.blob()
        file = new File([blob], filename, { type: blob.type })
      } else {
        throw new Error(`Unsupported URL format for ${filename}: ${url}`)
      }

      // Upload to Replicate
      const formData = new FormData()
      formData.append('file', file)
      const uploadResponse = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json()
        throw new Error(error.error || 'Failed to upload file to Replicate')
      }

      const { url: replicateUrl } = await uploadResponse.json()
      return replicateUrl
    } catch (error) {
      throw error
    }
  }

  const generateSingleVideo = async (
    shot: ShotAnimationConfig,
    model: AnimationModel,
    modelSettings: ModelSettings
  ): Promise<GenerationResult> => {
    try {
      // Upload main image to Replicate
      const uploadedImageUrl = await uploadFileToReplicate(shot.imageUrl, shot.imageName)

      // Upload reference images to Replicate
      let uploadedReferenceImages: string[] | undefined
      if (shot.referenceImages.length > 0) {
        uploadedReferenceImages = await Promise.all(
          shot.referenceImages.map((refUrl, index) =>
            uploadFileToReplicate(refUrl, `reference-${index}-${shot.imageName}`)
          )
        )
      }

      // Upload last frame image to Replicate
      let uploadedLastFrameImage: string | undefined
      if (shot.lastFrameImage) {
        uploadedLastFrameImage = await uploadFileToReplicate(
          shot.lastFrameImage,
          `lastframe-${shot.imageName}`
        )
      }

      // Seedance Lite doesn't support using both reference images and last frame image
      // Prioritize last frame image over reference images
      let finalReferenceImages = uploadedReferenceImages
      const finalLastFrameImage = uploadedLastFrameImage

      if (model === 'seedance-lite' && uploadedReferenceImages && uploadedLastFrameImage) {
        sonnerToast.warning('Reference Images Skipped', {
          description: `${shot.imageName}: Seedance Lite can't use both reference images and last frame. Using last frame only.`,
        })
        finalReferenceImages = undefined
      }

      const requestBody: VideoGenerationRequest = {
        model,
        prompt: shot.prompt,
        image: uploadedImageUrl,
        modelSettings,
        referenceImages: finalReferenceImages,
        lastFrameImage: finalLastFrameImage,
        extraMetadata: {
          source: 'shot-animator',
        },
        // user_id removed - now extracted server-side from session cookie
      }

      const response = await fetch('/api/generation/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as VideoGenerationError
        throw new Error(errorData.details?.join(', ') || errorData.error || 'Generation failed')
      }

      const data = (await response.json()) as VideoGenerationResponse

      return {
        shotId: shot.id,
        success: true,
        galleryId: data.galleryId,
        predictionId: data.predictionId,
      }
    } catch (error) {
      console.error(`Failed to generate video for shot ${shot.id}:`, error)
      return {
        shotId: shot.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  const generateVideos = async (
    shots: ShotAnimationConfig[],
    model: AnimationModel,
    modelSettings: ModelSettings
  ): Promise<GenerationResult[]> => {
    setIsGenerating(true)
    setGenerationPhase('uploading')

    try {
      // Filter shots that are selected for batch generation
      const selectedShots = shots.filter((shot) => shot.includeInBatch)

      if (selectedShots.length === 0) {
        toast({
          title: 'No Shots Selected',
          description: 'Please select at least one shot to generate videos',
          variant: 'destructive',
        })
        return []
      }

      // Validate that selected shots have prompts
      const shotsWithoutPrompt = selectedShots.filter((shot) => !shot.prompt?.trim())
      if (shotsWithoutPrompt.length > 0) {
        toast({
          title: 'Missing Prompts',
          description: `${shotsWithoutPrompt.length} shot(s) are missing prompts. Please add prompts before generating.`,
          variant: 'destructive',
        })
        return []
      }

      toast({
        title: 'Starting Generation',
        description: `Generating ${selectedShots.length} video(s) using ${ANIMATION_MODELS[model]?.displayName ?? model}`,
      })

      setGenerationPhase('submitting')

      // Generate all videos in parallel (uploads + API calls)
      const results = await Promise.all(
        selectedShots.map((shot) => generateSingleVideo(shot, model, modelSettings))
      )

      // Count successes and failures
      const successCount = results.filter((r) => r.success).length
      const failureCount = results.filter((r) => !r.success).length

      // Show result toast
      if (successCount > 0) {
        toast({
          title: 'Generation Started',
          description: `${successCount} video(s) are being generated. You'll see them in the gallery when complete.`,
        })
      }

      if (failureCount > 0) {
        toast({
          title: 'Some Generations Failed',
          description: `${failureCount} video(s) failed to start. Check console for details.`,
          variant: 'destructive',
        })
      }

      return results
    } catch (error) {
      console.error('Batch generation error:', error)
      toast({
        title: 'Generation Error',
        description: error instanceof Error ? error.message : 'Failed to generate videos',
        variant: 'destructive',
      })
      return []
    } finally {
      setIsGenerating(false)
      setGenerationPhase('idle')
    }
  }

  const retrySingleVideo = async (
    shot: ShotAnimationConfig,
    model: AnimationModel,
    modelSettings: ModelSettings
  ): Promise<GenerationResult> => {
    setIsGenerating(true)

    try {
      toast({
        title: 'Retrying Generation',
        description: `Retrying video generation for ${shot.imageName}`,
      })

      // Generate the video using existing logic
      const result = await generateSingleVideo(shot, model, modelSettings)

      if (result.success) {
        toast({
          title: 'Retry Started',
          description: 'Video generation has been restarted. You\'ll see it when complete.',
        })
      } else {
        toast({
          title: 'Retry Failed',
          description: result.error || 'Failed to retry video generation',
          variant: 'destructive',
        })
      }

      return result
    } catch (error) {
      console.error('Retry generation error:', error)
      toast({
        title: 'Retry Error',
        description: error instanceof Error ? error.message : 'Failed to retry video generation',
        variant: 'destructive',
      })
      return {
        shotId: shot.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      setIsGenerating(false)
      setGenerationPhase('idle')
    }
  }

  return {
    isGenerating,
    generationPhase,
    generateVideos,
    retrySingleVideo,
  }
}
