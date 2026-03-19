import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { VideoGenerationService } from '@/features/shot-animator/services/video-generation.service'
import { ANIMATION_MODELS } from '@/features/shot-animator/config/models.config'
import type { AnimationModel, ModelSettings } from '@/features/shot-animator/types'
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
      model = 'wan-2.2-5b-fast',
      prompt,
      source_image,
      duration = 5,
      aspect_ratio = '16:9',
      fps = 24,
      resolution = '720p',
      camera_fixed = false,
      webhook_url,
    } = body

    // Validate required fields
    if (!prompt) return errors.validation('prompt is required')
    if (!(model in ANIMATION_MODELS)) return errors.validation(`Unknown model: ${model}`)

    // source_image required for all except seedance-1.5-pro and p-video
    if (!source_image && model !== 'seedance-1.5-pro' && model !== 'p-video') {
      return errors.validation(`${model} requires a source_image`)
    }

    // Map flat params to ModelSettings
    const modelSettings: ModelSettings = {
      duration,
      resolution,
      aspectRatio: aspect_ratio,
      fps,
      cameraFixed: camera_fixed,
    }

    // Validate via service
    const validation = VideoGenerationService.validateInput({
      model: model as AnimationModel,
      prompt,
      image: source_image,
      modelSettings,
    })
    if (!validation.valid) {
      return errors.validation(validation.errors.join('; '))
    }

    // Cost calculation
    const cost = VideoGenerationService.calculateCost(
      model as AnimationModel,
      duration,
      resolution as '480p' | '720p' | '1080p'
    )

    // Balance check (admin bypass)
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      if (!balance || balance.balance < cost) {
        return errors.insufficientPts(cost, balance?.balance ?? 0)
      }
    }

    // Deduct credits
    await creditsService.deductCredits(auth.userId, model, {
      overrideAmount: cost,
      generationType: 'video',
      useServiceRole: true,
      user_email: auth.email,
    })

    // Build Replicate input
    const replicateInput = VideoGenerationService.buildReplicateInput({
      model: model as AnimationModel,
      prompt,
      image: source_image,
      modelSettings,
    })

    const replicateModelId = VideoGenerationService.getReplicateModelId(model as AnimationModel)

    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null

    const predictionOptions: Record<string, unknown> = {
      model: replicateModelId,
      input: replicateInput,
    }
    if (webhookUrl) {
      predictionOptions.webhook = webhookUrl
      predictionOptions.webhook_events_filter = ['start', 'completed']
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prediction = await replicate.predictions.create(predictionOptions as any)

    // Create gallery entry
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const metadata = {
      ...VideoGenerationService.buildMetadata({
        model: model as AnimationModel,
        prompt,
        image: source_image,
        modelSettings,
      }),
      source: 'api_v2',
    }

    const { data: gallery } = await supabase
      .from('gallery')
      .insert({
        user_id: auth.userId,
        prediction_id: prediction.id,
        generation_type: 'video',
        status: 'pending',
        metadata,
      })
      .select()
      .single()

    // Create API job
    const job = await createJob({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      type: 'video',
      predictionId: prediction.id,
      galleryId: gallery?.id,
      cost,
      input: { model, prompt, duration, aspect_ratio, resolution },
      webhookUrl: webhook_url,
    })

    if (!job) return errors.internal('Failed to create job record')

    return successResponse(formatJobResponse(job), 201)
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Video generation failed')
  }
}
