/**
 * Admin Stats API
 * Get platform-wide statistics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/stats
 * Get platform statistics (admin only)
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Check admin status via database query (not the broken sync function)
    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    logger.api.info('StatsAPI: Check for', { auth: auth.user.email, isAdmin: isAdmin })

    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Admin access required' },
            { status: 403 }
        )
    }

    try {
        const stats = await adminService.getStats()

        return NextResponse.json({
            ...stats,
            formatted: {
                total_purchased: `$${(stats.total_credits_purchased / 100).toFixed(2)}`,
                total_used: `$${(stats.total_credits_used / 100).toFixed(2)}`,
                total_revenue: `$${(stats.total_revenue_cents / 100).toFixed(2)}`
            }
        })
    } catch (error) {
        logger.api.error('Error fetching stats', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
