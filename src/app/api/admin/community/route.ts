import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'
import { adminService } from '@/features/admin/services/admin.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/community
 * Get all community items (including pending) for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Check admin via database
    const isAdmin = await adminService.checkAdminEmailAsync(user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use service role client for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    let query = supabase
      .from('community_items')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      logger.api.error('Error fetching community items for admin', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      )
    }

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
    logger.api.error('Admin community GET error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/community
 * Approve, reject, or update community items
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Check admin via database
    const isAdmin = await adminService.checkAdminEmailAsync(user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { action, itemId, reason } = body

    if (!action || !itemId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, itemId' },
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let updateData: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        updateData = {
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: null,
        }
        break

      case 'reject':
        if (!reason) {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          )
        }
        updateData = {
          status: 'rejected',
          rejected_reason: reason,
        }
        break

      case 'feature':
        updateData = { is_featured: true }
        break

      case 'unfeature':
        updateData = { is_featured: false }
        break

      case 'delete':
        const { error: deleteError } = await supabase
          .from('community_items')
          .delete()
          .eq('id', itemId)

        if (deleteError) {
          logger.api.error('Error deleting item', { error: deleteError instanceof Error ? deleteError.message : String(deleteError) })
          return NextResponse.json(
            { error: 'Failed to delete item' },
            { status: 500 }
          )
        }

        return NextResponse.json({ message: 'Item deleted successfully' })

      case 'edit':
        const { updates } = body
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json(
            { error: 'Updates object is required for edit action' },
            { status: 400 }
          )
        }

        // Whitelist allowed fields to update
        const allowedFields = ['name', 'description', 'category', 'tags', 'content', 'is_featured']
        const sanitizedUpdates: Record<string, unknown> = {}

        for (const [key, value] of Object.entries(updates)) {
          // Convert camelCase to snake_case for database
          const snakeKey = key === 'isFeatured' ? 'is_featured' : key
          if (allowedFields.includes(snakeKey)) {
            sanitizedUpdates[snakeKey] = value
          }
        }

        sanitizedUpdates.updated_at = new Date().toISOString()
        updateData = sanitizedUpdates
        break

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    const { data, error } = await supabase
      .from('community_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      logger.api.error('Error updating item', { error: error instanceof Error ? error.message : String(error) })
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      item: {
        id: data.id,
        type: data.type,
        name: data.name,
        status: data.status,
        isFeatured: data.is_featured || false,
      },
      message: `Item ${action}d successfully`,
    })
  } catch (error) {
    logger.api.error('Admin community POST error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
