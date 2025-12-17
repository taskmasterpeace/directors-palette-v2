/**
 * API Usage Statistics
 * GET /api/v1/usage - Get user's API usage stats
 *
 * Note: This endpoint requires session auth or API key auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin/services/admin.service'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { creditsService } from '@/features/credits'

/**
 * GET /api/v1/usage
 * Get API usage statistics
 *
 * Query params:
 * - days: Number of days to look back (default: 30)
 * - admin: If true and user is admin, returns all users' usage
 */
export async function GET(request: NextRequest) {
  try {
    // Try API key auth first
    const authHeader = request.headers.get('authorization')
    const rawKey = apiKeyService.extractKeyFromHeader(authHeader)
    let userId: string
    let isAdmin = false

    if (rawKey) {
      // API key auth
      const validatedKey = await apiKeyService.validateApiKey(rawKey)
      if (!validatedKey) {
        return NextResponse.json(
          { error: 'Invalid or expired API key' },
          { status: 401 }
        )
      }
      if (!validatedKey.scopes.includes('usage:read')) {
        return NextResponse.json(
          { error: 'API key does not have usage:read scope' },
          { status: 403 }
        )
      }
      userId = validatedKey.userId
    } else {
      // Session auth
      const auth = await getAuthenticatedUser(request)
      if (auth instanceof NextResponse) return auth
      userId = auth.user.id
      isAdmin = await adminService.checkAdminEmailAsync(auth.user.email || '')
    }

    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const wantAllUsers = searchParams.get('admin') === 'true' && isAdmin

    if (wantAllUsers) {
      // Admin view - all usage stats
      const stats = await apiKeyService.getUsageStats(days)
      const allKeys = await apiKeyService.getAllApiKeys()

      return NextResponse.json({
        period: `Last ${days} days`,
        totalRequests: stats.totalRequests,
        totalCreditsUsed: stats.totalCreditsUsed,
        averageResponseTime: stats.averageResponseTime,
        requestsByEndpoint: stats.requestsByEndpoint,
        requestsByDay: stats.requestsByDay,
        apiKeys: allKeys.map(k => ({
          id: k.id,
          keyPrefix: k.keyPrefix,
          userEmail: k.userEmail,
          isActive: k.isActive,
          lastUsedAt: k.lastUsedAt,
          createdAt: k.createdAt,
        })),
      })
    }

    // User's own usage
    const usage = await apiKeyService.getUserUsage(userId, 100)
    const credits = await creditsService.getBalance(userId)

    // Calculate stats from usage
    const totalRequests = usage.length
    const totalCreditsUsed = usage.reduce((sum, u) => sum + u.creditsUsed, 0)
    const avgResponseTime = usage.length > 0
      ? Math.round(usage.filter(u => u.responseTimeMs).reduce((sum, u) => sum + (u.responseTimeMs || 0), 0) / usage.filter(u => u.responseTimeMs).length)
      : 0

    // Group by endpoint
    const requestsByEndpoint: Record<string, number> = {}
    for (const u of usage) {
      requestsByEndpoint[u.endpoint] = (requestsByEndpoint[u.endpoint] || 0) + 1
    }

    // Group by day
    const requestsByDayMap: Record<string, { count: number; credits: number }> = {}
    for (const u of usage) {
      const day = u.createdAt.split('T')[0]
      if (!requestsByDayMap[day]) {
        requestsByDayMap[day] = { count: 0, credits: 0 }
      }
      requestsByDayMap[day].count++
      requestsByDayMap[day].credits += u.creditsUsed
    }

    const requestsByDay = Object.entries(requestsByDayMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      period: `Last ${days} days`,
      currentCredits: credits?.balance || 0,
      totalRequests,
      totalCreditsUsed,
      averageResponseTime: avgResponseTime,
      requestsByEndpoint,
      requestsByDay,
      recentRequests: usage.slice(0, 20).map(u => ({
        endpoint: u.endpoint,
        method: u.method,
        statusCode: u.statusCode,
        creditsUsed: u.creditsUsed,
        responseTimeMs: u.responseTimeMs,
        createdAt: u.createdAt,
      })),
    })
  } catch (error) {
    console.error('[API Usage] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
