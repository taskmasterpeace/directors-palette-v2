/**
 * Admin Export Logs API
 * Export generation events in LogNog-compatible JSON format
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin'
import { generationEventsService } from '@/features/admin/services/generation-events.service'

/**
 * GET /api/admin/export-logs
 * Export generation events for LogNog (admin only)
 * Query params: since (required), until (required)
 *
 * Response format: JSON array compatible with LogNog batch import
 * [
 *   { "timestamp": "...", "event_type": "generation", ... },
 *   ...
 * ]
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Check admin status
    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    if (!isAdmin) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Admin access required' },
            { status: 403 }
        )
    }

    try {
        const { searchParams } = new URL(request.url)
        const since = searchParams.get('since')
        const until = searchParams.get('until')

        if (!since || !until) {
            return NextResponse.json(
                {
                    error: 'Missing required parameters',
                    message: 'Both "since" and "until" date parameters are required',
                    example: '/api/admin/export-logs?since=2024-01-01&until=2024-01-31'
                },
                { status: 400 }
            )
        }

        // Validate date formats
        const sinceDate = new Date(since)
        const untilDate = new Date(until)

        if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
            return NextResponse.json(
                {
                    error: 'Invalid date format',
                    message: 'Dates must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)'
                },
                { status: 400 }
            )
        }

        const logs = await generationEventsService.exportForLogNog(since, until)

        // Return as JSON array (LogNog format)
        return NextResponse.json(logs, {
            headers: {
                'Content-Disposition': `attachment; filename="directors-palette-logs-${since}-to-${until}.json"`,
            }
        })
    } catch (error) {
        console.error('Error exporting logs:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
