/**
 * Personality Print API Route
 * GET: Fetch existing print from DB
 * POST: Generate new print if none exists
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { personalityPrintService } from '@/features/music-lab/services/personality-print.service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const artistId = request.nextUrl.searchParams.get('artistId')
    if (!artistId) {
      return NextResponse.json({ error: 'artistId is required' }, { status: 400 })
    }

    const print = await personalityPrintService.getPrint(artistId, user.id)
    return NextResponse.json({ print })
  } catch (error) {
    logger.api.error('Fetch personality print error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
