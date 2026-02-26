import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import type {
  CommunityItemType,
  CommunityFilters,
} from '@/features/community/types/community.types'
import { logger } from '@/lib/logger'
/**
 * GET /api/community
 * List approved community items with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { supabase } = auth
    const { searchParams } = new URL(request.url)

    // Parse filters from query params
    const type = searchParams.get('type') as CommunityItemType | 'all' | null
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') as CommunityFilters['sortBy'] | null

    // Build query
    let query = supabase
      .from('community_items')
      .select('*')
      .eq('status', 'approved')

    // Filter by type
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category)
    }

    // Search by name or description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        query = query.order('add_count', { ascending: false })
        break
      case 'rating':
        query = query.order('rating_count', { ascending: false })
        break
      case 'newest':
        query = query.order('approved_at', { ascending: false })
        break
      case 'alphabetical':
        query = query.order('name', { ascending: true })
        break
      default:
        query = query.order('add_count', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      logger.api.error('Error fetching community items', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to fetch community items' },
        { status: 500 }
      )
    }

    // Transform to camelCase
    const items = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      description: row.description,
      category: row.category,
      tags: row.tags,
      submittedBy: row.submitted_by,
      submittedByName: row.submitted_by_name,
      submittedAt: row.submitted_at,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejectedReason: row.rejected_reason,
      addCount: row.add_count,
      ratingSum: row.rating_sum,
      ratingCount: row.rating_count,
      isFeatured: row.is_featured || false,
      averageRating: row.rating_count > 0 ? row.rating_sum / row.rating_count : 0,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ items })
  } catch (error) {
    logger.api.error('Community GET error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/community
 * Submit a new item to community (pending review)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const body = await request.json()

    // Validate required fields
    if (!body.type || !body.name || !body.category || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, category, content' },
        { status: 400 }
      )
    }

    // Get user display name
    const userName = user.email || 'Anonymous'

    // Insert the submission
    const { data, error } = await supabase
      .from('community_items')
      .insert({
        type: body.type,
        name: body.name,
        description: body.description || null,
        category: body.category,
        tags: body.tags || [],
        content: body.content,
        submitted_by: user.id,
        submitted_by_name: userName,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      logger.api.error('Error submitting community item', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to submit item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      item: {
        id: data.id,
        type: data.type,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
        submittedBy: data.submitted_by,
        submittedByName: data.submitted_by_name,
        submittedAt: data.submitted_at,
        status: data.status,
        content: data.content,
        createdAt: data.created_at,
      },
      message: 'Item submitted for review',
    })
  } catch (error) {
    logger.api.error('Community POST error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
