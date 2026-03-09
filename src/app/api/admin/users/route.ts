/**
 * Admin Users API
 * Get all users with their credit information
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { adminService } from '@/features/admin'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/users
 * Get all users (admin only)
 * Query params: page, pageSize, search
 */
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '50')
        const search = searchParams.get('search') || undefined

        const result = await adminService.getAllUsers({ page, pageSize, search })

        return NextResponse.json({
            users: result.users.map(user => ({
                ...user,
                formatted_balance: user.credits
                    ? `$${(user.credits.balance / 100).toFixed(2)}`
                    : '$0.00'
            })),
            total: result.total,
            page,
            pageSize
        })
    } catch (error) {
        logger.api.error('Error fetching users', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
