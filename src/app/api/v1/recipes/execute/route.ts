/**
 * External API: Recipe Execution
 * POST /api/v1/recipes/execute
 *
 * Authentication: Bearer token (API key)
 * Execute a recipe template with variable substitution
 */

import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { creditsService } from '@/features/credits'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { StorageService } from '@/features/generation/services/storage.service'
import { getModelConfig } from '@/config'
import type { ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'
import { lognog } from '@/lib/lognog'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface RecipeExecuteRequest {
  template: string  // Recipe template with <<FIELD:type>> placeholders
  variables: Record<string, string>  // Values for placeholders
  model?: 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-fast'
  aspectRatio?: string
  outputFormat?: 'webp' | 'jpg' | 'png'
  referenceImages?: string[]  // URLs (not supported by qwen-image-fast)
  seed?: number
}

interface RecipeExecuteResponse {
  success: boolean
  images?: { url: string; prompt: string; stage: number }[]
  totalCreditsUsed?: number
  remainingCredits?: number
  error?: string
  requestId?: string
}

/**
 * Parse a recipe template and extract field definitions
 */
function parseFields(template: string): { name: string; type: string; required: boolean }[] {
  const fieldRegex = /<<([A-Z_0-9]+):([^>]+)>>/g
  const fields: { name: string; type: string; required: boolean }[] = []
  let match

  while ((match = fieldRegex.exec(template)) !== null) {
    const [, name, typeSpec] = match
    const required = typeSpec.endsWith('!')
    const type = required ? typeSpec.slice(0, -1) : typeSpec

    fields.push({ name, type, required })
  }

  return fields
}

/**
 * Build prompt from template and variables
 */
function buildPrompt(template: string, variables: Record<string, string>): string {
  let result = template

  // Replace each placeholder
  const fieldRegex = /<<([A-Z_0-9]+):([^>]+)>>/g
  result = result.replace(fieldRegex, (_match, name) => {
    return variables[name] || variables[name.toLowerCase()] || ''
  })

  // Clean up orphaned punctuation and extra spaces
  result = result.replace(/,\s*,/g, ',')
  result = result.replace(/[,\s]+\./g, '.')
  result = result.replace(/\.\s*,/g, '.')
  result = result.replace(/,\s*$/g, '')
  result = result.replace(/^\s*,\s*/g, '')
  result = result.replace(/\s+/g, ' ')
  result = result.replace(/\s+,/g, ',')
  result = result.replace(/\s+\./g, '.')

  return result.trim()
}

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
 * Process reference images
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

export async function POST(request: NextRequest): Promise<NextResponse<RecipeExecuteResponse>> {
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
    if (!validatedKey.scopes.includes('recipes:execute')) {
      return NextResponse.json(
        { success: false, error: 'API key does not have recipes:execute scope' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: RecipeExecuteRequest = await request.json()
    const {
      template,
      variables = {},
      model = 'nano-banana',
      aspectRatio = '1:1',
      outputFormat = 'webp',
      referenceImages = [],
      seed,
    } = body

    if (!template || typeof template !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid template' },
        { status: 400 }
      )
    }

    // Parse fields and validate required ones
    const fields = parseFields(template)
    const missingRequired = fields
      .filter(f => f.required && !variables[f.name] && !variables[f.name.toLowerCase()])
      .map(f => f.name)

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required variables: ${missingRequired.join(', ')}` },
        { status: 400 }
      )
    }

    // Get model config
    const modelConfig = getModelConfig(model as ImageModel)
    if (!modelConfig) {
      return NextResponse.json(
        { success: false, error: `Invalid model: ${model}` },
        { status: 400 }
      )
    }

    // Split by pipes for multi-stage recipes
    const stages = template.split('|').map(s => s.trim())
    const costInCents = Math.round(modelConfig.costPerImage * 100)
    const totalCostInCents = costInCents * stages.length

    // Check credits
    const balance = await creditsService.getBalance(validatedKey.userId)
    if (!balance || balance.balance < totalCostInCents) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient credits. Need ${totalCostInCents} cents, have ${balance?.balance || 0}`,
          remainingCredits: balance?.balance || 0,
        },
        { status: 402 }
      )
    }

    // Process reference images
    let processedRefs = await processReferenceImages(referenceImages, replicate)
    const results: { url: string; prompt: string; stage: number }[] = []

    // Build model settings - ensure outputFormat is valid
    const validOutputFormat = outputFormat === 'webp' ? 'jpg' : outputFormat
    const modelSettings: ImageModelSettings = {
      aspectRatio,
      outputFormat: validOutputFormat as 'jpg' | 'png',
    }

    // Add seed to model settings if provided
    if (seed !== undefined) {
      (modelSettings as Record<string, unknown>).seed = seed
    }

    // Execute each stage
    for (let i = 0; i < stages.length; i++) {
      const stageTemplate = stages[i]
      const prompt = buildPrompt(stageTemplate, variables)

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
        throw new Error(`No image URL in model output for stage ${i + 1}`)
      }

      // Download and store image
      const { buffer } = await StorageService.downloadAsset(imageUrl)
      const { ext, mimeType } = StorageService.getMimeType(imageUrl, validOutputFormat)
      const predictionId = `api_recipe_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`
      const { publicUrl } = await StorageService.uploadToStorage(
        buffer,
        validatedKey.userId,
        predictionId,
        ext,
        mimeType
      )

      results.push({
        url: publicUrl,
        prompt,
        stage: i + 1,
      })

      // Use this image as reference for next stage (pipe chaining)
      processedRefs = [imageUrl]

      // Deduct credits for this stage
      await creditsService.deductCredits(validatedKey.userId, model, {
        description: `API recipe stage ${i + 1}/${stages.length}`,
      })
    }

    // Get remaining balance
    const newBalance = await creditsService.getBalance(validatedKey.userId)
    const totalCostCredits = modelConfig.costPerImage * stages.length

    // Log usage
    await apiKeyService.logUsage({
      apiKeyId: validatedKey.apiKey.id,
      userId: validatedKey.userId,
      endpoint: '/api/v1/recipes/execute',
      method: 'POST',
      statusCode: 200,
      creditsUsed: totalCostCredits,
      requestMetadata: {
        model,
        stageCount: stages.length,
        referenceImagesCount: referenceImages.length,
      },
      responseTimeMs: Date.now() - startTime,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    // Log recipe execution to LogNog
    lognog.info('recipe_executed', {
      type: 'business',
      event: 'recipe_executed',
      user_id: validatedKey.userId,
      stage_count: stages.length,
      prompt_preview: results[0]?.prompt.slice(0, 100),
      prompt_length: results[0]?.prompt.length,
      model,
    })

    // Log API success
    lognog.info(`POST /api/v1/recipes/execute 200 (${Date.now() - startTime}ms)`, {
      type: 'api',
      route: '/api/v1/recipes/execute',
      method: 'POST',
      status_code: 200,
      duration_ms: Date.now() - startTime,
      user_id: validatedKey.userId,
      model,
    })

    return NextResponse.json({
      success: true,
      images: results,
      totalCreditsUsed: totalCostCredits,
      remainingCredits: newBalance?.balance || 0,
      requestId: `recipe_${Date.now()}`,
    })
  } catch (error) {
    console.error('[API v1] Recipe execution error:', error)

    // Log failed request
    if (validatedKey) {
      await apiKeyService.logUsage({
        apiKeyId: validatedKey.apiKey.id,
        userId: validatedKey.userId,
        endpoint: '/api/v1/recipes/execute',
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
 * GET /api/v1/recipes/execute
 * Returns API documentation
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: '/api/v1/recipes/execute',
    method: 'POST',
    authentication: 'Bearer token (API key)',
    description: 'Execute a recipe template with variable substitution',
    requestBody: {
      template: {
        type: 'string',
        required: true,
        description: 'Recipe template with <<FIELD:type>> placeholders. Use | to separate stages.',
        example: 'A <<SHOT_TYPE:select(CU,MS,WS)!>> shot of <<CHARACTER:name!>> in a <<LOCATION:text>> setting',
      },
      variables: {
        type: 'object',
        required: true,
        description: 'Key-value pairs for template placeholders',
        example: { SHOT_TYPE: 'CU', CHARACTER: 'John', LOCATION: 'forest' },
      },
      model: {
        type: 'string',
        required: false,
        default: 'nano-banana',
        options: ['nano-banana', 'nano-banana-pro', 'z-image-turbo', 'qwen-image-fast'],
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
    templateSyntax: {
      'name field': '<<FIELD_NAME:name!>> - Small text input (! = required)',
      'text field': '<<FIELD_NAME:text>> - Larger text input',
      'select field': '<<FIELD_NAME:select(opt1,opt2,opt3)!>> - Dropdown selection',
      'pipe stages': 'Use | to separate stages. Each stage generates an image.',
    },
    example: {
      curl: `curl -X POST https://directorspalette.app/api/v1/recipes/execute \\
  -H "Authorization: Bearer dp_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template": "A <<SHOT_TYPE:select(CU,MS,WS)!>> of <<CHARACTER:name!>>",
    "variables": {"SHOT_TYPE": "CU", "CHARACTER": "Maya"},
    "model": "nano-banana",
    "aspectRatio": "16:9"
  }'`,
    },
  })
}
