/**
 * Conversations API Route
 * CRUD for chat conversation threads
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { artistChatService } from '@/features/music-lab/services/artist-chat.service'
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

    const conversations = await artistChatService.getConversations(artistId, user.id)
    return NextResponse.json({ conversations })
  } catch (error) {
    logger.api.error('List conversations error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { artistId, title } = await request.json()
    if (!artistId) {
      return NextResponse.json({ error: 'artistId is required' }, { status: 400 })
    }

    const conversation = await artistChatService.createConversation(artistId, user.id, title || 'New Chat')
    if (!conversation) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversation })
  } catch (error) {
    logger.api.error('Create conversation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { conversationId, title } = await request.json()
    if (!conversationId || !title) {
      return NextResponse.json({ error: 'conversationId and title are required' }, { status: 400 })
    }

    const success = await artistChatService.updateConversationTitle(conversationId, title)
    return NextResponse.json({ success })
  } catch (error) {
    logger.api.error('Update conversation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const conversationId = request.nextUrl.searchParams.get('id')
    if (!conversationId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const success = await artistChatService.deleteConversation(conversationId)
    return NextResponse.json({ success })
  } catch (error) {
    logger.api.error('Delete conversation error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
