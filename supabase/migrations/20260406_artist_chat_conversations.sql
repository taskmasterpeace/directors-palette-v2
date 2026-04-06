-- Conversation threads for artist chat
CREATE TABLE IF NOT EXISTS artist_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_conversations_artist_user ON artist_chat_conversations(artist_id, user_id, updated_at DESC);

-- Add conversation_id to existing messages (nullable for backwards compat)
ALTER TABLE artist_chat_messages ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES artist_chat_conversations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON artist_chat_messages(conversation_id, created_at ASC);

-- Add suno-prompt to message_type check constraint
ALTER TABLE artist_chat_messages DROP CONSTRAINT IF EXISTS artist_chat_messages_message_type_check;
ALTER TABLE artist_chat_messages ADD CONSTRAINT artist_chat_messages_message_type_check
  CHECK (message_type IN ('text', 'lyrics', 'suno-prompt', 'photo', 'action', 'web-share', 'system'));
