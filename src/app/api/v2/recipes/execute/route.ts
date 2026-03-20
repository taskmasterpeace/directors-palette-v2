import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { createJob, updateJobById } from '../../_lib/job-manager'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { creditsService } from '@/features/credits'
import { getModelCost, type ModelId } from '@/config'
import type { RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'
import type { RecipeField } from '@/features/shot-creator/types/recipe-field.types'
import { createLogger } from '@/lib/logger'

export const maxDuration = 120

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
    const { recipe_id, fields, model, aspect_ratio, reference_images, webhook_url } = body

    if (!recipe_id || !fields) {
      return errors.validation('recipe_id and fields are required')
    }

    // Fetch recipe from DB
    const supabase = getSupabase()
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

    // Validate all required fields are present
    const recipeFields: RecipeField[] = dbRow.fields || []
    const requiredFields = recipeFields.filter((f) => f.required !== false)
    const missingFields = requiredFields.filter((f) => !(f.name in fields))
    if (missingFields.length > 0) {
      return errors.validation(`Missing required fields: ${missingFields.map((f) => f.name).join(', ')}`)
    }

    // Estimate cost: count generation stages × model cost
    const modelId = (model || dbRow.suggested_model || 'nano-banana-2') as ModelId
    const stages = Array.isArray(dbRow.stages) ? dbRow.stages : []
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

    // Execute recipe async (fire-and-forget within serverless timeout)
    const executeAsync = async () => {
      try {
        const { executeRecipe } = await import('@/features/shared/services/recipe-execution.service')
        const result = await executeRecipe({
          recipe: dbRow as Parameters<typeof executeRecipe>[0]['recipe'],
          fieldValues: fields as RecipeFieldValues,
          stageReferenceImages: reference_images || [],
          model: modelId,
          aspectRatio: aspect_ratio || dbRow.suggested_aspect_ratio || dbRow.suggestedAspectRatio,
          extraMetadata: { source: 'api_v2', api_job_id: job.id },
        })

        if (result.success) {
          await updateJobById(job.id, {
            status: 'completed',
            result: { image_urls: result.imageUrls, final_image_url: result.finalImageUrl },
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
    }

    executeAsync()

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
