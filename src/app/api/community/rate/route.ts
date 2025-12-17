import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

/**
 * POST /api/community/rate
 * Rate a community item
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const body = await request.json()
    const { itemId, rating } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      )
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    // Check that the item exists and is approved
    const { data: itemData, error: itemError } = await supabase
      .from('community_items')
      .select('id, submitted_by')
      .eq('id', itemId)
      .eq('status', 'approved')
      .single()

    if (itemError || !itemData) {
      return NextResponse.json(
        { error: 'Community item not found' },
        { status: 404 }
      )
    }

    // Can't rate your own submission
    if (itemData.submitted_by === user.id) {
      return NextResponse.json(
        { error: 'Cannot rate your own submission' },
        { status: 403 }
      )
    }

    // Upsert rating
    const { error } = await supabase
      .from('community_ratings')
      .upsert({
        user_id: user.id,
        community_item_id: itemId,
        rating,
      }, {
        onConflict: 'user_id,community_item_id',
      })

    if (error) {
      console.error('Error rating item:', error)
      return NextResponse.json(
        { error: 'Failed to rate item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Rating saved',
      rating,
    })
  } catch (error) {
    console.error('Community rate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/community/rate
 * Get user's ratings
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth

    const { data, error } = await supabase
      .from('community_ratings')
      .select('community_item_id, rating')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching ratings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ratings' },
        { status: 500 }
      )
    }

    // Return as object for easy lookup
    const ratings: Record<string, number> = {}
    data.forEach(row => {
      ratings[row.community_item_id] = row.rating
    })

    return NextResponse.json({ ratings })
  } catch (error) {
    console.error('Community ratings GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
