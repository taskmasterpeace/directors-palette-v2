import { NextRequest, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob, updateJobById } from '../../_lib/job-manager'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { creditsService } from '@/features/credits'
import { getModelCost, type ModelId } from '@/config'
import type { RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'
import { parseStageTemplate } from '@/features/shot-creator/types/recipe.types'
import type { RecipeField } from '@/features/shot-creator/types/recipe-field.types'
import { createLogger } from '@/lib/logger'
import { isUuid } from '@/features/shared/constants/style-guards'

export const maxDuration = 300

const log = createLogger('ApiV2')

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const {
      recipe_id,
      fields,
      model,
      aspect_ratio,
      reference_images,
      reference_image,
      reference_tag,
      reference_category,
      webhook_url,
      style_id,
      style,
      style_prompt,
    } = body

    if (!recipe_id || !fields) {
      return errors.validation('recipe_id and fields are required')
    }

    // Fetch recipe from DB
    const supabase = getSupabase()

    // Resolve style override (by UUID, name, or raw prompt) — mirrors /api/v2/images/generate
    let styleOverride: { prompt: string; imageUrl?: string } | undefined
    const styleRef = style_id || style
    if (styleRef) {
      const query = supabase
        .from('style_guides')
        .select('id, name, style_prompt, image_url')
        .eq('is_system', true)
        .limit(1)
      const { data: styles } = isUuid(styleRef)
        ? await query.eq('id', styleRef)
        : await query.ilike('name', styleRef)
      const matched = styles?.[0]
      if (!matched) {
        return errors.validation(
          `Style not found: ${styleRef}. List available styles via GET /api/v2/styles`
        )
      }
      let absoluteImageUrl: string | undefined
      if (matched.image_url) {
        const base =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.WEBHOOK_URL ||
          'https://directorspalette.com'
        absoluteImageUrl = matched.image_url.startsWith('http')
          ? matched.image_url
          : `${base.replace(/\/$/, '')}${matched.image_url.startsWith('/') ? '' : '/'}${matched.image_url}`
      }
      styleOverride = {
        prompt: matched.style_prompt || '',
        imageUrl: absoluteImageUrl,
      }
    } else if (typeof style_prompt === 'string' && style_prompt.trim()) {
      // Raw prompt passthrough — no image
      styleOverride = { prompt: style_prompt.trim() }
    }

    const { data: recipeData, error: recipeError } = await supabase
      .from('user_recipes')
      .select('*')
      .eq('id', recipe_id)
      .single()

    if (recipeError || !recipeData) {
      return errors.notFound('Recipe not found')
    }

    // recipeData is the raw DB row with snake_case columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbRow = recipeData as Record<string, any>

    // Parse fields from stage templates (DB doesn't store fields column)
    const stages = Array.isArray(dbRow.stages) ? dbRow.stages : []
    const recipeFields: RecipeField[] = stages.flatMap(
      (s: { template?: string }, i: number) => s.template ? parseStageTemplate(s.template, i) : []
    )
    // Deduplicate by name
    const uniqueFieldMap = new Map<string, RecipeField>()
    for (const f of recipeFields) {
      if (!uniqueFieldMap.has(f.name)) uniqueFieldMap.set(f.name, f)
      else if (f.required) uniqueFieldMap.set(f.name, f)
    }
    const requiredFields = [...uniqueFieldMap.values()].filter((f) => f.required)
    const missingFields = requiredFields.filter((f) => !(f.name in fields))
    if (missingFields.length > 0) {
      return errors.validation(`Missing required fields: ${missingFields.map((f) => f.name).join(', ')}`)
    }

    // Estimate cost: count generation stages × model cost
    const modelId = (model || dbRow.suggested_model || 'nano-banana-2') as ModelId
    const generationStages = stages.filter((s: { type: string }) => s.type === 'generation' || s.type === 'img2img').length || 1
    const cost = Math.round(getModelCost(modelId) * 100) * generationStages

    // Balance check
    const balance = await creditsService.getBalance(auth.userId, true)
    if (!balance || balance.balance < cost) {
      return errors.insufficientPts(cost, balance?.balance || 0)
    }

    // Create job
    const job = await createJob({
      userId: auth.userId,
      apiKeyId: auth.apiKeyId,
      type: 'recipe',
      cost,
      input: body,
      webhookUrl: webhook_url,
    })

    if (!job) {
      return errors.internal('Failed to create job')
    }

    // WR 002 Bug 4: normalize reference_images into the per-stage string[][] shape
    // that executeRecipe expects. Callers are allowed to pass any of:
    //   - reference_images: [url1, url2]       → flat array, applied to stage 0
    //   - reference_images: [[url1, url2]]     → already nested (advanced use)
    //   - reference_image: url                 → singular legacy field
    // Without this, a flat array was assigned directly to stageReferenceImages
    // (type string[][]) and consumed as string[0][i]=url, silently dropping refs.
    let normalizedStageRefs: string[][] = []
    if (Array.isArray(reference_images)) {
      if (reference_images.length === 0) {
        normalizedStageRefs = []
      } else if (reference_images.every((x: unknown) => typeof x === 'string')) {
        // Flat array → all refs go to stage 0
        normalizedStageRefs = [reference_images as string[]]
      } else if (reference_images.every((x: unknown) => Array.isArray(x))) {
        // Already per-stage nested
        normalizedStageRefs = reference_images as string[][]
      } else {
        return errors.validation(
          'reference_images must be an array of URLs (string[]) or a per-stage array (string[][])'
        )
      }
    } else if (reference_image && typeof reference_image === 'string') {
      normalizedStageRefs = [[reference_image]]
    }

    // Execute recipe in background using Next.js after() to keep the function alive
    after(async () => {
      try {
        const { executeRecipe } = await import('@/features/shared/services/recipe-execution.service')
        const result = await executeRecipe({
          recipe: dbRow as Parameters<typeof executeRecipe>[0]['recipe'],
          fieldValues: fields as RecipeFieldValues,
          stageReferenceImages: normalizedStageRefs,
          model: modelId,
          aspectRatio: aspect_ratio || dbRow.suggested_aspect_ratio || dbRow.suggestedAspectRatio,
          extraMetadata: { source: 'api_v2', api_job_id: job.id },
          userId: auth.userId,
          referenceTag: reference_tag,
          referenceCategory: reference_category,
          styleOverride,
        })

        if (result.success) {
          await updateJobById(job.id, {
            status: 'completed',
            result: {
              image_urls: result.imageUrls,
              final_image_url: result.finalImageUrl,
              // WR 002 Bug 5: audit trail so callers can debug ref-injection
              // regressions without having to scrape the UI for the prompt.
              metadata: {
                resolved_prompts: result.resolvedPrompts,
                reference_images_used: result.stageReferencesUsed,
              },
            },
            completedAt: new Date().toISOString(),
          })
        } else {
          await updateJobById(job.id, {
            status: 'failed',
            errorMessage: result.error || 'Recipe execution failed',
          })
        }
      } catch (err) {
        await updateJobById(job.id, {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    })

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/recipes/execute',
      method: 'POST',
      statusCode: 202,
      creditsUsed: cost,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse(
      {
        job_id: job.id,
        status: 'processing',
        cost,
        poll_url: `/api/v2/jobs/${job.id}`,
      },
      202
    )
  } catch (err) {
    log.error('POST /v2/recipes/execute error', { error: err instanceof Error ? err.message : String(err) })
    return errors.internal()
  }
}
