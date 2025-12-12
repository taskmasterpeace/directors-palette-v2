-- Storyboard Feature Schema
-- Creates tables for storyboards, characters, locations, shots, B-roll, contact sheets, and LLM settings

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- LLM Settings Table (per user)
CREATE TABLE IF NOT EXISTS public.llm_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'openrouter',
    model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
    api_key TEXT, -- Encrypted OpenRouter key
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Style Guides Table
CREATE TABLE IF NOT EXISTS public.style_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    reference_gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    style_prompt TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Storyboards Table (main project)
CREATE TABLE IF NOT EXISTS public.storyboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    story_text TEXT NOT NULL,
    style_guide_id UUID REFERENCES public.style_guides(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'extracting', 'ready', 'generating', 'completed')),
    breakdown_level INTEGER NOT NULL DEFAULT 2 CHECK (breakdown_level >= 1 AND breakdown_level <= 3),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Storyboard Characters Table (auto-extracted from story)
CREATE TABLE IF NOT EXISTS public.storyboard_characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mentions INTEGER NOT NULL DEFAULT 1,
    has_reference BOOLEAN NOT NULL DEFAULT FALSE,
    reference_gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(storyboard_id, name)
);

-- Location References Table
CREATE TABLE IF NOT EXISTS public.storyboard_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    mentions INTEGER NOT NULL DEFAULT 1,
    has_reference BOOLEAN NOT NULL DEFAULT FALSE,
    reference_gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(storyboard_id, name)
);

-- Storyboard Shots Table
CREATE TABLE IF NOT EXISTS public.storyboard_shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    original_text TEXT NOT NULL,
    prompt TEXT NOT NULL,
    character_names TEXT[] DEFAULT ARRAY[]::TEXT[],
    location_name TEXT,
    gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'generating', 'completed', 'failed')),
    start_index INTEGER,
    end_index INTEGER,
    color TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(storyboard_id, sequence_number)
);

-- Contact Sheet Variants Table (3x3 grid)
CREATE TABLE IF NOT EXISTS public.contact_sheet_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storyboard_shot_id UUID NOT NULL REFERENCES public.storyboard_shots(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 9),
    angle_type TEXT NOT NULL CHECK (angle_type IN (
        'wide_distant', 'wide_full_body', 'wide_medium_long',
        'core_waist_up', 'core_chest_up', 'core_tight_face',
        'detail_macro', 'detail_low_angle', 'detail_high_angle'
    )),
    prompt TEXT NOT NULL,
    gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(storyboard_shot_id, position)
);

-- B-Roll Shots Table (contextual reinforcement shots)
CREATE TABLE IF NOT EXISTS public.broll_shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
    context_text TEXT,
    prompt TEXT NOT NULL,
    gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Storyboard Generation Queue Table
CREATE TABLE IF NOT EXISTS public.storyboard_generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
    shot_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paused', 'completed', 'failed')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    current_shot_index INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_settings_user_id ON public.llm_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_style_guides_user_id ON public.style_guides(user_id);
CREATE INDEX IF NOT EXISTS idx_style_guides_created_at ON public.style_guides(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storyboards_user_id ON public.storyboards(user_id);
CREATE INDEX IF NOT EXISTS idx_storyboards_status ON public.storyboards(status);
CREATE INDEX IF NOT EXISTS idx_storyboards_created_at ON public.storyboards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storyboards_style_guide ON public.storyboards(style_guide_id);

CREATE INDEX IF NOT EXISTS idx_storyboard_characters_storyboard_id ON public.storyboard_characters(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_characters_has_reference ON public.storyboard_characters(has_reference);

CREATE INDEX IF NOT EXISTS idx_storyboard_locations_storyboard_id ON public.storyboard_locations(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_locations_has_reference ON public.storyboard_locations(has_reference);

CREATE INDEX IF NOT EXISTS idx_storyboard_shots_storyboard_id ON public.storyboard_shots(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_sequence ON public.storyboard_shots(storyboard_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_status ON public.storyboard_shots(status);
CREATE INDEX IF NOT EXISTS idx_storyboard_shots_gallery_id ON public.storyboard_shots(gallery_id);

CREATE INDEX IF NOT EXISTS idx_contact_sheet_variants_shot_id ON public.contact_sheet_variants(storyboard_shot_id);
CREATE INDEX IF NOT EXISTS idx_contact_sheet_variants_status ON public.contact_sheet_variants(status);

CREATE INDEX IF NOT EXISTS idx_broll_shots_storyboard_id ON public.broll_shots(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_broll_shots_status ON public.broll_shots(status);

CREATE INDEX IF NOT EXISTS idx_storyboard_gen_queue_user_id ON public.storyboard_generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_gen_queue_storyboard_id ON public.storyboard_generation_queue(storyboard_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_gen_queue_status ON public.storyboard_generation_queue(status);

-- Row Level Security (RLS) Policies

-- LLM Settings RLS
ALTER TABLE public.llm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own LLM settings"
    ON public.llm_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LLM settings"
    ON public.llm_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LLM settings"
    ON public.llm_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LLM settings"
    ON public.llm_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Style Guides RLS
ALTER TABLE public.style_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own style guides"
    ON public.style_guides FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own style guides"
    ON public.style_guides FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own style guides"
    ON public.style_guides FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own style guides"
    ON public.style_guides FOR DELETE
    USING (auth.uid() = user_id);

-- Storyboards RLS
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own storyboards"
    ON public.storyboards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own storyboards"
    ON public.storyboards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storyboards"
    ON public.storyboards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storyboards"
    ON public.storyboards FOR DELETE
    USING (auth.uid() = user_id);

-- Storyboard Characters RLS
ALTER TABLE public.storyboard_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view characters from their own storyboards"
    ON public.storyboard_characters FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_characters.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create characters in their own storyboards"
    ON public.storyboard_characters FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_characters.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update characters in their own storyboards"
    ON public.storyboard_characters FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_characters.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete characters from their own storyboards"
    ON public.storyboard_characters FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_characters.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

-- Storyboard Locations RLS
ALTER TABLE public.storyboard_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations from their own storyboards"
    ON public.storyboard_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_locations.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create locations in their own storyboards"
    ON public.storyboard_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_locations.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update locations in their own storyboards"
    ON public.storyboard_locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_locations.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete locations from their own storyboards"
    ON public.storyboard_locations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_locations.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

-- Storyboard Shots RLS
ALTER TABLE public.storyboard_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shots from their own storyboards"
    ON public.storyboard_shots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create shots in their own storyboards"
    ON public.storyboard_shots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shots in their own storyboards"
    ON public.storyboard_shots FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shots from their own storyboards"
    ON public.storyboard_shots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = storyboard_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

-- Contact Sheet Variants RLS
ALTER TABLE public.contact_sheet_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact sheet variants from their own shots"
    ON public.contact_sheet_variants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboard_shots ss
            JOIN public.storyboards s ON s.id = ss.storyboard_id
            WHERE ss.id = contact_sheet_variants.storyboard_shot_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create contact sheet variants in their own shots"
    ON public.contact_sheet_variants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.storyboard_shots ss
            JOIN public.storyboards s ON s.id = ss.storyboard_id
            WHERE ss.id = contact_sheet_variants.storyboard_shot_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update contact sheet variants in their own shots"
    ON public.contact_sheet_variants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboard_shots ss
            JOIN public.storyboards s ON s.id = ss.storyboard_id
            WHERE ss.id = contact_sheet_variants.storyboard_shot_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete contact sheet variants from their own shots"
    ON public.contact_sheet_variants FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboard_shots ss
            JOIN public.storyboards s ON s.id = ss.storyboard_id
            WHERE ss.id = contact_sheet_variants.storyboard_shot_id
            AND s.user_id = auth.uid()
        )
    );

-- B-Roll Shots RLS
ALTER TABLE public.broll_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view B-roll from their own storyboards"
    ON public.broll_shots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = broll_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create B-roll in their own storyboards"
    ON public.broll_shots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = broll_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update B-roll in their own storyboards"
    ON public.broll_shots FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = broll_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete B-roll from their own storyboards"
    ON public.broll_shots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.storyboards
            WHERE storyboards.id = broll_shots.storyboard_id
            AND storyboards.user_id = auth.uid()
        )
    );

-- Storyboard Generation Queue RLS
ALTER TABLE public.storyboard_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own storyboard generation queues"
    ON public.storyboard_generation_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own storyboard generation queues"
    ON public.storyboard_generation_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storyboard generation queues"
    ON public.storyboard_generation_queue FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own storyboard generation queues"
    ON public.storyboard_generation_queue FOR DELETE
    USING (auth.uid() = user_id);

-- Triggers for auto-updating updated_at timestamps
-- Note: update_updated_at_column() function already exists from story_creator migration

CREATE TRIGGER update_llm_settings_updated_at
    BEFORE UPDATE ON public.llm_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_style_guides_updated_at
    BEFORE UPDATE ON public.style_guides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storyboards_updated_at
    BEFORE UPDATE ON public.storyboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storyboard_characters_updated_at
    BEFORE UPDATE ON public.storyboard_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storyboard_locations_updated_at
    BEFORE UPDATE ON public.storyboard_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storyboard_shots_updated_at
    BEFORE UPDATE ON public.storyboard_shots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_broll_shots_updated_at
    BEFORE UPDATE ON public.broll_shots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_storyboard_gen_queue_updated_at
    BEFORE UPDATE ON public.storyboard_generation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
