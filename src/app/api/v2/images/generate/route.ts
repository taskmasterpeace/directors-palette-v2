import { NextRequest } from 'next/server'
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'
import { ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import type { ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'
import { MODEL_CONFIGS, ASPECT_RATIO_SIZES, getModelCost, type ModelId } from '@/config'
import { creditsService } from '@/features/credits'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob, formatJobResponse, updateJobById } from '../../_lib/job-manager'
import { StorageService } from '@/features/generation/services/storage.service'
import { lognog } from '@/lib/lognog'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

/** Aspect ratio → fal.ai image_size mapping */
const FAL_SIZE_MAP: Record<string, string> = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
}

/**
 * Call fal.ai Klein 9B + LoRA (text-to-image or edit)
 */
async function callFalAiKleinLora(params: {
  prompt: string
  loras: { path: string; scale: number }[]
  imageUrls?: string[]
  imageSize?: string
  outputFormat: string
  numInferenceSteps?: number
  guidanceScale?: number
}): Promise<{ images: { url: string; width: number; height: number }[]; seed: number }> {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY not configured')

  const isEdit = params.imageUrls && params.imageUrls.length > 0
  const endpoint = isEdit
    ? 'https://fal.run/fal-ai/flux-2/klein/9b/base/edit/lora'
    : 'https://fal.run/fal-ai/flux-2/klein/9b/base/lora'

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    loras: params.loras,
    output_format: params.outputFormat === 'jpg' ? 'jpeg' : params.outputFormat,
    num_inference_steps: params.numInferenceSteps || 28,
    guidance_scale: params.guidanceScale || 5,
    num_images: 1,
    enable_safety_checker: false,
  }

  if (isEdit) {
    body.image_urls = params.imageUrls
  }

  if (params.imageSize) {
    body.image_size = params.imageSize
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    lognog.error('fal.ai v2 API error', {
      status: response.status,
      error: errorText,
      type: 'integration',
      integration: 'fal',
    })
    throw new Error(`fal.ai API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const {
      model,
      prompt: rawPrompt,
      aspect_ratio = '16:9',
      loras,
      reference_image,
      reference_images,
      reference_strength,
      reference_tag,
      reference_category = 'people',
      num_images = 1,
      seed,
      webhook_url,
      style_id,
      style,
    } = body

    let prompt = rawPrompt

    // Build reference images array from both singular and plural fields
    const allReferenceImages: string[] = []
    if (reference_images && Array.isArray(reference_images)) {
      allReferenceImages.push(...reference_images.filter((r: unknown) => typeof r === 'string'))
    } else if (reference_image) {
      allReferenceImages.push(reference_image)
    }

    // Apply style if requested (by UUID or name — system styles only)
    const styleRef = style_id || style
    if (styleRef) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(styleRef)
      const query = supabaseAdmin
        .from('style_guides')
        .select('id, name, style_prompt, image_url')
        .eq('is_system', true)
        .limit(1)
      const { data: styles } = isUuid
        ? await query.eq('id', styleRef)
        : await query.ilike('name', styleRef)
      const matched = styles?.[0]
      if (!matched) {
        return errors.validation(`Style not found: ${styleRef}. List available styles via GET /api/v2/styles`)
      }
      let styleText = matched.style_prompt || ''
      if (matched.image_url) {
        // Convert relative paths (e.g. /storyboard-assets/...) to absolute URLs
        // so external generators (Replicate/fal.ai) can fetch them.
        const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.WEBHOOK_URL || 'https://directorspalette.com'
        const absoluteImageUrl = matched.image_url.startsWith('http')
          ? matched.image_url
          : `${base.replace(/\/$/, '')}${matched.image_url.startsWith('/') ? '' : '/'}${matched.image_url}`
        if (!allReferenceImages.includes(absoluteImageUrl)) {
          allReferenceImages.unshift(absoluteImageUrl)
        }
        // Scope: ignore text FROM the reference image, not from the user's prompt.
        // Safe even for "text style" guides in the future because the user's own
        // prompt remains the source of truth for any text they want rendered.
        const refGuard = 'Apply only the visual style (colors, textures, medium, technique) from the style reference image — ignore any text, titles, captions, or labels that appear within the reference itself.'
        styleText = styleText ? `${styleText}. ${refGuard}` : refGuard
      }
      if (styleText) {
        prompt = prompt ? `${prompt}, ${styleText}` : styleText
      }
    }

    // Auto-resolve @tags in prompt to gallery reference images
    if (prompt) {
      const tagMatches = prompt.match(/@[\w-]+/g)
      if (tagMatches) {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const uniqueTags = [...new Set(tagMatches.map((t: string) => t.startsWith('@') ? t : `@${t}`))]
        for (const tag of uniqueTags) {
          // Skip if we already have this ref URL (avoid duplicates from explicit reference_image)
          const { data } = await supabaseAdmin
            .from('gallery')
            .select('public_url')
            .eq('user_id', auth.userId)
            .eq('status', 'completed')
            .eq('metadata->>reference', tag)
            .not('public_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)

          if (data?.[0]?.public_url) {
            const url = data[0].public_url
            if (!allReferenceImages.includes(url)) {
              allReferenceImages.push(url)
            }
          }
        }
      }
    }

    // Validate required fields
    if (!model) return errors.validation('model is required')
    if (!prompt) return errors.validation('prompt is required')
    if (!(model in MODEL_CONFIGS)) return errors.validation(`Unknown model: ${model}`)
    if (num_images < 1 || num_images > 5) return errors.validation('num_images must be 1-5')

    const modelConfig = MODEL_CONFIGS[model as ModelId]

    // Editing models require a reference image
    if (modelConfig.requiresInputImage && allReferenceImages.length === 0) {
      return errors.validation(`${model} requires a reference_image`)
    }

    // LoRAs only for flux-2-klein-9b
    if (loras && model !== 'flux-2-klein-9b') {
      return errors.validation('loras only supported for flux-2-klein-9b')
    }

    // Validate LoRA format
    if (loras) {
      if (!Array.isArray(loras)) return errors.validation('loras must be an array')
      for (let i = 0; i < loras.length; i++) {
        const l = loras[i]
        if (!l.url || typeof l.url !== 'string') {
          return errors.validation(`loras[${i}].url is required and must be a string`)
        }
        if (!l.url.startsWith('http')) {
          return errors.validation(`loras[${i}].url must be a valid HTTP URL`)
        }
      }
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const loraActive = !!(loras && loras.length > 0)
    const hasRef = allReferenceImages.length > 0
    const jobs = []

    // ── Klein 9B + LoRA: route through fal.ai (synchronous) ──
    if (model === 'flux-2-klein-9b' && loraActive) {
      const falLoras = loras.map((l: { url: string; scale?: number }) => ({
        path: l.url,
        scale: l.scale ?? 1.0,
      }))

      for (let i = 0; i < num_images; i++) {
        // Deduct credits
        await creditsService.deductCredits(auth.userId, model, {
          generationType: 'image',
          useServiceRole: true,
          user_email: auth.email,
        })

        // Create a placeholder prediction ID for fal.ai jobs
        const falJobId = `fal_v2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

        // Build metadata
        const metadata = {
          prompt,
          model,
          aspect_ratio,
          loras: loras.map((l: { url: string; scale?: number }) => ({
            url: l.url,
            scale: l.scale ?? 1.0,
          })),
          source: 'api_v2',
          via: 'fal.ai',
        }

        // Create gallery entry
        const { data: gallery } = await supabase
          .from('gallery')
          .insert({
            user_id: auth.userId,
            prediction_id: falJobId,
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
          predictionId: falJobId,
          galleryId: gallery?.id,
          cost: costPerImage,
          input: { model, prompt, aspect_ratio, loras, seed },
          webhookUrl: webhook_url,
        })

        try {
          // Call fal.ai synchronously
          const falResult = await callFalAiKleinLora({
            prompt,
            loras: falLoras,
            imageUrls: allReferenceImages.length > 0 ? allReferenceImages : undefined,
            imageSize: FAL_SIZE_MAP[aspect_ratio] || 'landscape_16_9',
            outputFormat: 'png',
          })

          if (!falResult.images?.length) {
            throw new Error('fal.ai returned no images')
          }

          // Download from fal.ai and upload to Supabase Storage
          const falImageUrl = falResult.images[0].url
          const { buffer } = await StorageService.downloadAsset(falImageUrl)
          const { ext, mimeType } = StorageService.getMimeType(falImageUrl, 'png')
          const { publicUrl, storagePath, fileSize } = await StorageService.uploadToStorage(
            buffer,
            auth.userId,
            falJobId,
            ext,
            mimeType
          )

          // Update gallery
          if (gallery?.id) {
            await supabase
              .from('gallery')
              .update({
                status: 'completed',
                public_url: publicUrl,
                storage_path: storagePath,
                file_size: fileSize,
                mime_type: mimeType,
              })
              .eq('id', gallery.id)

            // Auto-tag with reference if requested
            if (reference_tag) {
              const normalizedTag = reference_tag.startsWith('@') ? reference_tag : `@${reference_tag}`
              const tagName = normalizedTag.replace(/^@/, '')
              await supabase
                .from('gallery')
                .update({ metadata: { ...metadata, reference: normalizedTag } })
                .eq('id', gallery.id)
              await supabase
                .from('reference')
                .insert({
                  id: crypto.randomUUID(),
                  gallery_id: gallery.id,
                  category: reference_category,
                  tags: [tagName],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
            }
          }

          // Complete the job
          if (job) {
            await updateJobById(job.id, {
              status: 'completed',
              result: { url: publicUrl },
              completedAt: new Date().toISOString(),
            })
            const updatedJob = { ...formatJobResponse(job), status: 'completed', result: { url: publicUrl }, completed_at: new Date().toISOString() }
            jobs.push(updatedJob)
          }
        } catch (falError) {
          // Mark job as failed
          if (job) {
            const errMsg = falError instanceof Error ? falError.message : 'fal.ai generation failed'
            await updateJobById(job.id, {
              status: 'failed',
              errorMessage: errMsg,
              completedAt: new Date().toISOString(),
            })
            jobs.push({ ...formatJobResponse(job), status: 'failed', error_message: errMsg })
          }
        }
      }

      return successResponse(jobs.length === 1 ? jobs[0] : jobs, 201)
    }

    // ── Standard Replicate path (no LoRAs) ──
    const webhookUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/webhooks/replicate`
      : null

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
        referenceImages: allReferenceImages,
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
          referenceImages: allReferenceImages,
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

      // Auto-tag with reference if requested
      if (reference_tag && gallery?.id) {
        const normalizedTag = reference_tag.startsWith('@') ? reference_tag : `@${reference_tag}`
        const tagName = normalizedTag.replace(/^@/, '')

        // Update gallery metadata with reference
        await supabase
          .from('gallery')
          .update({ metadata: { ...metadata, reference: normalizedTag } })
          .eq('id', gallery.id)

        // Upsert into reference table
        await supabase
          .from('reference')
          .insert({
            id: crypto.randomUUID(),
            gallery_id: gallery.id,
            category: reference_category,
            tags: [tagName],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      }

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
