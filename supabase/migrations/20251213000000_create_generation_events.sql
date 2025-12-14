-- Generation Events Table & Admin Fix Migration
-- Purpose: Track ALL generations (including admin) for analytics dashboard

-- ============================================
-- 0. ENSURE ADMIN ACCESS
-- ============================================
INSERT INTO public.admin_users (email, name, permissions)
VALUES ('taskmasterpeace@gmail.com', 'Task Master', '{"full_access": true, "can_grant_credits": true, "can_manage_users": true}'::jsonb)
ON CONFLICT (email) DO UPDATE SET
    permissions = '{"full_access": true, "can_grant_credits": true, "can_manage_users": true}'::jsonb,
    updated_at = NOW();

-- ============================================
-- 1. GENERATION EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.generation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT,
    gallery_id UUID REFERENCES public.gallery(id) ON DELETE SET NULL,
    prediction_id TEXT,
    generation_type TEXT NOT NULL DEFAULT 'image',
    model_id TEXT NOT NULL,
    model_name TEXT,
    status TEXT DEFAULT 'pending',
    credits_cost INTEGER DEFAULT 0,
    is_admin_generation BOOLEAN DEFAULT false,
    prompt TEXT,
    settings JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- 2. INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_generation_events_user_created ON public.generation_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_events_created ON public.generation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_events_model ON public.generation_events(model_id);
CREATE INDEX IF NOT EXISTS idx_generation_events_status ON public.generation_events(status);
CREATE INDEX IF NOT EXISTS idx_generation_events_prediction ON public.generation_events(prediction_id);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.generation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all generation events"
    ON public.generation_events FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt() ->> 'email'));

CREATE POLICY "Users can read own generation events"
    ON public.generation_events FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can insert generation events"
    ON public.generation_events FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service role can update generation events"
    ON public.generation_events FOR UPDATE TO service_role
    USING (true);
