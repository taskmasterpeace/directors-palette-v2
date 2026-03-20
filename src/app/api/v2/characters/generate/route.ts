import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import type { ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'
import { getModelCost, type ModelId } from '@/config'
import { creditsService } from '@/features/credits'
import {
  DEFAULT_SIDE1_PROMPT,
  DEFAULT_SIDE2_PROMPT,
} from '@/features/storyboard/services/character-sheet.service'
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
      name,
      description,
      style = 'cinematic',
      reference_image,
      reference_images,
      style_reference,
      aspect_ratio = '16:9',
      webhook_url,
    } = body

    if (!name) return errors.validation('name is required')
    if (!description) return errors.validation('description is required')

    // Cost: 2 images (turnaround + expressions) at nano-banana-2 rate
    const costPerImage = Math.round(getModelCost('nano-banana-2' as ModelId) * 100)
    const totalCost = costPerImage * 2

    // Balance check
    if (!auth.isAdmin) {
      const balance = await creditsService.getBalance(auth.userId, true)
      if (!balance || balance.balance < totalCost) {
        return errors.insufficientPts(totalCost, balance?.balance ?? 0)
      }
    }

    // Build prompts
    const characterLabel = `${name}: ${description}`
    const side1Prompt = DEFAULT_SIDE1_PROMPT
      .replace(/<CHARACTER_NAME>/g, characterLabel)
      .replace(/<STYLE_NAME>/g, style)
    const side2Prompt = DEFAULT_SIDE2_PROMPT
      .replace(/<CHARACTER_NAME>/g, characterLabel)
      .replace(/<STYLE_NAME>/g, style)

    // Build reference images array (support both single and array)
    const referenceImages: string[] = []
    if (reference_images && Array.isArray(reference_images)) {
      referenceImages.push(...reference_images)
    } else if (reference_image) {
      referenceImages.push(reference_image)
    }
    if (style_reference) referenceImages.push(style_reference)

    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const sides = [
      { prompt: side1Prompt, label: 'turnaround' },
      { prompt: side2Prompt, label: 'expressions' },
    ]

    const results: Record<string, unknown> = {}

    for (const side of sides) {
      const modelSettings: ImageModelSettings = {
        aspectRatio: aspect_ratio,
        resolution: '2K',
        outputFormat: 'png',
      } as ImageModelSettings

      const replicateInput = ImageGenerationService.buildReplicateInput({
        model: 'nano-banana-2' as ImageModel,
        prompt: side.prompt,
        modelSettings,
        referenceImages: referenceImages.length > 0 ? referenceImages : [],
        userId: auth.userId,
      })

      const replicateModelId = ImageGenerationService.getReplicateModelId('nano-banana-2' as ImageModel)

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

      // Deduct credits
      await creditsService.deductCredits(auth.userId, 'nano-banana-2', {
        generationType: 'image',
        useServiceRole: true,
        user_email: auth.email,
      })

      // Create gallery entry
      const metadata = {
        ...ImageGenerationService.buildMetadata({
          model: 'nano-banana-2' as ImageModel,
          prompt: side.prompt,
          modelSettings,
          referenceImages,
          userId: auth.userId,
        }),
        source: 'api_v2',
        character_name: name,
        character_side: side.label,
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

      const job = await createJob({
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
        type: 'character',
        predictionId: prediction.id,
        galleryId: gallery?.id,
        cost: costPerImage,
        input: { name, description, style, side: side.label },
        webhookUrl: webhook_url,
      })

      if (job) {
        const formatted = formatJobResponse(job)
        results[side.label] = {
          ...formatted,
          poll_url: `/api/v2/jobs/${job.id}`,
        }
      }
    }

    return successResponse({
      turnaround: results.turnaround,
      expressions: results.expressions,
      total_cost: totalCost,
    }, 201)
  } catch (err) {
    return errors.internal(err instanceof Error ? err.message : 'Character generation failed')
  }
}
