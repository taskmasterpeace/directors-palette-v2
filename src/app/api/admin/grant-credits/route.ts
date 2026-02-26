/**
 * Admin Grant Credits API
 * Grant credits to a user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/grant-credits
 * Grant credits to a user (admin only)
 * Body: { user_id: string, amount: number, description?: string }
 */
export async function POST(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Check admin status using database lookup
    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Admin access required' },
            { status: 403 }
        )
    }

    // SECURITY: Rate limit credit grants even for admins
    const rateCheck = checkRateLimit(`admin-grant:${auth.user.id}`, RATE_LIMITS.ADMIN_CREDIT_GRANT)
    if (!rateCheck.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
        )
    }

    try {
        const body = await request.json()
        const { user_id, amount, description } = body

        if (!user_id) {
            return NextResponse.json(
                { error: 'user_id is required' },
                { status: 400 }
            )
        }

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: 'amount must be a positive number' },
                { status: 400 }
            )
        }

        const result = await adminService.grantCredits(
            auth.user.email!,
            user_id,
            amount,
            description
        )

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            new_balance: result.newBalance,
            formatted_balance: `$${((result.newBalance || 0) / 100).toFixed(2)}`,
            message: `Granted ${amount} credits ($${(amount / 100).toFixed(2)}) to user`
        })
    } catch (error) {
        logger.api.error('Error granting credits', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
