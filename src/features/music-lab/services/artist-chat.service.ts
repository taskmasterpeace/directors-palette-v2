/**
 * Artist Chat Service
 * DB CRUD for chat messages and conversations — no LLM logic here
 */

import { getClient } from '@/lib/db/client'
import type { ChatMessage, ChatConversation, ChatReaction, DbChatMessage, DbChatConversation } from '../types/artist-chat.types'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSupabase(): Promise<any> {
  return await getClient()
}

function dbToMessage(db: DbChatMessage): ChatMessage {
  return {
    id: db.id,
    artistId: db.artist_id,
    conversationId: db.conversation_id || undefined,
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

function dbToConversation(db: DbChatConversation): ChatConversation {
  return {
    id: db.id,
    artistId: db.artist_id,
    userId: db.user_id,
    title: db.title,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

class ArtistChatService {
  // --- Conversations ---

  async getConversations(artistId: string, userId: string): Promise<ChatConversation[]> {
    const supabase = await getSupabase()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('artist_chat_conversations')
      .select('*')
      .eq('artist_id', artistId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      logger.musicLab.error('Error fetching conversations', { error })
      return []
    }

    return (data as DbChatConversation[]).map(dbToConversation)
  }

  async createConversation(artistId: string, userId: string, title = 'New Chat'): Promise<ChatConversation | null> {
    const supabase = await getSupabase()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('artist_chat_conversations')
      .insert({ artist_id: artistId, user_id: userId, title })
      .select()
      .single()

    if (error) {
      logger.musicLab.error('Error creating conversation', { error })
      return null
    }

    return dbToConversation(data as DbChatConversation)
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    const { error } = await supabase
      .from('artist_chat_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (error) {
      logger.musicLab.error('Error updating conversation title', { error })
      return false
    }

    return true
  }

  async touchConversation(conversationId: string): Promise<void> {
    const supabase = await getSupabase()
    if (!supabase) return

    await supabase
      .from('artist_chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    const supabase = await getSupabase()
    if (!supabase) return false

    const { error } = await supabase
      .from('artist_chat_conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      logger.musicLab.error('Error deleting conversation', { error })
      return false
    }

    return true
  }

  // --- Messages ---

  async getMessages(artistId: string, userId: string, conversationId?: string, limit = 50): Promise<ChatMessage[]> {
    const supabase = await getSupabase()
    if (!supabase) return []

    let query = supabase
      .from('artist_chat_messages')
      .select('*')
      .eq('artist_id', artistId)
      .eq('user_id', userId)

    if (conversationId) {
      query = query.eq('conversation_id', conversationId)
    } else {
      query = query.is('conversation_id', null)
    }

    const { data, error } = await query
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
        conversation_id: msg.conversation_id || null,
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

    // Touch conversation updated_at
    if (msg.conversation_id) {
      this.touchConversation(msg.conversation_id)
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
