import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

/**
 * POST /api/community/add
 * Add a community item to user's library
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      )
    }

    // Get the community item
    const { data: itemData, error: itemError } = await supabase
      .from('community_items')
      .select('*')
      .eq('id', itemId)
      .eq('status', 'approved')
      .single()

    if (itemError || !itemData) {
      return NextResponse.json(
        { error: 'Community item not found' },
        { status: 404 }
      )
    }

    // Upsert into user's library (overwrite if exists with same name)
    const { data, error } = await supabase
      .from('user_library_items')
      .upsert({
        user_id: user.id,
        community_item_id: itemId,
        type: itemData.type,
        name: itemData.name,
        content: itemData.content,
        is_modified: false,
        submitted_to_community: false,
        community_status: null,
      }, {
        onConflict: 'user_id,type,name',
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding to library:', error)
      return NextResponse.json(
        { error: 'Failed to add to library' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      libraryItem: {
        id: data.id,
        userId: data.user_id,
        communityItemId: data.community_item_id,
        type: data.type,
        name: data.name,
        content: data.content,
        isModified: data.is_modified,
        addedAt: data.added_at,
      },
      message: 'Item added to library',
    })
  } catch (error) {
    console.error('Community add error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
