-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT folders_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT folders_unique_name_per_user UNIQUE (user_id, name)
);

-- Create index for user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

-- Create index for name for searching
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders(name);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for folders table
CREATE POLICY "Users can create their own folders" ON folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own folders" ON folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON folders
    FOR DELETE USING (auth.uid() = user_id);

-- Add folder_id column to gallery table
ALTER TABLE gallery ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create index on gallery.folder_id for performance
CREATE INDEX IF NOT EXISTS idx_gallery_folder_id ON gallery(folder_id);

-- Add folders table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE folders;
