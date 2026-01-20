import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getRecipe } from '@/features/shot-creator/services/recipe.service'
import { buildRecipePrompts, validateRecipe } from '@/features/shot-creator/types/recipe.types'
import type { RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'
import { lognog } from '@/lib/lognog'

/**
 * Recipe Execution API
 *
 * Executes a recipe by building prompts, validating fields, and calling the generation API.
 * This endpoint:
 * - Loads recipe from database
 * - Validates required fields
 * - Builds prompts from templates + field values
 * - Auto-merges reference images
 * - Calls /api/generation/image
 * - Polls for completion
 * - Returns final image URL with credit tracking
 *
 * Used by storybook for recipe-based generation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const apiStart = Date.now()
  let userId: string | undefined
  let userEmail: string | undefined

  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth
    userId = user.id
    userEmail = user.email

    // Extract recipeId from params
    const { recipeId } = await params

    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      fieldValues = {},
      referenceImages = [],
      modelSettings = {},
      // Gallery organization (for storybook projects)
      folderId,
      extraMetadata,
    }: {
      fieldValues?: RecipeFieldValues
      referenceImages?: string[]
      modelSettings?: {
        aspectRatio?: string
        outputFormat?: string
        model?: string
      }
      folderId?: string
      extraMetadata?: Record<string, unknown>
    } = body

    // Load recipe from database
    // Support both ID and name lookup (name is useful for system recipes)
    let recipe = await getRecipe(recipeId, user.id)

    // If not found by ID, try by name (for system recipes)
    if (!recipe) {
      const { getRecipeByName } = await import('@/features/shot-creator/services/recipe.service')
      recipe = await getRecipeByName(recipeId, user.id)
    }

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Validate required fields
    const validation = validateRecipe(recipe.stages, fieldValues)

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          missingFields: validation.missingFields,
        },
        { status: 400 }
      )
    }

    // Build prompts from recipe
    const { prompts, stageReferenceImages } = buildRecipePrompts(
      recipe.stages,
      fieldValues
    )

    // DEBUG: Log recipe execution details
    console.log('[Recipe Execute] DEBUG:', {
      recipeName: recipe.name,
      recipeId: recipe.id,
      stageCount: recipe.stages.length,
      promptsCount: prompts.length,
      fieldValues,
      referenceImages,
      prompts: prompts.map((p, i) => ({ stage: i, promptPreview: p.substring(0, 150) + '...' }))
    })

    // For now, only support single-stage recipes for storybook
    if (prompts.length > 1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Multi-stage recipes not yet supported in this endpoint',
        },
        { status: 400 }
      )
    }

    const prompt = prompts[0]
    const recipeReferenceImages = stageReferenceImages[0] || []

    // Merge reference images: recipe images + provided images
    const allReferenceImages = [
      ...recipeReferenceImages,
      ...referenceImages,
    ]

    // Determine model from modelSettings or recipe suggestion
    const model = modelSettings.model || recipe.suggestedModel || 'nano-banana-pro'
    const aspectRatio = modelSettings.aspectRatio || recipe.suggestedAspectRatio || '16:9'
    const outputFormat = modelSettings.outputFormat || 'png'

    // Call generation API
    const generationResponse = await fetch(
      new URL('/api/generation/image', request.url).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward auth cookie
          cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          model,
          prompt,
          referenceImages: allReferenceImages,
          modelSettings: {
            aspectRatio,
            outputFormat,
          },
          // Gallery organization (for storybook projects)
          folderId,
          extraMetadata,
        }),
      }
    )

    const generationData = await generationResponse.json()

    if (!generationResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: generationData.error || 'Generation failed',
        },
        { status: generationResponse.status }
      )
    }

    // Poll for completion
    const predictionId = generationData.predictionId

    if (!predictionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No prediction ID returned from generation',
        },
        { status: 500 }
      )
    }

    // Poll with timeout (max 5 minutes)
    const maxAttempts = 60
    const pollInterval = 5000 // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const statusResponse = await fetch(
        new URL(`/api/generation/status/${predictionId}`, request.url).toString(),
        {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        }
      )

      const statusData = await statusResponse.json()

      if (statusData.status === 'succeeded' && statusData.output) {
        // Success - return image URL
        const imageUrl = statusData.persistedUrl || statusData.output
        const finalImageUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl

        // Log recipe execution success
        lognog.info('recipe_executed', {
          type: 'business',
          event: 'recipe_executed',
          user_id: userId,
          user_email: userEmail,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          stage_count: recipe.stages.length,
          prompt: prompt,
          prompt_length: prompt.length,
          model,
          prediction_id: predictionId,
        })

        // Log API success
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
          predictionId,
          creditsUsed: statusData.creditsUsed || 0,
          recipe: {
            id: recipe.id,
            name: recipe.name,
          },
        })
      }

      if (statusData.status === 'failed') {
        return NextResponse.json(
          {
            success: false,
            error: statusData.error || 'Generation failed',
          },
          { status: 500 }
        )
      }

      // Still processing - wait before next poll
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }
    }

    // Timeout
    return NextResponse.json(
      {
        success: false,
        error: 'Generation timed out after 5 minutes',
      },
      { status: 504 }
    )

  } catch (error) {
    console.error('[Recipe Execute] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    lognog.error(errorMessage, {
      type: 'error',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/recipes/[recipeId]/execute',
      user_id: userId,
      user_email: userEmail,
    })

    // Log API failure
    lognog.info(`POST /api/recipes/[recipeId]/execute 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/recipes/[recipeId]/execute',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Recipe execution failed',
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
