-- ============================================================================
-- Abuse Prevention Schema
-- Track IPs and detect multi-account abuse for free credits
-- ============================================================================

-- Track user IPs when they receive free credits
CREATE TABLE IF NOT EXISTS public.user_signup_ips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    received_free_credits BOOLEAN DEFAULT TRUE,
    credits_granted INTEGER DEFAULT 0,
    flagged_as_abuse BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Index for IP lookups (to check if IP already claimed free credits)
CREATE INDEX IF NOT EXISTS idx_user_signup_ips_ip ON public.user_signup_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_signup_ips_flagged ON public.user_signup_ips(flagged_as_abuse) WHERE flagged_as_abuse = TRUE;

-- Abuse flags table for admin review
CREATE TABLE IF NOT EXISTS public.abuse_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('multi_account_ip', 'rapid_signup', 'vpn_detected', 'suspicious_pattern', 'manual')),
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_abuse_flags_user ON public.abuse_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_flags_unresolved ON public.abuse_flags(resolved) WHERE resolved = FALSE;

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.user_signup_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_flags ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables (server-side only)
-- No policies = no access via anon/authenticated key, only service role

-- ============================================================================
-- Functions
-- ============================================================================

-- Check if an IP has already claimed free credits
CREATE OR REPLACE FUNCTION check_ip_abuse(p_ip_address TEXT)
RETURNS TABLE (
    is_suspicious BOOLEAN,
    existing_users INTEGER,
    user_ids UUID[],
    recommendation TEXT
) AS $$
DECLARE
    user_count INTEGER;
    existing_user_ids UUID[];
BEGIN
    -- Count users who got free credits from this IP
    SELECT COUNT(*), ARRAY_AGG(user_id)
    INTO user_count, existing_user_ids
    FROM public.user_signup_ips
    WHERE ip_address = p_ip_address
      AND received_free_credits = TRUE;

    -- Determine recommendation
    IF user_count = 0 THEN
        RETURN QUERY SELECT FALSE, 0, ARRAY[]::UUID[], 'allow_full_credits'::TEXT;
    ELSIF user_count = 1 THEN
        RETURN QUERY SELECT TRUE, 1, existing_user_ids, 'allow_reduced_credits'::TEXT;
    ELSIF user_count >= 2 THEN
        RETURN QUERY SELECT TRUE, user_count, existing_user_ids, 'deny_free_credits'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record signup IP and optionally create abuse flag
CREATE OR REPLACE FUNCTION record_signup_ip(
    p_user_id UUID,
    p_ip_address TEXT,
    p_user_agent TEXT DEFAULT NULL,
    p_credits_granted INTEGER DEFAULT 60
) RETURNS JSONB AS $$
DECLARE
    abuse_check RECORD;
    result JSONB;
BEGIN
    -- Check for potential abuse first
    SELECT * INTO abuse_check FROM check_ip_abuse(p_ip_address);

    -- Record the signup IP
    INSERT INTO public.user_signup_ips (user_id, ip_address, user_agent, credits_granted, flagged_as_abuse, flag_reason)
    VALUES (
        p_user_id,
        p_ip_address,
        p_user_agent,
        p_credits_granted,
        abuse_check.is_suspicious,
        CASE
            WHEN abuse_check.existing_users >= 2 THEN 'Multiple accounts from same IP'
            WHEN abuse_check.existing_users = 1 THEN 'Second account from same IP'
            ELSE NULL
        END
    )
    ON CONFLICT (user_id) DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        credits_granted = EXCLUDED.credits_granted,
        flagged_as_abuse = EXCLUDED.flagged_as_abuse,
        flag_reason = EXCLUDED.flag_reason;

    -- Create abuse flag if suspicious
    IF abuse_check.is_suspicious THEN
        INSERT INTO public.abuse_flags (
            user_id,
            flag_type,
            severity,
            description,
            metadata
        ) VALUES (
            p_user_id,
            'multi_account_ip',
            CASE
                WHEN abuse_check.existing_users >= 3 THEN 'critical'
                WHEN abuse_check.existing_users >= 2 THEN 'high'
                ELSE 'medium'
            END,
            'Multiple accounts created from IP: ' || p_ip_address,
            jsonb_build_object(
                'ip_address', p_ip_address,
                'previous_users', abuse_check.existing_users,
                'previous_user_ids', abuse_check.user_ids,
                'recommendation', abuse_check.recommendation
            )
        );
    END IF;

    result := jsonb_build_object(
        'recorded', TRUE,
        'is_suspicious', abuse_check.is_suspicious,
        'existing_users_from_ip', abuse_check.existing_users,
        'recommendation', abuse_check.recommendation,
        'credits_granted', p_credits_granted
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin function to get abuse summary
CREATE OR REPLACE FUNCTION get_abuse_summary()
RETURNS TABLE (
    total_flags INTEGER,
    unresolved_flags INTEGER,
    critical_flags INTEGER,
    flagged_ips INTEGER,
    recent_flags JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM public.abuse_flags),
        (SELECT COUNT(*)::INTEGER FROM public.abuse_flags WHERE resolved = FALSE),
        (SELECT COUNT(*)::INTEGER FROM public.abuse_flags WHERE severity = 'critical' AND resolved = FALSE),
        (SELECT COUNT(DISTINCT ip_address)::INTEGER FROM public.user_signup_ips WHERE flagged_as_abuse = TRUE),
        (SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', af.id,
                'user_id', af.user_id,
                'flag_type', af.flag_type,
                'severity', af.severity,
                'description', af.description,
                'created_at', af.created_at
            ) ORDER BY af.created_at DESC
        ), '[]'::jsonb)
        FROM (SELECT * FROM public.abuse_flags WHERE resolved = FALSE ORDER BY created_at DESC LIMIT 10) af);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
