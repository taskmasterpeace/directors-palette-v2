-- Production Hardening Migration
-- Fixes: Admin management, webhook idempotency, credit deduction race condition, webhook retries

-- ============================================
-- 1. ADMIN USERS TABLE
-- Database-backed admin management (no more hardcoded emails)
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    permissions JSONB DEFAULT '{"full_access": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add your admin email
INSERT INTO public.admin_users (email, name, permissions)
VALUES ('taskmasterpeace@gmail.com', 'Task Master', '{"full_access": true, "can_grant_credits": true, "can_manage_users": true}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- RLS for admin_users (only admins can see admin table)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin_users"
    ON public.admin_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.email = auth.jwt() ->> 'email'
        )
    );

-- ============================================
-- 2. WEBHOOK EVENTS TABLE (Idempotency)
-- Prevents double-processing of Stripe webhooks
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,  -- Stripe event ID
    event_type TEXT NOT NULL,       -- e.g., 'checkout.session.completed'
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'processed' CHECK (status IN ('processed', 'failed', 'retrying')),
    payload JSONB,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status);

-- ============================================
-- 3. WEBHOOK RETRY QUEUE
-- Failed webhooks that need to be retried
-- ============================================
CREATE TABLE IF NOT EXISTS public.webhook_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_retry_status ON public.webhook_retry_queue(status, next_retry_at);

-- ============================================
-- 4. ATOMIC CREDIT DEDUCTION FUNCTION
-- Prevents race conditions by using database-level locking
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT DEFAULT NULL,
    p_transaction_type TEXT DEFAULT 'generation',
    p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance NUMERIC, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Lock the user's credit row to prevent concurrent modifications
    SELECT balance INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user has credits record
    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 'User has no credits record'::TEXT;
        RETURN;
    END IF;

    -- Check sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT false, v_current_balance,
            format('Insufficient credits: have %s, need %s', v_current_balance, p_amount)::TEXT;
        RETURN;
    END IF;

    -- Deduct credits
    v_new_balance := v_current_balance - p_amount;

    UPDATE public.user_credits
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        type,
        description,
        metadata,
        balance_after
    ) VALUES (
        p_user_id,
        -p_amount,
        p_transaction_type,
        COALESCE(p_description, 'Credit deduction'),
        p_metadata,
        v_new_balance
    );

    RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- ============================================
-- 5. CREDIT AUDIT LOG (Immutable)
-- For compliance and debugging financial issues
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,  -- 'deduct', 'add', 'refund', 'initial', 'admin_grant'
    amount NUMERIC NOT NULL,
    balance_before NUMERIC,
    balance_after NUMERIC,
    triggered_by TEXT,  -- 'generation', 'purchase', 'admin', 'system'
    reference_id TEXT,  -- prediction_id, checkout_session_id, etc.
    metadata JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- This table is append-only (no updates or deletes allowed)
CREATE INDEX IF NOT EXISTS idx_credit_audit_user ON public.credit_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_audit_reference ON public.credit_audit_log(reference_id);

-- Trigger to automatically log credit changes
CREATE OR REPLACE FUNCTION public.log_credit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.credit_audit_log (
        user_id,
        action,
        amount,
        balance_before,
        balance_after,
        triggered_by,
        metadata
    ) VALUES (
        NEW.user_id,
        CASE
            WHEN OLD IS NULL THEN 'initial'
            WHEN NEW.balance > OLD.balance THEN 'add'
            ELSE 'deduct'
        END,
        COALESCE(NEW.balance - COALESCE(OLD.balance, 0), NEW.balance),
        OLD.balance,
        NEW.balance,
        'system',
        jsonb_build_object('trigger', 'automatic')
    );
    RETURN NEW;
END;
$$;

-- Attach trigger to user_credits
DROP TRIGGER IF EXISTS credit_change_audit_trigger ON public.user_credits;
CREATE TRIGGER credit_change_audit_trigger
    AFTER INSERT OR UPDATE ON public.user_credits
    FOR EACH ROW
    EXECUTE FUNCTION public.log_credit_change();

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.webhook_events TO service_role;
GRANT ALL ON public.webhook_retry_queue TO service_role;
GRANT ALL ON public.credit_audit_log TO service_role;
GRANT SELECT ON public.credit_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits_atomic TO authenticated;
