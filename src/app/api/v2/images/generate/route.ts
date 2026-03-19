import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import type { ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'
import { MODEL_CONFIGS, ASPECT_RATIO_SIZES, getModelCost, type ModelId } from '@/config'
import { creditsService } from '@/features/credits'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob, formatJobResponse } from '../../_lib/job-manager'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

export async function POST(request: NextRequest) {
  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const {
      model,
      prompt,
      aspect_ratio = '16:9',
      loras,
      reference_image,
      reference_strength,
      num_images = 1,
      seed,
      webhook_url,
    } = body

    // Validate required fields
    if (!model) return errors.validation('model is required')
    if (!prompt) return errors.validation('prompt is required')
    if (!(model in MODEL_CONFIGS)) return errors.validation(`Unknown model: ${model}`)
    if (num_images < 1 || num_images > 5) return errors.validation('num_images must be 1-5')

    const modelConfig = MODEL_CONFIGS[model as ModelId]

    // Editing models require a reference image
    if (modelConfig.requiresInputImage && !reference_image) {
      return errors.validation(`${model} requires a reference_image`)
    }

    // LoRAs only for flux-2-klein-9b
    if (loras && model !== 'flux-2-klein-9b') {
      return errors.validation('loras only supported for flux-2-klein-9b')
    }

    // Cost calculation
    const costPerImage = Math.round(getModelCost(model as ModelId) * 100)
    const totalCost = costPerImage * num_images

    // Balance check (admin bypass)
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      if (!balance || balance.balance < totalCost) {
        return errors.insufficientPts(totalCost, balance?.balance ?? 0)
      }
    }

    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const loraActive = !!(loras && loras.length > 0)
    const hasRef = !!reference_image
    const jobs = []

    for (let i = 0; i < num_images; i++) {
      // Deduct credits
      await creditsService.deductCredits(auth.userId, model, {
        generationType: 'image',
        useServiceRole: true,
        user_email: auth.email,
      })

      // Build model settings
      const modelSettings: ImageModelSettings = {
        aspectRatio: aspect_ratio,
        width: ASPECT_RATIO_SIZES[aspect_ratio]?.width,
        height: ASPECT_RATIO_SIZES[aspect_ratio]?.height,
        outputFormat: 'png',
        maxImages: 1,
        seed,
      } as ImageModelSettings

      // Build Replicate input
      const replicateInput = ImageGenerationService.buildReplicateInput({
        model: model as ImageModel,
        prompt,
        modelSettings,
        referenceImages: reference_image ? [reference_image] : [],
        userId: auth.userId,
      })

      // If reference_strength provided, override
      if (reference_strength !== undefined && replicateInput.strength !== undefined) {
        replicateInput.strength = reference_strength
      }

      // Get model ID and version
      const replicateModelId = ImageGenerationService.getReplicateModelId(model as ImageModel, loraActive, hasRef)
      const versionHash = ImageGenerationService.getVersionForModel(model as ImageModel, loraActive, hasRef)

      // Build prediction options
      const predictionOptions: Record<string, unknown> = versionHash
        ? { version: versionHash, input: replicateInput }
        : { model: replicateModelId, input: replicateInput }

      if (webhookUrl) {
        predictionOptions.webhook = webhookUrl
        predictionOptions.webhook_events_filter = ['start', 'completed']
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prediction = await replicate.predictions.create(predictionOptions as any)

      // Create gallery entry
      const metadata = {
        ...ImageGenerationService.buildMetadata({
          model: model as ImageModel,
          prompt,
          modelSettings,
          referenceImages: reference_image ? [reference_image] : [],
          userId: auth.userId,
        }),
        source: 'api_v2',
      }

      const { data: gallery } = await supabase
        .from('gallery')
        .insert({
          user_id: auth.userId,
          prediction_id: prediction.id,
          generation_type: 'image',
          status: 'pending',
          metadata,
        })
        .select()
        .single()

      // Create API job
      const job = await createJob({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        type: 'image',
        predictionId: prediction.id,
        galleryId: gallery?.id,
        cost: costPerImage,
        input: { model, prompt, aspect_ratio, seed },
        webhookUrl: webhook_url,
      })

      if (job) jobs.push(formatJobResponse(job))
    }

    return successResponse(jobs.length === 1 ? jobs[0] : jobs, 201)
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Image generation failed')
  }
}
