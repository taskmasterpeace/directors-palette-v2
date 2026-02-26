/**
 * Admin Financial Export API
 * Export financial data as CSV
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { financialsService } from '@/features/admin/services/financials.service'
import { logger } from '@/lib/logger'

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
        const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const to = searchParams.get('to') || new Date().toISOString().split('T')[0]

        const data = await financialsService.exportFinancialData({ from, to })

        // Convert to CSV
        const headers = ['date', 'revenue_cents', 'cost_cents', 'profit_cents', 'generations_count', 'new_users', 'paying_users']
        const csv = [
            headers.join(','),
            ...data.map(row => headers.map(h => row[h as keyof typeof row]).join(','))
        ].join('\n')

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="financials-${from}-to-${to}.csv"`
            }
        })
    } catch (error) {
        logger.api.error('Error exporting financials', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
