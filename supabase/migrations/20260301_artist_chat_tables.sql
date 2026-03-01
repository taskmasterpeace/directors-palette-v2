-- Personality prints
CREATE TABLE IF NOT EXISTS artist_personality_prints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  print_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_personality_prints_artist ON artist_personality_prints(artist_id);
CREATE INDEX idx_personality_prints_user ON artist_personality_prints(user_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS artist_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'artist')),
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'lyrics', 'photo', 'action', 'web-share', 'system')),
  photo_url text,
  action_data jsonb,
  web_share_data jsonb,
  reaction text CHECK (reaction IN ('thumbs-up', 'thumbs-down', NULL)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_artist ON artist_chat_messages(artist_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON artist_chat_messages(user_id);

-- Artist memories
CREATE TABLE IF NOT EXISTS artist_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  memory_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_id, user_id)
);

-- Sound studio presets
CREATE TABLE IF NOT EXISTS sound_studio_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artist_id uuid,
  name text NOT NULL,
  preset_json jsonb NOT NULL DEFAULT '{}',
  suno_prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sound_presets_user ON sound_studio_presets(user_id);
