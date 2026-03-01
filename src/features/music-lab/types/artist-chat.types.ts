/**
 * Artist Chat Types
 * iMessage-style messaging with AI artists
 */

export type ChatMessageType = 'text' | 'lyrics' | 'photo' | 'action' | 'web-share' | 'system'

export type ChatReaction = 'thumbs-up' | 'thumbs-down' | null

export interface ChatActionData {
  type: 'start-song' | 'work-on-hook' | 'check-beat' | 'view-lyrics'
  label: string
  payload: Record<string, unknown>  // context to pass to destination
}

export interface WebShareData {
  title: string
  url: string
  summary: string
  source: string
}

export interface ChatMessage {
  id: string
  artistId: string
  role: 'user' | 'artist'
  content: string
  messageType: ChatMessageType
  photoUrl?: string
  actionData?: ChatActionData
  webShareData?: WebShareData
  reaction?: ChatReaction
  createdAt: string
}

export interface DbChatMessage {
  id: string
  artist_id: string
  user_id: string
  role: 'user' | 'artist'
  content: string
  message_type: ChatMessageType
  photo_url: string | null
  action_data: ChatActionData | null
  web_share_data: WebShareData | null
  reaction: ChatReaction
  created_at: string
}

/** Taste profile built from thumbs up/down reactions */
export interface TasteProfile {
  likedThemes: string[]
  dislikedThemes: string[]
  likedStyles: string[]
  dislikedStyles: string[]
  topicPreferences: Record<string, number> // topic -> score (-10 to +10)
}

/** Inspiration feed item (thumbs-up'd content) */
export interface InspirationItem {
  id: string
  type: 'lyric' | 'concept' | 'article' | 'photo' | 'beat'
  content: string
  url?: string
  artistId: string
  createdAt: string
}
