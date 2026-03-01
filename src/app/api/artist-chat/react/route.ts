/**
 * Chat Reaction API Route
 * Thumbs up/down on messages — feeds taste profile and inspiration feed
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { artistChatService } from '@/features/music-lab/services/artist-chat.service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { messageId, reaction, artistId } = await request.json()

    if (!messageId || !artistId) {
      return NextResponse.json({ error: 'messageId and artistId are required' }, { status: 400 })
    }

    // Update reaction in DB
    const success = await artistChatService.updateReaction(messageId, reaction)

    if (!success) {
      return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.api.error('Chat reaction error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
