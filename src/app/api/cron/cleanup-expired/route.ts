/**
 * Cron Job: Cleanup Expired Content
 * Runs daily to delete videos older than 7 days
 *
 * Vercel Cron: Configured in vercel.json
 * Manual trigger: GET /api/cron/cleanup-expired?secret=YOUR_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { StorageLimitsService } from '@/features/storage/services/storage-limits.service'
import { logger } from '@/lib/logger'

// Verify the request is from Vercel Cron or has valid secret
// SECURITY: Only accept secret via Authorization header, not query params
// Query params are logged in server access logs and can leak secrets
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
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
    // 1) Delete expired videos (>7 days)
    const deletedCount = await StorageLimitsService.deleteExpiredContent()

    // 2) Delete orphaned reference upload files
    //    (kept for 7 days, floored at the user's last 10 generations)
    const referenceResult = await StorageLimitsService.deleteOrphanedReferenceFiles()

    logger.api.info('Cron: Cleanup completed', {
      deletedCount,
      referenceFilesDeleted: referenceResult.deletedCount,
      usersProcessed: referenceResult.usersProcessed,
      usersFailed: referenceResult.usersFailed,
    })

    return NextResponse.json({
      success: true,
      deletedCount,
      referenceFilesDeleted: referenceResult.deletedCount,
      usersProcessed: referenceResult.usersProcessed,
      usersFailed: referenceResult.usersFailed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.api.error('Cron: Cleanup failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Cleanup failed', details: String(error) },
      { status: 500 }
    )
  }
}
