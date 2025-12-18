
import { getAPIClient } from '@/lib/db/client'
import { adminService } from '@/features/admin/services/admin.service'

export interface Coupon {
    id: string
    code: string
    points: number
    max_uses: number | null
    used_count: number
    expires_at: string | null
    is_active: boolean
    created_at: string
}

export interface CouponRedemption {
    id: string
    coupon_id: string
    user_id: string
    redeemed_at: string
    coupon?: Coupon
}

export class CouponService {
    /**
     * Create a new coupon (Admin only)
     */
    async createCoupon(
        adminEmail: string,
        data: {
            code: string
            points: number
            max_uses?: number
            expires_at?: string
        }
    ): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
        console.log('[CouponService] Creating coupon:', { adminEmail, data })

        // Double check admin permission
        const isAdmin = await adminService.checkAdminEmailAsync(adminEmail)
        console.log('[CouponService] Admin check:', { adminEmail, isAdmin })

        if (!isAdmin) {
            return { success: false, error: 'Unauthorized: Not an admin' }
        }

        const supabase = await getAPIClient()

        try {
            console.log('[CouponService] Inserting into coupons table...')

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: coupon, error } = await (supabase as any)
                .from('coupons')
                .insert({
                    code: data.code.toUpperCase(), // Enforce uppercase
                    points: data.points,
                    max_uses: data.max_uses,
                    expires_at: data.expires_at,
                    is_active: true
                })
                .select()
                .single()

            console.log('[CouponService] Insert result:', { coupon, error })

            if (error) {
                if (error.code === '23505') {
                    return { success: false, error: 'Coupon code already exists' }
                }
                console.error('[CouponService] Database error:', error)
                return { success: false, error: error.message || 'Database error' }
            }

            return { success: true, coupon: coupon as Coupon }
        } catch (error) {
            console.error('[CouponService] Error creating coupon:', error)
            const message = error instanceof Error ? error.message : 'Failed to create coupon'
            return { success: false, error: message }
        }
    }

    /**
     * List all coupons (Admin only)
     */
    async listCoupons(adminEmail: string): Promise<Coupon[]> {
        if (!await adminService.checkAdminEmailAsync(adminEmail)) {
            return []
        }

        const supabase = await getAPIClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error listings coupons:', error)
            return []
        }

        return data as Coupon[]
    }

    /**
     * Delete a coupon (Admin only)
     */
    async deleteCoupon(
        adminEmail: string,
        couponId: string
    ): Promise<{ success: boolean; error?: string }> {
        // Double check admin permission
        const isAdmin = await adminService.checkAdminEmailAsync(adminEmail)
        if (!isAdmin) {
            return { success: false, error: 'Unauthorized: Not an admin' }
        }

        const supabase = await getAPIClient()

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('coupons')
                .delete()
                .eq('id', couponId)

            if (error) {
                console.error('[CouponService] Delete error:', error)
                return { success: false, error: error.message || 'Failed to delete coupon' }
            }

            return { success: true }
        } catch (error) {
            console.error('[CouponService] Error deleting coupon:', error)
            const message = error instanceof Error ? error.message : 'Failed to delete coupon'
            return { success: false, error: message }
        }
    }

    /**
     * Redeem a coupon for a user
     */
    async redeemCoupon(
        userId: string,
        code: string
    ): Promise<{ success: boolean; pointsAdded?: number; error?: string }> {
        const supabase = await getAPIClient()

        try {
            // Call the database RPC function we created
            // @ts-expect-error - Tables not yet in types
            const { data, error } = await supabase.rpc('redeem_coupon', {
                p_code: code.toUpperCase(),
                p_user_id: userId
            })

            if (error) throw error

            // RPC returns JSONB like { success: boolean, error?: string, points?: number }
            const result = data as { success: boolean; error?: string; points?: number }

            if (result.success) {
                return { success: true, pointsAdded: result.points }
            } else {
                return { success: false, error: result.error || 'Redemption failed' }
            }
        } catch (error) {
            console.error('Error redeeming coupon:', error)
            return { success: false, error: 'Failed to redeem coupon' }
        }
    }
}

export const couponService = new CouponService()
