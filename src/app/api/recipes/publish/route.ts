import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * Extract wildcard names referenced in stage templates.
 * Matches patterns like <<category:wildcard(wildcardName, ...)>>
 */
function extractWildcardNames(stages: unknown[]): string[] {
  const names = new Set<string>()
  const regex = /<<\w+:wildcard\(([^,)]+)/g

  for (const stage of stages) {
    const json = JSON.stringify(stage)
    let match
    while ((match = regex.exec(json)) !== null) {
      const name = match[1].trim()
      if (name) names.add(name)
    }
    // Reset regex lastIndex for next iteration
    regex.lastIndex = 0
  }

  return Array.from(names)
}

/**
 * POST /api/recipes/publish
 * Publish a user's recipe to the community catalog
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = await getAPIClient()

    const body = await request.json()
    const { recipeId, visibility, previewImageUrl } = body

    if (!recipeId) {
      return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
    }
    if (!visibility || !['public', 'unlisted'].includes(visibility)) {
      return NextResponse.json({ error: 'visibility must be "public" or "unlisted"' }, { status: 400 })
    }

    // Fetch the user's recipe (must belong to them)
    const { data: recipe, error: recipeError } = await adminClient
      .from('user_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', user.id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found or not owned by you' }, { status: 404 })
    }

    // Build content JSONB for the catalog entry
    const content = {
      stages: recipe.stages,
      recipeNote: recipe.recipe_note,
      suggestedModel: recipe.suggested_model,
      suggestedAspectRatio: recipe.suggested_aspect_ratio,
      suggestedResolution: recipe.suggested_resolution,
      requiresImage: recipe.requires_image,
      categoryId: recipe.category_id,
      previewImageUrl: previewImageUrl ?? null,
    }

    // Scan stages for wildcard references and bundle them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stages = (recipe.stages as any[]) ?? []
    const wildcardNames = extractWildcardNames(stages)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bundledWildcards: any[] = []

    if (wildcardNames.length > 0) {
      const { data: wildcards } = await adminClient
        .from('user_wildcards')
        .select('name, values, category')
        .eq('user_id', user.id)
        .in('name', wildcardNames)

      if (wildcards) {
        bundledWildcards = wildcards.map((w: { name: string; values: string[]; category: string }) => ({
          name: w.name,
          values: w.values,
          category: w.category,
        }))
      }
    }

    // Get user's display name
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .maybeSingle()

    const authorName = profile?.display_name || profile?.username || 'Anonymous'

    // Insert into community_items
    // unlisted → auto-approved, public → pending admin approval
    const status = visibility === 'unlisted' ? 'approved' : 'pending'

    const { data: catalogItem, error: insertError } = await adminClient
      .from('community_items')
      .insert({
        type: 'recipe',
        name: recipe.name,
        description: recipe.description,
        category: recipe.category_id || recipe.category || 'custom',
        content,
        submitted_by: user.id,
        submitted_by_name: authorName,
        status,
        bundled_wildcards: bundledWildcards.length > 0 ? bundledWildcards : null,
      })
      .select('id')
      .single()

    if (insertError) {
      logger.api.error('Error publishing recipe', { error: insertError.message })
      return NextResponse.json({ error: 'Failed to publish recipe' }, { status: 500 })
    }

    return NextResponse.json({ catalogItemId: catalogItem.id })
  } catch (error) {
    logger.api.error('Recipe publish error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
