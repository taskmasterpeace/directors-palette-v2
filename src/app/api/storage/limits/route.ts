/**
 * Storage Limits API
 * GET /api/storage/limits - Get user's storage limits info
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { StorageLimitsService } from '@/features/storage/services/storage-limits.service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth

  try {
    const limits = await StorageLimitsService.getStorageLimits(auth.user.id)

    return NextResponse.json({
      success: true,
      ...limits,
    })
  } catch (error) {
    logger.api.error('Error getting storage limits', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: 'Failed to get storage limits' },
      { status: 500 }
    )
  }
}
