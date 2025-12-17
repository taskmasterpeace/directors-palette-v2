/**
 * External API: Image Generation
 * POST /api/v1/images/generate
 *
 * Authentication: Bearer token (API key)
 * Authorization: Bearer dp_xxxxxxxxxxxxxxxxx
 */

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { creditsService } from '@/features/credits'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { getModelConfig } from '@/config'
import { GenerateImageRequest, GenerateImageResponse } from '@/features/api-keys/types/api-key.types'
import type { ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

/**
 * Check if a URL is accessible by Replicate
 */
function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('replicate.')) return true
    if (parsed.hostname.includes('supabase.')) return true
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return false
    return true
  } catch {
    return false
  }
}

/**
 * Process reference images - upload inaccessible URLs to Replicate
 */
async function processReferenceImages(
  referenceImages: string[],
  replicateClient: Replicate
): Promise<string[]> {
  const processed: string[] = []

  for (const url of referenceImages) {
    if (isPublicUrl(url)) {
      processed.push(url)
      continue
    }

    try {
      // Fetch and upload to Replicate
      const response = await fetch(url)
      if (!response.ok) continue

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = url.split('.').pop()?.toLowerCase() || 'png'
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'

      const uint8Array = new Uint8Array(buffer)
      const file = new File([uint8Array], `reference.${ext}`, { type: mimeType })
      const uploadedFile = await replicateClient.files.create(file)
      processed.push(uploadedFile.urls.get)
    } catch (error) {
      console.error('[API v1] Failed to process reference image:', error)
    }
  }

  return processed
}

export async function POST(request: NextRequest): Promise<NextResponse<GenerateImageResponse>> {
  const startTime = Date.now()
  let validatedKey: Awaited<ReturnType<typeof apiKeyService.validateApiKey>> = null

  try {
    // Extract and validate API key
    const authHeader = request.headers.get('authorization')
    const rawKey = apiKeyService.extractKeyFromHeader(authHeader)

    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: 'Missing API key. Use Authorization: Bearer dp_xxx' },
        { status: 401 }
      )
    }

    validatedKey = await apiKeyService.validateApiKey(rawKey)

    if (!validatedKey) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired API key' },
        { status: 401 }
      )
    }

    // Check scope
    if (!validatedKey.scopes.includes('images:generate')) {
      return NextResponse.json(
        { success: false, error: 'API key does not have images:generate scope' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: GenerateImageRequest = await request.json()
    const {
      prompt,
      model = 'nano-banana',
      aspectRatio = '1:1',
      outputFormat = 'webp',
      referenceImages = [],
      seed,
      resolution,
      safetyFilterLevel,
      numInferenceSteps,
      guidanceScale,
    } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid prompt' },
        { status: 400 }
      )
    }

    // Get model config
    const modelConfig = getModelConfig(model as ImageModel)
    if (!modelConfig) {
      return NextResponse.json(
        { success: false, error: `Invalid model: ${model}. Use: nano-banana, nano-banana-pro, or z-image-turbo` },
        { status: 400 }
      )
    }

    // Check credits - costPerImage is in "credits" (dollars), but balance is in cents
    const costInCents = Math.round(modelConfig.costPerImage * 100)
    const balance = await creditsService.getBalance(validatedKey.userId)

    if (!balance || balance.balance < costInCents) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          remainingCredits: balance?.balance || 0,
        },
        { status: 402 }
      )
    }

    // Process reference images
    let processedRefs: string[] = []
    if (referenceImages.length > 0) {
      const maxRefs = modelConfig.maxReferenceImages || 0
      if (referenceImages.length > maxRefs) {
        return NextResponse.json(
          { success: false, error: `Model ${model} supports max ${maxRefs} reference images` },
          { status: 400 }
        )
      }
      processedRefs = await processReferenceImages(referenceImages, replicate)
    }

    // Build model settings - ensure outputFormat is valid
    const validOutputFormat = outputFormat === 'webp' ? 'jpg' : outputFormat
    const modelSettings: ImageModelSettings = {
      aspectRatio,
      outputFormat: validOutputFormat as 'jpg' | 'png',
    }

    if (model === 'nano-banana-pro') {
      if (resolution) (modelSettings as Record<string, unknown>).resolution = resolution
      if (safetyFilterLevel) (modelSettings as Record<string, unknown>).safetyFilterLevel = safetyFilterLevel
    } else if (model === 'z-image-turbo') {
      if (numInferenceSteps) (modelSettings as Record<string, unknown>).numInferenceSteps = numInferenceSteps
      if (guidanceScale) (modelSettings as Record<string, unknown>).guidanceScale = guidanceScale
    }

    // Add seed to model settings if provided
    if (seed !== undefined) {
      (modelSettings as Record<string, unknown>).seed = seed
    }

    // Build Replicate input
    const replicateInput = ImageGenerationService.buildReplicateInput({
      prompt,
      model: model as ImageModel,
      modelSettings,
      referenceImages: processedRefs,
      userId: validatedKey.userId,
    })

    // Run the model
    const output = await replicate.run(modelConfig.endpoint as `${string}/${string}`, {
      input: replicateInput,
    })

    // Get the image URL from output
    let imageUrl: string | null = null
    if (Array.isArray(output) && output.length > 0) {
      imageUrl = output[0]
    } else if (typeof output === 'string') {
      imageUrl = output
    } else if (output && typeof output === 'object' && 'url' in output) {
      imageUrl = (output as { url: string }).url
    }

    if (!imageUrl) {
      throw new Error('No image URL in model output')
    }

    // Download from Replicate and upload to Supabase Storage
    const { buffer } = await StorageService.downloadAsset(imageUrl)
    const { ext, mimeType } = StorageService.getMimeType(imageUrl, validOutputFormat)
    const predictionId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const { publicUrl } = await StorageService.uploadToStorage(
      buffer,
      validatedKey.userId,
      predictionId,
      ext,
      mimeType
    )

    // Deduct credits using the model ID
    const deductResult = await creditsService.deductCredits(validatedKey.userId, model, {
      description: `API image generation (${model})`,
    })

    if (!deductResult.success) {
      // Image was generated but credit deduction failed - log but continue
      console.error('[API v1] Credit deduction failed:', deductResult.error)
    }

    // Get remaining balance
    const newBalance = await creditsService.getBalance(validatedKey.userId)

    // Log usage
    await apiKeyService.logUsage({
      apiKeyId: validatedKey.apiKey.id,
      userId: validatedKey.userId,
      endpoint: '/api/v1/images/generate',
      method: 'POST',
      statusCode: 200,
      creditsUsed: modelConfig.costPerImage,
      requestMetadata: {
        model,
        promptLength: prompt.length,
        referenceImagesCount: referenceImages.length,
      },
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      creditsUsed: modelConfig.costPerImage,
      remainingCredits: newBalance?.balance || 0,
      requestId: predictionId,
    })
  } catch (error) {
    console.error('[API v1] Image generation error:', error)

    // Log failed request
    if (validatedKey) {
      await apiKeyService.logUsage({
        apiKeyId: validatedKey.apiKey.id,
        userId: validatedKey.userId,
        endpoint: '/api/v1/images/generate',
        method: 'POST',
        statusCode: 500,
        responseTimeMs: Date.now() - startTime,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/images/generate
 * Returns API documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/v1/images/generate',
    method: 'POST',
    authentication: 'Bearer token (API key)',
    description: 'Generate images from text prompts',
    requestBody: {
      prompt: { type: 'string', required: true, description: 'Text prompt for image generation' },
      model: {
        type: 'string',
        required: false,
        default: 'nano-banana',
        options: ['nano-banana', 'nano-banana-pro', 'z-image-turbo', 'qwen-image-fast'],
        description: 'Model to use for generation',
      },
      aspectRatio: {
        type: 'string',
        required: false,
        default: '1:1',
        options: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3'],
      },
      outputFormat: {
        type: 'string',
        required: false,
        default: 'jpg',
        options: ['jpg', 'png'],
      },
      referenceImages: {
        type: 'string[]',
        required: false,
        description: 'Array of image URLs for style reference',
      },
      seed: { type: 'number', required: false, description: 'Seed for reproducibility' },
    },
    modelCosts: {
      'nano-banana': '8 points/image ($0.08)',
      'nano-banana-pro': '20 points/image ($0.20)',
      'z-image-turbo': '5 points/image ($0.05)',
      'qwen-image-fast': '2 points/image ($0.02)',
    },
    modelCapabilities: {
      'nano-banana': {
        speed: 'Fast',
        quality: 'Good',
        referenceImages: 'Up to 10',
        bestFor: 'Quick iterations, style matching with reference images',
      },
      'nano-banana-pro': {
        speed: 'Medium',
        quality: 'Excellent (SOTA)',
        referenceImages: 'Up to 14',
        resolution: 'Up to 4K',
        bestFor: 'High-quality production images, accurate text rendering',
      },
      'z-image-turbo': {
        speed: 'Very Fast',
        quality: 'Good',
        referenceImages: 'Up to 1',
        bestFor: 'Rapid visualization, quick prototyping',
      },
      'qwen-image-fast': {
        speed: 'Almost Instant (~1 sec)',
        quality: 'Good',
        referenceImages: 'None (text-to-image only)',
        bestFor: 'Ultra-fast generation, real-time previews, budget-conscious workflows',
      },
    },
    example: {
      curl: `curl -X POST https://directorspalette.app/api/v1/images/generate \\
  -H "Authorization: Bearer dp_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "A serene mountain landscape at sunset", "model": "nano-banana", "aspectRatio": "16:9"}'`,
    },
  })
}
