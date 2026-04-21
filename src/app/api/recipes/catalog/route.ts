import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * Map a community_items row to the CatalogRecipe shape
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToCatalogRecipe(row: any, isAdded = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = row.content as Record<string, any> | null
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags,
    content: row.content,
    submittedByName: row.submitted_by_name,
    isOfficial: row.is_official,
    isFeatured: row.is_featured,
    addCount: row.add_count,
    bundledWildcards: row.bundled_wildcards,
    previewImageUrl: content?.previewImageUrl ?? null,
    isAdded,
  }
}

/**
 * GET /api/recipes/catalog
 * List approved recipe catalog items from community_items
 */
export async function GET(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = await getAPIClient()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')

    let query = adminClient
      .from('community_items')
      .select('*')
      .eq('type', 'recipe')
      .eq('status', 'approved')

    if (category) {
      query = query.eq('category', category)
    }
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }
    if (featured === 'true') {
      query = query.eq('is_featured', true)
    }

    query = query
      .order('is_featured', { ascending: false })
      .order('add_count', { ascending: false })

    const { data, error } = await query

    if (error) {
      logger.api.error('Error fetching catalog recipes', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch catalog recipes' }, { status: 500 })
    }

    // Try to get current user to mark which recipes they already have
    const addedNames = new Set<string>()
    try {
      const auth = await getAuthenticatedUser(request)
      if (!(auth instanceof NextResponse)) {
        const { data: userRecipes } = await adminClient
          .from('user_recipes')
          .select('name')
          .eq('user_id', auth.user.id)

        if (userRecipes) {
          for (const r of userRecipes) {
            addedNames.add(r.name)
          }
        }
      }
    } catch {
      // Not authenticated — that's fine, just skip isAdded marking
    }

    const recipes = (data ?? []).map((row: Record<string, unknown>) =>
      mapToCatalogRecipe(row, addedNames.has(row.name as string))
    )

    return NextResponse.json({ recipes, total: recipes.length })
  } catch (error) {
    logger.api.error('Catalog fetch error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/recipes/catalog
 * Add a catalog recipe to the user's personal collection
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = await getAPIClient()

    const body = await request.json()
    const { catalogItemId } = body

    if (!catalogItemId) {
      return NextResponse.json({ error: 'catalogItemId is required' }, { status: 400 })
    }

    // Fetch the catalog item
    const { data: catalogItem, error: fetchError } = await adminClient
      .from('community_items')
      .select('*')
      .eq('id', catalogItemId)
      .eq('type', 'recipe')
      .eq('status', 'approved')
      .single()

    if (fetchError || !catalogItem) {
      return NextResponse.json({ error: 'Catalog recipe not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = catalogItem.content as Record<string, any> | null
    if (!content) {
      return NextResponse.json({ error: 'Catalog recipe has no content' }, { status: 400 })
    }

    // Create a copy in user_recipes
    const { data: newRecipe, error: insertError } = await adminClient
      .from('user_recipes')
      .insert({
        user_id: user.id,
        name: catalogItem.name,
        description: catalogItem.description,
        category: catalogItem.category,
        tags: catalogItem.tags,
        ...content,
        is_system: false,
        source_catalog_id: catalogItemId,
        // Provenance tag — makes the My Recipes list show "From catalog" on this row.
        source: 'catalog',
      })
      .select('id')
      .single()

    if (insertError) {
      logger.api.error('Error adding catalog recipe', { error: insertError.message })
      return NextResponse.json({ error: 'Failed to add recipe' }, { status: 500 })
    }

    // Increment add_count on the catalog item
    await adminClient
      .from('community_items')
      .update({ add_count: (catalogItem.add_count ?? 0) + 1 })
      .eq('id', catalogItemId)

    // Import bundled wildcards if any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bundledWildcards = catalogItem.bundled_wildcards as any[] | null
    if (bundledWildcards && bundledWildcards.length > 0) {
      for (const wildcard of bundledWildcards) {
        if (!wildcard.name) continue

        // Check if user already has this wildcard
        const { data: existing } = await adminClient
          .from('user_wildcards')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', wildcard.name)
          .maybeSingle()

        if (!existing) {
          await adminClient
            .from('user_wildcards')
            .insert({
              user_id: user.id,
              name: wildcard.name,
              values: wildcard.values ?? [],
              category: wildcard.category ?? 'imported',
            })
        }
      }
    }

    return NextResponse.json({ recipeId: newRecipe.id })
  } catch (error) {
    logger.api.error('Catalog add error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
