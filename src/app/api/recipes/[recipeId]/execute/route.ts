import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getRecipe } from '@/features/shot-creator/services/recipe.service'
import { buildRecipePrompts, validateRecipe } from '@/features/shot-creator/types/recipe.types'
import type { RecipeFieldValues } from '@/features/shot-creator/types/recipe.types'

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
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

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
    }: {
      fieldValues?: RecipeFieldValues
      referenceImages?: string[]
      modelSettings?: {
        aspectRatio?: string
        outputFormat?: string
        model?: string
      }
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
