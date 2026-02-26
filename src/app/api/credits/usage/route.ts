/**
 * Credits Usage API
 * Get user's usage statistics (today vs all time)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * GET /api/credits/usage
 * Get user's usage stats (today vs before today)
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    try {
        const supabase = await getClient()

        // Get start of today (UTC)
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)

        // Get all usage transactions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: transactions, error } = await (supabase as any)
            .from('credit_transactions')
            .select('amount, created_at')
            .eq('user_id', auth.user.id)
            .eq('type', 'usage')

        if (error) {
            logger.api.error('Error fetching usage', { error: error instanceof Error ? error.message : String(error) })
            return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
        }

        let usedToday = 0
        let usedBeforeToday = 0
        let generationsToday = 0
        let generationsTotal = 0

        for (const tx of transactions || []) {
            const usedAmount = Math.abs(tx.amount) // usage amounts are negative
            const txDate = new Date(tx.created_at)

            generationsTotal++

            if (txDate >= today) {
                usedToday += usedAmount
                generationsToday++
            } else {
                usedBeforeToday += usedAmount
            }
        }

        return NextResponse.json({
            usedToday,
            usedBeforeToday,
            generationsToday,
            generationsTotal
        })
    } catch (error) {
        logger.api.error('Error fetching usage stats', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
