/**
 * Artist Chat Service
 * DB CRUD for chat messages — no LLM logic here
 */

import { getClient } from '@/lib/db/client'
import type { ChatMessage, ChatReaction, DbChatMessage } from '../types/artist-chat.types'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabase(): Promise<any> {
  return await getClient()
}

function dbToMessage(db: DbChatMessage): ChatMessage {
  return {
    id: db.id,
    artistId: db.artist_id,
    role: db.role,
    content: db.content,
    messageType: db.message_type,
    photoUrl: db.photo_url || undefined,
    actionData: db.action_data || undefined,
    webShareData: db.web_share_data || undefined,
    reaction: db.reaction,
    createdAt: db.created_at,
  }
}

class ArtistChatService {
  async getMessages(artistId: string, userId: string, limit = 50): Promise<ChatMessage[]> {
    const supabase = await getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('artist_chat_messages')
      .select('*')
      .eq('artist_id', artistId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.musicLab.error('Error fetching chat messages', { error })
      return []
    }

    // Reverse to get chronological order
    return (data as DbChatMessage[]).reverse().map(dbToMessage)
  }

  async saveMessage(msg: Omit<DbChatMessage, 'id' | 'created_at'>): Promise<ChatMessage | null> {
    const supabase = await getSupabase()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('artist_chat_messages')
      .insert({
        artist_id: msg.artist_id,
        user_id: msg.user_id,
        role: msg.role,
        content: msg.content,
        message_type: msg.message_type,
        photo_url: msg.photo_url,
        action_data: msg.action_data,
        web_share_data: msg.web_share_data,
        reaction: msg.reaction,
      })
      .select()
      .single()

    if (error) {
      logger.musicLab.error('Error saving chat message', { error })
      return null
    }

    return dbToMessage(data as DbChatMessage)
  }

  async updateReaction(messageId: string, reaction: ChatReaction): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    const { error } = await supabase
      .from('artist_chat_messages')
      .update({ reaction })
      .eq('id', messageId)

    if (error) {
      logger.musicLab.error('Error updating chat reaction', { error })
      return false
    }

    return true
  }
}

export const artistChatService = new ArtistChatService()
