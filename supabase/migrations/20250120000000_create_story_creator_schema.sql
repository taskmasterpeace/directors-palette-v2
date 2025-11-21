-- Story Creator Feature Schema
-- Creates tables for story projects, shots, and generation queue

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Story Projects Table
CREATE TABLE IF NOT EXISTS public.story_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    story_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'extracting', 'ready', 'generating', 'completed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Story Shots Table
CREATE TABLE IF NOT EXISTS public.story_shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.story_projects(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    chapter TEXT,
    prompt TEXT NOT NULL,
    reference_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'generating', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, sequence_number)
);

-- Generation Queue Table
CREATE TABLE IF NOT EXISTS public.generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.story_projects(id) ON DELETE CASCADE,
    shot_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_shot_index INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_projects_user_id ON public.story_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_story_projects_status ON public.story_projects(status);
CREATE INDEX IF NOT EXISTS idx_story_projects_created_at ON public.story_projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_story_shots_project_id ON public.story_shots(project_id);
CREATE INDEX IF NOT EXISTS idx_story_shots_sequence ON public.story_shots(project_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_story_shots_status ON public.story_shots(status);
CREATE INDEX IF NOT EXISTS idx_story_shots_gallery_id ON public.story_shots(gallery_id);

CREATE INDEX IF NOT EXISTS idx_generation_queue_user_id ON public.generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_project_id ON public.generation_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status ON public.generation_queue(status);

-- Row Level Security (RLS) Policies

-- Story Projects RLS
ALTER TABLE public.story_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own story projects"
    ON public.story_projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own story projects"
    ON public.story_projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story projects"
    ON public.story_projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own story projects"
    ON public.story_projects FOR DELETE
    USING (auth.uid() = user_id);

-- Story Shots RLS
ALTER TABLE public.story_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shots from their own projects"
    ON public.story_shots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.story_projects
            WHERE story_projects.id = story_shots.project_id
            AND story_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create shots in their own projects"
    ON public.story_shots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.story_projects
            WHERE story_projects.id = story_shots.project_id
            AND story_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shots in their own projects"
    ON public.story_shots FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.story_projects
            WHERE story_projects.id = story_shots.project_id
            AND story_projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shots from their own projects"
    ON public.story_shots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.story_projects
            WHERE story_projects.id = story_shots.project_id
            AND story_projects.user_id = auth.uid()
        )
    );

-- Generation Queue RLS
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation queues"
    ON public.generation_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generation queues"
    ON public.generation_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation queues"
    ON public.generation_queue FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generation queues"
    ON public.generation_queue FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_story_projects_updated_at
    BEFORE UPDATE ON public.story_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_story_shots_updated_at
    BEFORE UPDATE ON public.story_shots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generation_queue_updated_at
    BEFORE UPDATE ON public.generation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
