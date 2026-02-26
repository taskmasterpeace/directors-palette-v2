import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

/**
 * GET /api/community/library
 * Get user's library items and/or IDs of community items in library
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const { searchParams } = new URL(request.url)
    const idsOnly = searchParams.get('idsOnly') === 'true'
    const type = searchParams.get('type')

    if (idsOnly) {
      // Just return community item IDs in library
      let query = supabase
        .from('user_library_items')
        .select('community_item_id')
        .eq('user_id', user.id)
        .not('community_item_id', 'is', null)

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) {
        logger.api.error('Error fetching library IDs', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
          { error: 'Failed to fetch library' },
          { status: 500 }
        )
      }

      const ids = (data || []).map(row => row.community_item_id as string)
      return NextResponse.json({ ids })
    }

    // Return full library items
    let query = supabase
      .from('user_library_items')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      logger.api.error('Error fetching library', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to fetch library' },
        { status: 500 }
      )
    }

    const items = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      communityItemId: row.community_item_id,
      type: row.type,
      name: row.name,
      content: row.content,
      isModified: row.is_modified,
      submittedToCommunity: row.submitted_to_community,
      communityStatus: row.community_status,
      addedAt: row.added_at,
      modifiedAt: row.modified_at,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    logger.api.error('Community library error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/community/library
 * Remove item from user's library
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing item id' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('user_library_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (error) {
      logger.api.error('Error removing from library', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to remove from library' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Item removed from library' })
  } catch (error) {
    logger.api.error('Community library DELETE error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
