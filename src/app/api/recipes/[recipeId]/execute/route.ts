import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getRecipe } from '@/features/shot-creator/services/recipe.service'
import { buildRecipePrompts, validateRecipe } from '@/features/shot-creator/types/recipe.types'
import type { RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

/**
 * Recipe Execution API — supports single-stage and multi-stage recipes.
 *
 * Multi-stage flow:
 *   Stage 0 generates an image → that image URL becomes a reference for Stage 1 → etc.
 *   Built-in recipe reference images (e.g., character sheet template) are merged per-stage.
 *
 * Request body:
 *   fieldValues           — key/value pairs for template fields
 *   referenceImages       — flat URL array merged into Stage 0 (backward compat)
 *   stageReferenceImages  — 2D array [[stage0_refs], [stage1_refs], …] for explicit control
 *   modelSettings         — { model, aspectRatio, outputFormat }
 *   folderId              — optional gallery folder
 *   extraMetadata         — optional metadata
 */

const MAX_POLL_ATTEMPTS = 60
const POLL_INTERVAL_MS = 5_000

export const maxDuration = 300 // 5 minutes for multi-stage

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const apiStart = Date.now()
  let userId: string | undefined
  let userEmail: string | undefined

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    userId = user.id
    userEmail = user.email

    // ── Params & Body ────────────────────────────────────────────────
    const { recipeId } = await params
    if (!recipeId) {
      return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      fieldValues = {},
      referenceImages = [],
      stageReferenceImages: userStageRefs,
      modelSettings = {},
      folderId,
      extraMetadata,
    }: {
      fieldValues?: RecipeFieldValues
      referenceImages?: string[]
      stageReferenceImages?: string[][]
      modelSettings?: { aspectRatio?: string; outputFormat?: string; model?: string }
      folderId?: string
      extraMetadata?: Record<string, unknown>
    } = body

    // ── Load Recipe ──────────────────────────────────────────────────
    let recipe = await getRecipe(recipeId, user.id)
    if (!recipe) {
      const { getRecipeByName } = await import('@/features/shot-creator/services/recipe.service')
      recipe = await getRecipeByName(recipeId, user.id)
    }
    if (!recipe) {
      return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 })
    }

    // ── Validate Fields ──────────────────────────────────────────────
    const validation = validateRecipe(recipe.stages, fieldValues)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields', missingFields: validation.missingFields },
        { status: 400 }
      )
    }

    // ── Build Prompts ────────────────────────────────────────────────
    const { prompts, stageReferenceImages: recipeStageRefs } = buildRecipePrompts(recipe.stages, fieldValues)
    const totalStages = prompts.length

    logger.api.info('Recipe Execute: Start', {
      detail: {
        recipeName: recipe.name,
        recipeId: recipe.id,
        stageCount: totalStages,
        fieldValues,
        prompts: prompts.map((p, i) => ({ stage: i, preview: p.substring(0, 150) })),
      },
    })

    const model = modelSettings.model || recipe.suggestedModel || 'nano-banana-2'
    const aspectRatio = modelSettings.aspectRatio || recipe.suggestedAspectRatio || '16:9'
    const outputFormat = modelSettings.outputFormat || 'png'
    const baseUrl = request.url
    const cookieHeader = request.headers.get('cookie') || ''

    // ── Execute Stages ───────────────────────────────────────────────
    const imageUrls: string[] = []
    let previousImageUrl: string | undefined

    for (let i = 0; i < totalStages; i++) {
      const prompt = prompts[i]

      // Build reference images for this stage:
      //  1) Previous stage output (if any)
      //  2) Recipe-defined refs for this stage (e.g., character sheet template)
      //  3) User-provided refs for this stage (or flat referenceImages for stage 0)
      const stageRefs: string[] = []

      if (previousImageUrl) {
        stageRefs.push(previousImageUrl)
      }

      // Recipe built-in refs for this stage
      const builtInRefs = recipeStageRefs[i] || []
      stageRefs.push(...builtInRefs)

      // User-provided refs: prefer explicit per-stage, fall back to flat array on stage 0
      if (userStageRefs && userStageRefs[i]) {
        stageRefs.push(...userStageRefs[i])
      } else if (i === 0 && referenceImages.length > 0) {
        stageRefs.push(...referenceImages)
      }

      logger.api.info(`Recipe Execute: Stage ${i + 1}/${totalStages}`, {
        detail: { stage: i, refCount: stageRefs.length, promptPreview: prompt.substring(0, 100) },
      })

      // Call generation API
      const genRes = await fetch(new URL('/api/generation/image', baseUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: cookieHeader },
        body: JSON.stringify({
          model,
          prompt,
          referenceImages: stageRefs,
          modelSettings: { aspectRatio, outputFormat },
          folderId,
          extraMetadata,
        }),
      })

      const genData = await genRes.json()
      if (!genRes.ok) {
        return NextResponse.json(
          { success: false, error: genData.error || `Stage ${i + 1} generation failed` },
          { status: genRes.status }
        )
      }

      const predictionId = genData.predictionId
      if (!predictionId) {
        return NextResponse.json(
          { success: false, error: `Stage ${i + 1}: no prediction ID returned` },
          { status: 500 }
        )
      }

      // Poll for completion
      const imageUrl = await pollForCompletion(baseUrl, cookieHeader, predictionId)
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, error: `Stage ${i + 1} timed out after 5 minutes` },
          { status: 504 }
        )
      }

      if (imageUrl === 'FAILED') {
        return NextResponse.json(
          { success: false, error: `Stage ${i + 1} generation failed` },
          { status: 500 }
        )
      }

      imageUrls.push(imageUrl)
      previousImageUrl = imageUrl
    }

    // ── Success ──────────────────────────────────────────────────────
    const finalImageUrl = imageUrls[imageUrls.length - 1]

    lognog.info('recipe_executed', {
      type: 'business',
      event: 'recipe_executed',
      user_id: userId,
      user_email: userEmail,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      stage_count: totalStages,
      model,
    })

    lognog.info(`POST /api/recipes/${recipeId}/execute 200 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: `/api/recipes/${recipeId}/execute`,
      method: 'POST',
      status_code: 200,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      model,
    })

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      imageUrls,
      stagesCompleted: totalStages,
      recipe: { id: recipe.id, name: recipe.name },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.api.error('Recipe Execute: Error', { error: errorMessage })

    lognog.error(errorMessage, {
      type: 'error',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/recipes/[recipeId]/execute',
      user_id: userId,
      user_email: userEmail,
    })

    return NextResponse.json(
      { success: false, error: 'Recipe execution failed', message: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * Poll the status endpoint until the prediction succeeds, fails, or times out.
 * Returns the persisted image URL on success, 'FAILED' on failure, or null on timeout.
 */
async function pollForCompletion(
  baseUrl: string,
  cookieHeader: string,
  predictionId: string
): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const res = await fetch(new URL(`/api/generation/status/${predictionId}`, baseUrl).toString(), {
      headers: { cookie: cookieHeader },
    })
    const data = await res.json()

    if (data.status === 'succeeded' && data.output) {
      const url = data.persistedUrl || data.output
      return Array.isArray(url) ? url[0] : url
    }

    if (data.status === 'failed') {
      return 'FAILED'
    }

    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
  return null
}
