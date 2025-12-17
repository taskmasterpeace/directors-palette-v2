/**
 * Admin Generations API
 * Get all generation events for admin analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { generationEventsService } from '@/features/admin/services/generation-events.service'

/**
 * GET /api/admin/generations
 * Get all generation events (admin only)
 * Query params: page, pageSize, user_id, user_email, model_id, status, from_date, to_date
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Check admin status
    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Admin access required' },
            { status: 403 }
        )
    }

    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '50')

        const filters = {
            user_id: searchParams.get('user_id') || undefined,
            user_email: searchParams.get('user_email') || undefined,
            model_id: searchParams.get('model_id') || undefined,
            status: searchParams.get('status') || undefined,
            from_date: searchParams.get('from_date') || undefined,
            to_date: searchParams.get('to_date') || undefined,
        }

        const result = await generationEventsService.getAll(filters, page, pageSize)

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error fetching generations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
