/**
 * Memory Update API Route
 * Called when user closes chat or after idle timeout
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { artistMemoryService } from '@/features/music-lab/services/artist-memory.service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, recentMessages, existingMemory, artistName } = await request.json()

    if (!artistId || !recentMessages || !existingMemory || !artistName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Extract memory updates via LLM
    const updatedMemory = await artistMemoryService.extractMemoryUpdates(
      recentMessages,
      existingMemory,
      artistName
    )

    // Save to DB
    await artistMemoryService.saveMemory(artistId, user.id, updatedMemory)

    return NextResponse.json({ memory: updatedMemory })
  } catch (error) {
    logger.api.error('Memory update error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
