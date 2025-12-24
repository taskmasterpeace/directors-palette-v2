-- Create storybook_projects table for persisting Storybook projects
-- This table stores children's book projects with all their data as JSONB

CREATE TABLE IF NOT EXISTS storybook_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  project_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE storybook_projects ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own projects
CREATE POLICY "Users can manage own storybook projects"
  ON storybook_projects FOR ALL
  USING (auth.uid() = user_id);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_storybook_projects_user ON storybook_projects(user_id);

-- Add comment for documentation
COMMENT ON TABLE storybook_projects IS 'Stores children''s storybook projects created in the Storybook feature';
COMMENT ON COLUMN storybook_projects.project_data IS 'Full project data including pages, characters, styles, and generation results';
