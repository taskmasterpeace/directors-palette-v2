/**
 * Admin Generation Stats API
 * Get generation statistics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { generationEventsService } from '@/features/admin/services/generation-events.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/generations/stats
 * Get generation statistics (admin only)
 * Query params: from_date, to_date
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
        const fromDate = searchParams.get('from_date') || undefined
        const toDate = searchParams.get('to_date') || undefined

        const stats = await generationEventsService.getStats(fromDate, toDate)

        return NextResponse.json(stats)
    } catch (error) {
        logger.api.error('Error fetching generation stats', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
