/**
 * Admin Abuse Report API
 * View and manage abuse flags for free credit exploitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits/services/credits.service'
import { getAPIClient } from '@/lib/db/client'
import { adminService } from '@/features/admin/services/admin.service'

// Helper to get an untyped client for abuse tables (not in main DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUntypedClient(): Promise<any> {
    return await getAPIClient()
}

/**
 * GET /api/admin/abuse-report
 * Get abuse summary and recent flags
 */
export async function GET(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Check if user is admin via database
    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const summary = await creditsService.getAbuseSummary()

        if (!summary) {
            return NextResponse.json({
                error: 'Failed to fetch abuse report',
                note: 'Abuse tables may not be created yet. Run the migration first.'
            }, { status: 500 })
        }

        return NextResponse.json({
            summary: {
                total_flags: summary.totalFlags,
                unresolved_flags: summary.unresolvedFlags,
                critical_flags: summary.criticalFlags,
                flagged_ips: summary.flaggedIPs
            },
            recent_flags: summary.recentFlags
        })
    } catch (error) {
        console.error('Error fetching abuse report:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/abuse-report
 * Actions: resolve, ban_ip, grant_credits
 */
export async function POST(request: NextRequest) {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    // Check if user is admin via database
    const isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { action, flag_id, user_id, notes } = body

        const supabase = await getUntypedClient()

        switch (action) {
            case 'resolve': {
                // Mark a flag as resolved
                if (!flag_id) {
                    return NextResponse.json({ error: 'flag_id is required' }, { status: 400 })
                }

                const { error } = await supabase
                    .from('abuse_flags')
                    .update({
                        resolved: true,
                        resolved_by: auth.user.id,
                        resolved_at: new Date().toISOString(),
                        resolution_notes: notes || 'Resolved by admin'
                    })
                    .eq('id', flag_id)

                if (error) {
                    console.error('Error resolving flag:', error)
                    return NextResponse.json({ error: 'Failed to resolve flag' }, { status: 500 })
                }

                return NextResponse.json({ success: true, message: 'Flag resolved' })
            }

            case 'grant_credits': {
                // Manually grant credits to a flagged user (override abuse detection)
                if (!user_id) {
                    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
                }

                const amount = body.amount || 60 // Default to normal free credits

                const result = await creditsService.addCreditsAdmin(user_id, amount, {
                    type: 'bonus',
                    description: 'Admin override - abuse flag cleared',
                    metadata: {
                        granted_by: auth.user.id,
                        notes
                    }
                })

                if (!result.success) {
                    return NextResponse.json({ error: result.error }, { status: 500 })
                }

                return NextResponse.json({
                    success: true,
                    message: `Granted ${amount} credits to user`,
                    new_balance: result.newBalance
                })
            }

            case 'get_user_flags': {
                // Get all flags for a specific user
                if (!user_id) {
                    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
                }

                const { data: flags, error } = await supabase
                    .from('abuse_flags')
                    .select('*')
                    .eq('user_id', user_id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching user flags:', error)
                    return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 })
                }

                // Also get signup IP info
                const { data: signupInfo } = await supabase
                    .from('user_signup_ips')
                    .select('*')
                    .eq('user_id', user_id)
                    .single()

                return NextResponse.json({
                    flags,
                    signup_info: signupInfo,
                    flag_count: flags?.length || 0
                })
            }

            case 'get_ip_users': {
                // Get all users from a specific IP
                const ip_address = body.ip_address
                if (!ip_address) {
                    return NextResponse.json({ error: 'ip_address is required' }, { status: 400 })
                }

                const { data: users, error } = await supabase
                    .from('user_signup_ips')
                    .select('*')
                    .eq('ip_address', ip_address)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching IP users:', error)
                    return NextResponse.json({ error: 'Failed to fetch IP users' }, { status: 500 })
                }

                return NextResponse.json({
                    ip_address,
                    user_count: users?.length || 0,
                    users
                })
            }

            default:
                return NextResponse.json({
                    error: 'Invalid action. Use: resolve, grant_credits, get_user_flags, get_ip_users'
                }, { status: 400 })
        }
    } catch (error) {
        console.error('Admin abuse report error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
