-- Artist DNA: Artist Profiles Table
-- Stores virtual artist profiles with JSONB DNA column

CREATE TABLE IF NOT EXISTS artist_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dna JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);

-- RLS: users can only CRUD their own profiles
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own artist profiles"
  ON artist_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own artist profiles"
  ON artist_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artist profiles"
  ON artist_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artist profiles"
  ON artist_profiles
  FOR DELETE
  USING (auth.uid() = user_id);
