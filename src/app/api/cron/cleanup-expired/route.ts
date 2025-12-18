/**
 * Cron Job: Cleanup Expired Content
 * Runs daily to delete videos older than 7 days
 *
 * Vercel Cron: Configured in vercel.json
 * Manual trigger: GET /api/cron/cleanup-expired?secret=YOUR_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { StorageLimitsService } from '@/features/storage/services/storage-limits.service'

// Verify the request is from Vercel Cron or has valid secret
function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron sends this header
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // Also check query param for manual triggers
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret === process.env.CRON_SECRET) {
    return true
  }

  return false
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const deletedCount = await StorageLimitsService.deleteExpiredContent()

    console.log(`[Cron] Cleanup completed: ${deletedCount} expired items deleted`)

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Cleanup failed:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: String(error) },
      { status: 500 }
    )
  }
}
