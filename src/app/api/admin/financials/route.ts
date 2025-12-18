/**
 * Admin Financials API
 * Get financial metrics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { financialsService } from '@/features/admin/services/financials.service'
import type { TimePeriod, DateRange } from '@/features/admin/types/financials.types'

export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Admin access required' },
            { status: 403 }
        )
    }

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
        console.error('Error fetching financials:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
