-- Figurines table: stores up to 5 saved 3D figurine models per user
CREATE TABLE IF NOT EXISTS figurines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_image_url TEXT NOT NULL,
    glb_url TEXT NOT NULL,
    prediction_id TEXT,
    credits_charged INTEGER NOT NULL DEFAULT 25,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_figurines_user_id ON figurines(user_id);
CREATE INDEX IF NOT EXISTS idx_figurines_created_at ON figurines(created_at DESC);

-- Enable Row Level Security
ALTER TABLE figurines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read their own figurines" ON figurines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own figurines" ON figurines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own figurines" ON figurines
    FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for API routes
CREATE POLICY "Service role full access to figurines" ON figurines
    FOR ALL USING (true) WITH CHECK (true);
