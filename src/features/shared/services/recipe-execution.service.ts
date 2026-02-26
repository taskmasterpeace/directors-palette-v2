/**
 * Recipe Execution Service
 *
 * Shared service for executing multi-stage recipes with pipe chaining.
 * Used by both shot-creator and storybook features.
 */

import { getClient, TypedSupabaseClient } from '@/lib/db/client'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  Recipe,
  RecipeFieldValues,
  RecipeStage,
  RECIPE_TOOLS,
  RECIPE_ANALYSIS,
  buildRecipePrompts,
} from '@/features/shot-creator/types/recipe.types'
import { imageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { uploadImageToStorage } from '@/features/shot-creator/helpers/image-resize.helper'
import type { ImageModel, ImageModelSettings, ImageGenerationRequest } from '@/features/shot-creator/types/image-generation.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('Shared')
export interface RecipeExecutionOptions {
  recipe: Recipe
  fieldValues: RecipeFieldValues
  stageReferenceImages: string[][]  // Per-stage reference images [[stage0_refs], [stage1_refs], ...]
  model?: ImageModel
  aspectRatio?: string
  onProgress?: (stage: number, totalStages: number, status: string) => void
  // Gallery organization (for storybook projects)
  folderId?: string
  extraMetadata?: Record<string, unknown>
}

export interface RecipeExecutionResult {
  success: boolean
  imageUrls: string[]      // URL for each stage (flattened)
  finalImageUrl?: string   // Last stage output (first image if multi-output)
  finalImageUrls?: string[] // Last stage outputs (for multi-output stages like grid-split)
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
            log.warn('Network error in polling (will retry)', { message: error.message })
            return
          }

          log.error('Error checking gallery status', { error: error })
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
            log.info('[Recipe Execution] Found temporary Replicate URL, waiting for Supabase upload...')
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
        log.error('Error in polling', { error: err instanceof Error ? err.message : String(err) })
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
 * Handles data URLs, blob URLs, local paths, and already-uploaded URLs
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

    // Handle local paths (e.g., /storybook/styles/watercolor-preset.webp)
    // These need to be fetched and uploaded to Supabase since external APIs can't access localhost
    if (imageUrl.startsWith('/')) {
      try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
        const fullUrl = `${baseUrl}${imageUrl}`
        log.info('Fetching local asset', { url: fullUrl })

        // Fetch the local asset
        const response = await fetch(fullUrl)
        if (!response.ok) {
          log.error('Failed to fetch local asset', { url: fullUrl })
          continue
        }

        const blob = await response.blob()
        const filename = imageUrl.split('/').pop() || 'local-asset.png'
        const file = new File([blob], filename, { type: blob.type || 'image/png' })

        // Upload to Supabase for permanent storage (via /api/upload-file)
        const httpsUrl = await uploadImageToStorage(file)
        uploadedUrls.push(httpsUrl)
        log.info('Uploaded local asset to Supabase', { from: imageUrl, to: httpsUrl })
      } catch (error) {
        log.error('[Recipe Execution] Failed to upload local asset: [imageUrl]', { imageUrl, error: error instanceof Error ? error.message : String(error) })
      }
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

        // Upload to Supabase storage
        const httpsUrl = await uploadImageToStorage(file)
        uploadedUrls.push(httpsUrl)
      } catch (error) {
        log.error('Failed to upload reference image', { error: error instanceof Error ? error.message : String(error) })
        // Skip failed uploads rather than failing the entire operation
      }
    }
  }

  return uploadedUrls
}

/**
 * Execute a tool stage (like remove-background, grid-split)
 * Returns the URL(s) of the processed image(s)
 * Multi-output tools (like grid-split) return an array of URLs
 */
async function executeToolStage(
  stage: RecipeStage,
  inputImageUrl: string,
  onProgress?: (message: string) => void
): Promise<string | string[]> {
  if (!stage.toolId) {
    throw new Error('Tool stage missing toolId')
  }

  const tool = RECIPE_TOOLS[stage.toolId]
  if (!tool) {
    throw new Error(`Unknown tool: ${stage.toolId}`)
  }

  onProgress?.(`Running ${tool.name}...`)
  log.info('Executing tool', { tool: tool.name, inputImageUrl })

  // Call the tool API
  const response = await fetch(tool.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: inputImageUrl }),
  })

  if (!response.ok) {
    const errorData = await safeJsonParse<{ error?: string }>(response).catch(() => ({} as { error?: string }))
    throw new Error(`Tool ${tool.name} failed: ${errorData.error || response.statusText}`)
  }

  const data = await safeJsonParse(response)

  // Handle multi-output tools (like grid-split that returns imageUrls array)
  if (data.imageUrls && Array.isArray(data.imageUrls)) {
    log.info('Tool completed with multiple outputs', { outputCount: data.imageUrls.length })
    return data.imageUrls
  }

  // Tool returns either direct URL or prediction ID to poll
  if (data.imageUrl) {
    log.info('[Recipe Execution] Tool completed immediately', { imageUrl: data.imageUrl })
    return data.imageUrl
  }

  if (data.predictionId) {
    // Need to poll for completion
    log.info('[Recipe Execution] Tool started, polling for completion...')
    const resultUrl = await pollToolCompletion(data.predictionId)
    log.info('[Recipe Execution] Tool completed', { resultUrl })
    return resultUrl
  }

  throw new Error(`Tool ${tool.name} returned unexpected response`)
}

/**
 * Poll for tool completion (remove-background uses Replicate which needs polling)
 */
async function pollToolCompletion(predictionId: string, maxWaitTime: number = 60000): Promise<string> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(`/api/tools/status/${predictionId}`)

    if (!response.ok) {
      // If status endpoint doesn't exist, try direct Replicate API
      const replicateResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
      })

      if (replicateResponse.ok) {
        const data = await replicateResponse.json()
        if (data.status === 'succeeded' && data.output) {
          return typeof data.output === 'string' ? data.output : data.output[0]
        }
        if (data.status === 'failed') {
          throw new Error(`Tool failed: ${data.error || 'Unknown error'}`)
        }
      }
    } else {
      const data = await response.json()
      if (data.status === 'succeeded' && data.output) {
        return data.output
      }
      if (data.status === 'failed') {
        throw new Error(`Tool failed: ${data.error || 'Unknown error'}`)
      }
    }

    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  throw new Error('Tool timed out')
}

/**
 * Analysis results storage - maps variable names to their values
 */
export interface AnalysisVariables {
  [variableName: string]: string
}

/**
 * Execute an analysis stage - calls vision AI to analyze image(s)
 * Returns variables that can be used in subsequent stage templates
 */
async function executeAnalysisStage(
  stage: RecipeStage,
  inputImageUrls: string[],
  onProgress?: (message: string) => void
): Promise<AnalysisVariables> {
  if (!stage.analysisId) {
    throw new Error('Analysis stage missing analysisId')
  }

  const analysis = RECIPE_ANALYSIS[stage.analysisId]
  if (!analysis) {
    throw new Error(`Unknown analysis: ${stage.analysisId}`)
  }

  onProgress?.(`Analyzing image(s) with ${analysis.name}...`)
  log.info('Executing analysis', { analysis: analysis.name, imageCount: inputImageUrls.length })

  // For style analysis, we need to convert URLs to base64 or use the API properly
  // The /api/styles/analyze endpoint expects a base64 data URL
  // For now, we'll fetch the image and convert it
  const imageUrl = inputImageUrls[0] // Use first image for analysis

  let imageData: string

  // Check if it's already a data URL
  if (imageUrl.startsWith('data:image/')) {
    imageData = imageUrl
  } else {
    // Fetch and convert to base64
    try {
      const imageResponse = await fetch(imageUrl)
      const blob = await imageResponse.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const mimeType = blob.type || 'image/jpeg'
      imageData = `data:${mimeType};base64,${base64}`
    } catch (fetchError) {
      log.error('[Recipe Execution] Failed to fetch image for analysis', { fetchError: fetchError })
      throw new Error(`Failed to fetch image for analysis: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
    }
  }

  // Call the analysis API
  const response = await fetch(analysis.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageData }),
  })

  if (!response.ok) {
    const errorData = await safeJsonParse<{ error?: string }>(response).catch(() => ({} as { error?: string }))
    throw new Error(`Analysis ${analysis.name} failed: ${errorData.error || response.statusText}`)
  }

  const data = await safeJsonParse<Record<string, string>>(response)
  log.info('[Recipe Execution] Analysis completed', { data })

  // Map response to output variables based on analysis type
  const variables: AnalysisVariables = {}

  if (stage.analysisId === 'style') {
    variables['ANALYZED_STYLE_NAME'] = data.name || ''
    variables['ANALYZED_STYLE_DESCRIPTION'] = data.description || ''
    variables['ANALYZED_STYLE_PROMPT'] = data.stylePrompt || ''
  } else if (stage.analysisId === 'character') {
    variables['ANALYZED_CHARACTER_DESCRIPTION'] = data.description || ''
  } else if (stage.analysisId === 'scene') {
    variables['ANALYZED_SCENE_ELEMENTS'] = data.elements || ''
  }

  onProgress?.(`Analysis complete: ${Object.keys(variables).length} variables extracted`)
  return variables
}

/**
 * Substitute analysis variables in a template string
 * Replaces <<VARIABLE_NAME>> with actual values
 */
function substituteAnalysisVariables(template: string, variables: AnalysisVariables): string {
  let result = template
  for (const [varName, value] of Object.entries(variables)) {
    // Replace both <<VAR_NAME>> and <<VAR_NAME:type>> patterns
    const regex = new RegExp(`<<${varName}(?::[^>]+)?>>`, 'g')
    result = result.replace(regex, value)
  }
  return result
}

/**
 * Execute a multi-stage recipe with pipe chaining
 *
 * Each stage's output becomes the input for the next stage.
 * Stage reference images are combined with the previous output.
 * Supports generation, tool, and analysis stages.
 */
export async function executeRecipe(options: RecipeExecutionOptions): Promise<RecipeExecutionResult> {
  const {
    recipe,
    fieldValues,
    stageReferenceImages,
    model = 'nano-banana-2' as ImageModel,
    aspectRatio = '21:9',
    onProgress,
    folderId,
    extraMetadata,
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

    log.info('Starting recipe execution', { totalStages, recipeName: recipe.name })
    log.info('[Recipe Execution] Stages', { detail: recipe.stages.map(s => ({ id: s.id, type: s.type, toolId: s.toolId, analysisId: s.analysisId, order: s.order })) })

    const imageUrls: string[] = []
    let previousImageUrl: string | undefined = undefined
    let previousImageUrls: string[] | undefined = undefined // For multi-output stages
    let analysisVariables: AnalysisVariables = {} // Variables from analysis stages

    // Execute each stage sequentially (pipe chaining)
    for (let i = 0; i < totalStages; i++) {
      const stage = recipe.stages[i]
      let stagePrompt = prompts[i]
      const isFirstStage = i === 0
      const isLastStage = i === totalStages - 1
      const isToolStage = stage.type === 'tool'
      const isAnalysisStage = stage.type === 'analysis'

      // Substitute analysis variables in the prompt
      if (Object.keys(analysisVariables).length > 0 && stagePrompt) {
        stagePrompt = substituteAnalysisVariables(stagePrompt, analysisVariables)
        log.info('[Recipe Execution] Substituted analysis variables in prompt')
      }

      onProgress?.(i, totalStages, `Processing stage ${i + 1}...`)

      // Get stage-specific reference images
      const rawStageRefs = stageReferenceImages[i] || []

      // Prepare references (upload data URLs to HTTPS)
      let preparedStageRefs: string[] = []
      if (rawStageRefs.length > 0) {
        try {
          preparedStageRefs = await prepareReferenceImagesForAPI(rawStageRefs)
          log.info('Stage refs prepared', { stage: i, imageCount: preparedStageRefs.length })
        } catch (uploadError) {
          log.error('[Recipe Execution] Failed to prepare stage [i] refs', { i, uploadError })
        }
      }

      // Determine input images for this stage
      let inputImages: string[] | undefined
      if (isFirstStage) {
        // First stage: use stage 0's refs
        inputImages = preparedStageRefs.length > 0 ? preparedStageRefs : undefined
      } else {
        // Subsequent stages: combine previous output(s) + this stage's refs
        const refs: string[] = []
        // Handle multi-output from previous stage (e.g., grid-split produced 9 images)
        if (previousImageUrls && previousImageUrls.length > 0) {
          refs.push(...previousImageUrls)
        } else if (previousImageUrl) {
          refs.push(previousImageUrl)
        }
        refs.push(...preparedStageRefs)
        inputImages = refs.length > 0 ? refs : undefined
      }

      log.info("Executing recipe stage", { stage: i + 1, totalStages, type: isAnalysisStage ? "analysis" : isToolStage ? "tool" : "generation", toolId: stage.toolId || "(none)", analysisId: stage.analysisId || "(none)", isFirstStage, refCount: preparedStageRefs.length, inputCount: inputImages?.length || 0 })

      // Handle analysis stages - extract info from images for use in later stages
      if (isAnalysisStage) {
        const analysisInputImages = inputImages || preparedStageRefs
        if (!analysisInputImages || analysisInputImages.length === 0) {
          throw new Error(`Stage ${i + 1} (analysis): No input images provided`)
        }

        try {
          const newVariables = await executeAnalysisStage(
            stage,
            analysisInputImages,
            (msg) => onProgress?.(i, totalStages, msg)
          )

          // Merge new variables with existing ones
          analysisVariables = { ...analysisVariables, ...newVariables }
          log.info('Analysis stage completed', { stage: i + 1, variables: Object.keys(analysisVariables) })

          // Analysis stages don't produce images, so continue to next stage
          continue
        } catch (analysisError) {
          const errorMsg = analysisError instanceof Error ? analysisError.message : 'Unknown error'
          throw new Error(`Stage ${i + 1} (analysis) failed: ${errorMsg}`)
        }
      }

      // Handle tool stages differently from generation stages
      if (isToolStage) {
        // Tool stage: call tool API with input image
        const inputImageUrl = inputImages?.[0]
        if (!inputImageUrl) {
          throw new Error(`Stage ${i + 1} (tool): No input image provided`)
        }

        try {
          const toolOutput = await executeToolStage(
            stage,
            inputImageUrl,
            (msg) => onProgress?.(i, totalStages, msg)
          )

          // Handle multi-output tools (like grid-split)
          if (Array.isArray(toolOutput)) {
            imageUrls.push(...toolOutput)
            previousImageUrl = undefined // Reset single output
            previousImageUrls = toolOutput // Track multi-output for next stage
            log.info('Tool stage completed with multiple outputs', { stage: i + 1, outputCount: toolOutput.length })
          } else {
            imageUrls.push(toolOutput)
            previousImageUrl = toolOutput
            previousImageUrls = undefined // Reset multi-output
            log.info('[Recipe Execution] Stage [detail] (tool) completed', { detail: i + 1, toolOutput })
          }
        } catch (toolError) {
          const errorMsg = toolError instanceof Error ? toolError.message : 'Unknown error'
          throw new Error(`Stage ${i + 1} (tool) failed: ${errorMsg}`)
        }
      } else {
        // Generation stage: use image generation service
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
          // Gallery organization (for storybook projects)
          folderId,
          extraMetadata,
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
          previousImageUrls = undefined // Reset multi-output (generation stages produce single output)
          log.info('[Recipe Execution] Stage [detail] completed', { detail: i + 1, imageUrl })
        } catch (waitError) {
          const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error'
          throw new Error(`Stage ${i + 1} failed: ${errorMsg}`)
        }
      }
    }

    onProgress?.(totalStages, totalStages, 'Recipe completed!')

    // Determine final output(s)
    // If last stage was multi-output, include finalImageUrls
    const finalImageUrl = previousImageUrls ? previousImageUrls[0] : previousImageUrl
    const finalImageUrls = previousImageUrls

    return {
      success: true,
      imageUrls,
      finalImageUrl,
      finalImageUrls,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Recipe execution failed'
    log.error('[Recipe Execution] Error', { errorMessage: errorMessage })
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
