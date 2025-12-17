
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { couponService } from '@/features/coupons/services/coupon.service'

/**
 * POST /api/coupons/redeem
 * Redeem a coupon code
 */
export async function POST(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    try {
        const body = await request.json()
        const { code } = body

        if (!code) {
            return NextResponse.json({ error: 'Code is required' }, { status: 400 })
        }

        const result = await couponService.redeemCoupon(auth.user.id, code)

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            pointsAdded: result.pointsAdded,
            message: `Successfully redeemed ${result.pointsAdded} credits!`
        })
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}
