import { NextRequest, NextResponse } from 'next/server'
import { getAPIClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * GET /api/recipes/catalog/[itemId]
 * Get a single catalog item by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = await getAPIClient()

    const { data, error } = await adminClient
      .from('community_items')
      .select('*')
      .eq('id', itemId)
      .eq('type', 'recipe')
      .eq('status', 'approved')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Catalog recipe not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = data.content as Record<string, any> | null

    const recipe = {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      content: data.content,
      submittedByName: data.submitted_by_name,
      isOfficial: data.is_official,
      isFeatured: data.is_featured,
      addCount: data.add_count,
      bundledWildcards: data.bundled_wildcards,
      previewImageUrl: content?.previewImageUrl ?? null,
      isAdded: false,
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    logger.api.error('Catalog item fetch error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
