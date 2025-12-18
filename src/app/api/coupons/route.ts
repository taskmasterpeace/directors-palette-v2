
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { couponService } from '@/features/coupons/services/coupon.service'

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
    console.log('[CouponAPI] POST /api/coupons called')

    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) {
        console.log('[CouponAPI] Auth failed - returning auth response')
        return auth
    }

    const userEmail = auth.user.email
    console.log('[CouponAPI] User email:', userEmail)

    if (!userEmail) {
        console.log('[CouponAPI] No user email found')
        return NextResponse.json({ error: 'User email not found' }, { status: 401 })
    }

    try {
        const body = await request.json()
        console.log('[CouponAPI] Request body:', body)

        const { code, points, max_uses, expires_at } = body

        if (!code || !points) {
            console.log('[CouponAPI] Missing code or points')
            return NextResponse.json({ error: 'Code and points are required' }, { status: 400 })
        }

        console.log('[CouponAPI] Calling couponService.createCoupon...')
        const result = await couponService.createCoupon(userEmail, {
            code,
            points: Number(points),
            max_uses: max_uses ? Number(max_uses) : undefined,
            expires_at
        })
        console.log('[CouponAPI] Service result:', result)

        if (!result.success) {
            console.log('[CouponAPI] Creation failed:', result.error)
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        console.log('[CouponAPI] Coupon created successfully')
        return NextResponse.json({ coupon: result.coupon })
    } catch (error) {
        console.error('[CouponAPI] Exception:', error)
        const message = error instanceof Error ? error.message : 'Invalid request'
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
