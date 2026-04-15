-- Announcements system: global, targeted, and segmented announcements
-- with per-user dismissals and mute preferences

-- 1. Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'refund', 'feature', 'maintenance', 'warning')),
    targeting JSONB NOT NULL DEFAULT '{"type": "global"}'::jsonb,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
    created_by TEXT,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Dismissals table (tracks which users dismissed which announcements)
CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

-- 3. User preferences (mute all toggle)
CREATE TABLE IF NOT EXISTS public.announcement_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    mute_all BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_announcements_published ON public.announcements(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_announcements_expires ON public.announcements(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_dismissals_user ON public.announcement_dismissals(user_id);
CREATE INDEX idx_dismissals_announcement ON public.announcement_dismissals(announcement_id);

-- RLS policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_preferences ENABLE ROW LEVEL SECURITY;

-- Announcements: anyone authenticated can read published announcements
CREATE POLICY "Users can read published announcements"
    ON public.announcements FOR SELECT
    TO authenticated
    USING (published_at IS NOT NULL AND published_at <= now());

-- Dismissals: users can read/insert their own
CREATE POLICY "Users can read own dismissals"
    ON public.announcement_dismissals FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can dismiss announcements"
    ON public.announcement_dismissals FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Preferences: users can read/upsert their own
CREATE POLICY "Users can read own preferences"
    ON public.announcement_preferences FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
    ON public.announcement_preferences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can modify own preferences"
    ON public.announcement_preferences FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- RPC function: get announcements for current user with targeting evaluation
CREATE OR REPLACE FUNCTION public.get_user_announcements(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    title TEXT,
    body TEXT,
    type TEXT,
    priority TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    is_dismissed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_muted BOOLEAN;
    v_user_created_at TIMESTAMPTZ;
    v_has_purchased BOOLEAN;
    v_total_spend NUMERIC;
    v_balance NUMERIC;
BEGIN
    -- Check if user has muted all announcements
    SELECT mute_all INTO v_muted
    FROM public.announcement_preferences
    WHERE announcement_preferences.user_id = p_user_id;

    -- If muted, return empty (but still allow checking archive via separate call)
    IF v_muted = true THEN
        RETURN;
    END IF;

    -- Pre-fetch user data for segment evaluation
    SELECT u.created_at INTO v_user_created_at
    FROM auth.users u WHERE u.id = p_user_id;

    SELECT EXISTS(
        SELECT 1 FROM public.credit_transactions ct
        WHERE ct.user_id = p_user_id AND ct.type = 'purchase'
    ) INTO v_has_purchased;

    SELECT COALESCE(SUM(ABS(ct.amount)), 0) INTO v_total_spend
    FROM public.credit_transactions ct
    WHERE ct.user_id = p_user_id AND ct.amount < 0;

    SELECT COALESCE(uc.balance, 0) INTO v_balance
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;

    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.body,
        a.type,
        a.priority,
        a.published_at,
        a.created_at,
        (d.id IS NOT NULL) AS is_dismissed
    FROM public.announcements a
    LEFT JOIN public.announcement_dismissals d
        ON d.announcement_id = a.id AND d.user_id = p_user_id
    WHERE
        a.published_at IS NOT NULL
        AND a.published_at <= now()
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND (
            -- Global: everyone
            (a.targeting->>'type' = 'global')
            -- Targeted: specific user IDs
            OR (
                a.targeting->>'type' = 'user'
                AND a.targeting->'user_ids' ? p_user_id::text
            )
            -- Segment: evaluate filter
            OR (
                a.targeting->>'type' = 'segment'
                AND (
                    (a.targeting->>'filter' = 'has_purchased' AND v_has_purchased = true)
                    OR (a.targeting->>'filter' = 'signed_up_after' AND v_user_created_at >= (a.targeting->>'value')::timestamptz)
                    OR (a.targeting->>'filter' = 'signed_up_before' AND v_user_created_at < (a.targeting->>'value')::timestamptz)
                    OR (a.targeting->>'filter' = 'min_spend' AND v_total_spend >= (a.targeting->>'value')::numeric)
                    OR (a.targeting->>'filter' = 'min_balance' AND v_balance >= (a.targeting->>'value')::numeric)
                )
            )
        )
    ORDER BY a.published_at DESC;
END;
$$;
