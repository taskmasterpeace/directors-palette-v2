/**
 * Living Context Generation API Route
 * Generates real-time status for an artist
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { livingContextService } from '@/features/music-lab/services/living-context.service'
import { personalityPrintService } from '@/features/music-lab/services/personality-print.service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, dna } = await request.json()

    if (!artistId || !dna) {
      return NextResponse.json({ error: 'artistId and dna are required' }, { status: 400 })
    }

    // Get personality print for richer context
    const print = await personalityPrintService.getPrint(artistId, user.id)

    const livingContext = await livingContextService.generateContext(
      dna,
      print,
      dna.socialCircle
    )

    return NextResponse.json({ livingContext })
  } catch (error) {
    logger.api.error('Generate status error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
