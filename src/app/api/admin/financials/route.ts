/**
 * Admin Financials API
 * Get financial metrics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-auth'
import { financialsService } from '@/features/admin/services/financials.service'
import type { TimePeriod, DateRange } from '@/features/admin/types/financials.types'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(request.url)
        const period = (searchParams.get('period') || 'all_time') as TimePeriod

        let customRange: DateRange | undefined
        if (period === 'custom') {
            const from = searchParams.get('from')
            const to = searchParams.get('to')
            if (from && to) {
                customRange = { from, to }
            }
        }

        const stats = await financialsService.getFinancialStats(period, customRange)
        return NextResponse.json(stats)
    } catch (error) {
        logger.api.error('Error fetching financials', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
