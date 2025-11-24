-- Create wildcards table for dynamic prompt expansion
CREATE TABLE IF NOT EXISTS wildcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- wildcard name (e.g., "black_girl_hairstyles", no spaces allowed)
    category TEXT, -- optional category for organization (e.g., "hairstyles", "locations", "characters")
    content TEXT NOT NULL, -- newline-separated list of options
    description TEXT, -- optional description of what this wildcard is for
    is_shared BOOLEAN DEFAULT false, -- whether this wildcard is shared publicly
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint: name must be unique per user
    CONSTRAINT unique_wildcard_name_per_user UNIQUE (user_id, name)
);

-- Create index for user_id for faster queries
CREATE INDEX idx_wildcards_user_id ON wildcards(user_id);

-- Create index for name for faster lookups
CREATE INDEX idx_wildcards_name ON wildcards(name);

-- Create index for category for filtering
CREATE INDEX idx_wildcards_category ON wildcards(category);

-- Create index for is_shared for public wildcard discovery
CREATE INDEX idx_wildcards_is_shared ON wildcards(is_shared);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_wildcards_updated_at
    BEFORE UPDATE ON wildcards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE wildcards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wildcards table
-- Users can create their own wildcards
CREATE POLICY "Users can create their own wildcards" ON wildcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can read their own wildcards and shared wildcards
CREATE POLICY "Users can read their own and shared wildcards" ON wildcards
    FOR SELECT USING (auth.uid() = user_id OR is_shared = true);

-- Users can update their own wildcards
CREATE POLICY "Users can update their own wildcards" ON wildcards
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own wildcards
CREATE POLICY "Users can delete their own wildcards" ON wildcards
    FOR DELETE USING (auth.uid() = user_id);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE wildcards;
