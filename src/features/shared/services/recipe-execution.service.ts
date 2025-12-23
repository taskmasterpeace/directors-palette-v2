/**
 * Recipe Execution Service
 *
 * Shared service for executing multi-stage recipes with pipe chaining.
 * Used by both shot-creator and storybook features.
 */

import { getClient, TypedSupabaseClient } from '@/lib/db/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  Recipe,
  RecipeFieldValues,
  buildRecipePrompts,
} from '@/features/shot-creator/types/recipe.types'
import { imageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { uploadImageToReplicate } from '@/features/shot-creator/helpers/image-resize.helper'
import type { ImageModel, ImageModelSettings, ImageGenerationRequest } from '@/features/shot-creator/types/image-generation.types'

export interface RecipeExecutionOptions {
  recipe: Recipe
  fieldValues: RecipeFieldValues
  stageReferenceImages: string[][]  // Per-stage reference images [[stage0_refs], [stage1_refs], ...]
  model?: ImageModel
  aspectRatio?: string
  onProgress?: (stage: number, totalStages: number, status: string) => void
}

export interface RecipeExecutionResult {
  success: boolean
  imageUrls: string[]      // URL for each stage
  finalImageUrl?: string   // Last stage output
  error?: string
}

/**
 * Wait for an image to be completed in the gallery (for pipe chaining)
 * Waits specifically for permanent Supabase URL (not temporary Replicate URL)
 */
async function waitForImageCompletion(
  supabase: TypedSupabaseClient,
  galleryId: string,
  maxWaitTime: number = 120000 // 2 minutes
): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null
    let subscription: RealtimeChannel | null = null
    let pollInterval: NodeJS.Timeout | null = null

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (pollInterval) clearInterval(pollInterval)
      if (subscription) subscription.unsubscribe()
    }

    // Set timeout
    timeoutId = setTimeout(async () => {
      cleanup()

      // Check final status before timing out
      const { data: finalCheck } = await supabase
        .from('gallery')
        .select('status, public_url, error_message, metadata')
        .eq('id', galleryId)
        .single()

      const status = finalCheck?.status || 'unknown'
      const errorMsg = finalCheck?.error_message || (finalCheck?.metadata as { error?: string })?.error

      reject(new Error(
        `Timeout after ${maxWaitTime / 1000}s. Status: ${status}. ` +
        (errorMsg ? `Error: ${errorMsg}` : 'No public URL received from webhook.')
      ))
    }, maxWaitTime)

    // Poll every 2 seconds as backup to realtime subscription
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('public_url, status, error_message, metadata')
          .eq('id', galleryId)
          .single()

        if (error) {
          const isNetworkError = error.message?.toLowerCase().includes('failed to fetch') ||
            error.message?.toLowerCase().includes('network') ||
            error.code === ''

          if (isNetworkError) {
            console.warn('Network error in polling (will retry):', error.message)
            return
          }

          console.error('Error checking gallery status:', error)
          return
        }

        // Check for successful completion - must be Supabase URL (not temporary Replicate URL)
        if (data.public_url) {
          const isSupabaseUrl = data.public_url.includes('supabase.co')
          if (isSupabaseUrl) {
            cleanup()
            resolve(data.public_url)
            return
          } else {
            console.log('[Recipe Execution] Found temporary Replicate URL, waiting for Supabase upload...')
          }
        }

        // Check for failure
        if (data.status === 'failed') {
          cleanup()
          const errorMsg = data.error_message || (data.metadata as { error?: string })?.error || 'Generation failed'
          reject(new Error(`Generation failed: ${errorMsg}`))
          return
        }

        // Check for cancellation
        if (data.status === 'canceled') {
          cleanup()
          reject(new Error('Generation was canceled'))
          return
        }
      } catch (err) {
        console.error('Error in polling:', err)
      }
    }

    // Start polling immediately and every 2 seconds
    checkStatus()
    pollInterval = setInterval(checkStatus, 2000)

    // Subscribe to gallery updates for real-time notifications
    subscription = supabase
      .channel(`recipe-gallery-${galleryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gallery',
          filter: `id=eq.${galleryId}`
        },
        (payload) => {
          const updatedRecord = payload.new as {
            public_url?: string
            status?: string
            error_message?: string
            metadata?: { error?: string }
          }

          // Check if image is ready - must be Supabase URL (not temporary Replicate URL)
          if (updatedRecord.public_url) {
            const isSupabaseUrl = updatedRecord.public_url.includes('supabase.co')
            if (isSupabaseUrl) {
              cleanup()
              resolve(updatedRecord.public_url)
            }
          } else if (updatedRecord.status === 'failed') {
            cleanup()
            const errorMsg = updatedRecord.error_message || updatedRecord.metadata?.error || 'Generation failed'
            reject(new Error(`Generation failed: ${errorMsg}`))
          } else if (updatedRecord.status === 'canceled') {
            cleanup()
            reject(new Error('Generation was canceled'))
          }
        }
      )
      .subscribe()
  })
}

/**
 * Converts reference images to HTTPS URLs for Replicate API
 * Handles data URLs, blob URLs, and already-uploaded URLs
 */
async function prepareReferenceImagesForAPI(referenceImages: string[]): Promise<string[]> {
  const uploadedUrls: string[] = []

  for (const imageUrl of referenceImages) {
    // Skip empty URLs
    if (!imageUrl) continue

    // If already HTTPS URL, use as-is
    if (imageUrl.startsWith('https://')) {
      uploadedUrls.push(imageUrl)
      continue
    }

    // If data URL or blob URL, need to upload
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      try {
        // Convert to Blob
        const response = await fetch(imageUrl)
        const blob = await response.blob()

        // Convert Blob to File
        const file = new File([blob], `reference-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })

        // Upload to Replicate
        const httpsUrl = await uploadImageToReplicate(file)
        uploadedUrls.push(httpsUrl)
      } catch (error) {
        console.error('Failed to upload reference image:', error)
        // Skip failed uploads rather than failing the entire operation
      }
    }
  }

  return uploadedUrls
}

/**
 * Execute a multi-stage recipe with pipe chaining
 *
 * Each stage's output becomes the input for the next stage.
 * Stage reference images are combined with the previous output.
 */
export async function executeRecipe(options: RecipeExecutionOptions): Promise<RecipeExecutionResult> {
  const {
    recipe,
    fieldValues,
    stageReferenceImages,
    model = 'nano-banana-pro' as ImageModel,
    aspectRatio = '21:9',
    onProgress
  } = options

  try {
    // Initialize Supabase client
    const supabase = await getClient()

    // Build prompts for all stages
    const promptResult = buildRecipePrompts(recipe.stages, fieldValues)
    const { prompts } = promptResult
    const totalStages = prompts.length

    if (totalStages === 0) {
      return { success: false, imageUrls: [], error: 'Recipe has no stages' }
    }

    console.log(`[Recipe Execution] Starting ${totalStages}-stage recipe: ${recipe.name}`)

    const imageUrls: string[] = []
    let previousImageUrl: string | undefined = undefined

    // Execute each stage sequentially (pipe chaining)
    for (let i = 0; i < totalStages; i++) {
      const stagePrompt = prompts[i]
      const isFirstStage = i === 0
      const isLastStage = i === totalStages - 1

      onProgress?.(i, totalStages, `Processing stage ${i + 1}...`)

      // Get stage-specific reference images
      const rawStageRefs = stageReferenceImages[i] || []

      // Prepare references (upload data URLs to HTTPS)
      let preparedStageRefs: string[] = []
      if (rawStageRefs.length > 0) {
        try {
          preparedStageRefs = await prepareReferenceImagesForAPI(rawStageRefs)
          console.log(`[Recipe Execution] Stage ${i} refs prepared: ${preparedStageRefs.length} images`)
        } catch (uploadError) {
          console.error(`[Recipe Execution] Failed to prepare stage ${i} refs:`, uploadError)
        }
      }

      // Determine input images for this stage
      let inputImages: string[] | undefined
      if (isFirstStage) {
        // First stage: use stage 0's refs
        inputImages = preparedStageRefs.length > 0 ? preparedStageRefs : undefined
      } else {
        // Subsequent stages: combine previous output + this stage's refs
        const refs: string[] = []
        if (previousImageUrl) refs.push(previousImageUrl)
        refs.push(...preparedStageRefs)
        inputImages = refs.length > 0 ? refs : undefined
      }

      console.log(`[Recipe Execution] Stage ${i + 1}/${totalStages}:`, {
        isFirstStage,
        previousImageUrl: previousImageUrl || '(none)',
        preparedStageRefs: preparedStageRefs.length ? `${preparedStageRefs.length} ref(s)` : '(none)',
        inputImages: inputImages?.length ? `${inputImages.length} image(s)` : '(none)',
        prompt: stagePrompt.slice(0, 50) + '...'
      })

      // Build request
      const modelSettings: ImageModelSettings = {
        aspectRatio: isLastStage ? aspectRatio : '1:1', // Final stage uses target aspect, intermediates use 1:1
        outputFormat: 'png',
      }

      const request: ImageGenerationRequest = {
        model,
        prompt: stagePrompt,
        referenceImages: inputImages,
        modelSettings,
        recipeId: recipe.id,
        recipeName: recipe.name,
      }

      // Generate image
      const response = await imageGenerationService.generateImage(request)

      if (!response.galleryId) {
        throw new Error(`Stage ${i + 1} failed: No gallery ID returned`)
      }

      onProgress?.(i, totalStages, `Waiting for stage ${i + 1} to complete...`)

      // Wait for completion (get permanent Supabase URL)
      try {
        const imageUrl = await waitForImageCompletion(supabase, response.galleryId)
        imageUrls.push(imageUrl)
        previousImageUrl = imageUrl
        console.log(`[Recipe Execution] Stage ${i + 1} completed:`, imageUrl)
      } catch (waitError) {
        const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error'
        throw new Error(`Stage ${i + 1} failed: ${errorMsg}`)
      }
    }

    onProgress?.(totalStages, totalStages, 'Recipe completed!')

    return {
      success: true,
      imageUrls,
      finalImageUrl: imageUrls[imageUrls.length - 1],
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Recipe execution failed'
    console.error('[Recipe Execution] Error:', errorMessage)
    return {
      success: false,
      imageUrls: [],
      error: errorMessage,
    }
  }
}

/**
 * Find a system recipe by name
 * Useful for internal features like Storybook that need specific recipes
 */
export function findSystemRecipeByName(
  recipes: Recipe[],
  name: string
): Recipe | undefined {
  return recipes.find(r => r.name === name && r.isSystemOnly)
}

/**
 * Get a recipe by ID from the store
 */
export function getRecipeById(
  recipes: Recipe[],
  id: string
): Recipe | undefined {
  return recipes.find(r => r.id === id)
}
