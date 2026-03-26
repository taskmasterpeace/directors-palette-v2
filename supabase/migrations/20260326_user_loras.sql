-- User-uploaded LoRA metadata (replaces localStorage persistence)
CREATE TABLE IF NOT EXISTS user_loras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  lora_type TEXT NOT NULL DEFAULT 'style',
  trigger_word TEXT,
  weights_url TEXT NOT NULL,
  storage_path TEXT,
  thumbnail_url TEXT,
  default_lora_scale NUMERIC DEFAULT 1.0,
  default_guidance_scale NUMERIC DEFAULT 3.5,
  compatible_models TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_loras_user_id ON user_loras(user_id);

ALTER TABLE user_loras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loras"
  ON user_loras FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loras"
  ON user_loras FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own loras"
  ON user_loras FOR DELETE USING (auth.uid() = user_id);
