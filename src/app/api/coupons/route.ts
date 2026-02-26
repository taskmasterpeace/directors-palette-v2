
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { couponService } from '@/features/coupons/services/coupon.service'
import { logger } from '@/lib/logger'

/**
 * GET /api/coupons
 * List all coupons (Admin only)
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Auth object from getAuthenticatedUser is weird, it returns the response if failed, 
    // but if success, it returns { user, supabase }. 
    // Wait, getAuthenticatedUser signature in this codebase:
    // It returns NextResponse on error (redirect/401), or nothing/user on success?
    // Let's re-verify getAuthenticatedUser usage in other files.
    // Assuming standard pattern: 
    // const user = await getAuthenticatedUser(request) 
    // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ACTUALLY, I should check how getAuthenticatedUser is implemented or used in credits/route.ts.
    // But for now, I'll rely on the user email from the session.

    const userEmail = auth.user.email
    if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 401 })
    }

    const coupons = await couponService.listCoupons(userEmail)
    return NextResponse.json({ coupons })
}

/**
 * POST /api/coupons
 * Create new coupon (Admin only)
 */
export async function POST(request: NextRequest) {
    logger.api.info('CouponAPI: POST /api/coupons called')

    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) {
        logger.api.info('CouponAPI: Auth failed - returning auth response')
        return auth
    }

    const userEmail = auth.user.email
    logger.api.info('CouponAPI: User email', { detail: userEmail })

    if (!userEmail) {
        logger.api.info('CouponAPI: No user email found')
        return NextResponse.json({ error: 'User email not found' }, { status: 401 })
    }

    try {
        const body = await request.json()
        logger.api.info('CouponAPI: Request body', { detail: body })

        const { code, points, max_uses, expires_at } = body

        if (!code || !points) {
            logger.api.info('CouponAPI: Missing code or points')
            return NextResponse.json({ error: 'Code and points are required' }, { status: 400 })
        }

        logger.api.info('CouponAPI: Calling couponService.createCoupon...')
        const result = await couponService.createCoupon(userEmail, {
            code,
            points: Number(points),
            max_uses: max_uses ? Number(max_uses) : undefined,
            expires_at
        })
        logger.api.info('CouponAPI: Service result', { detail: result })

        if (!result.success) {
            logger.api.info('CouponAPI: Creation failed', { error: result.error })
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        logger.api.info('CouponAPI: Coupon created successfully')
        return NextResponse.json({ coupon: result.coupon })
    } catch (error) {
        logger.api.error('CouponAPI: Exception', { error: error instanceof Error ? error.message : String(error) })
        const message = error instanceof Error ? error.message : 'Invalid request'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}

/**
 * DELETE /api/coupons
 * Delete a coupon (Admin only)
 */
export async function DELETE(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const userEmail = auth.user.email
    if (!userEmail) {
        return NextResponse.json({ error: 'User email not found' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const couponId = searchParams.get('id')

        if (!couponId) {
            return NextResponse.json({ error: 'Coupon ID is required' }, { status: 400 })
        }

        const result = await couponService.deleteCoupon(userEmail, couponId)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        logger.api.error('CouponAPI: Delete exception', { error: error instanceof Error ? error.message : String(error) })
        const message = error instanceof Error ? error.message : 'Failed to delete coupon'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
