-- ==================================================
-- COPY THIS ENTIRE FILE AND PASTE INTO SUPABASE SQL EDITOR
-- ==================================================

-- Create wildcards table for dynamic prompt expansion
CREATE TABLE IF NOT EXISTS wildcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    content TEXT NOT NULL,
    description TEXT,
    is_shared BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_wildcard_name_per_user UNIQUE (user_id, name)
);

-- Create indexes
CREATE INDEX idx_wildcards_user_id ON wildcards(user_id);
CREATE INDEX idx_wildcards_name ON wildcards(name);
CREATE INDEX idx_wildcards_category ON wildcards(category);
CREATE INDEX idx_wildcards_is_shared ON wildcards(is_shared);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wildcards_updated_at
    BEFORE UPDATE ON wildcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE wildcards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own wildcards" ON wildcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own and shared wildcards" ON wildcards
    FOR SELECT USING (auth.uid() = user_id OR is_shared = true);

CREATE POLICY "Users can update their own wildcards" ON wildcards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wildcards" ON wildcards
    FOR DELETE USING (auth.uid() = user_id);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE wildcards;
