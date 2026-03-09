/**
 * Admin Stats API
 * Get platform-wide statistics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { adminService } from '@/features/admin'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/stats
 * Get platform statistics (admin only)
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

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
