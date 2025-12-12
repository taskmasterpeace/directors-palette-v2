-- ============================================================================
-- FIX: Credits Schema - Add missing columns if they don't exist
-- Run this if you get "Could not find the 'balance' column" error
-- ============================================================================

-- Check if table exists and has wrong schema, recreate if needed
DO $$
BEGIN
    -- If user_credits exists but is missing balance column, drop and recreate
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_credits'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_credits' AND column_name = 'balance'
    ) THEN
        -- Drop dependent objects first
        DROP TABLE IF EXISTS public.user_credits CASCADE;
    END IF;
END $$;

-- Create user_credits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create credit_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create credit_packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    bonus_credits INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create model_pricing table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.model_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id TEXT NOT NULL UNIQUE,
    model_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    generation_type TEXT NOT NULL CHECK (generation_type IN ('image', 'video', 'audio', 'text')),
    cost_cents INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Enable RLS (will skip if already enabled)
-- ============================================================================

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Drop existing policies and recreate them
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.credit_packages;
DROP POLICY IF EXISTS "Anyone can view active pricing" ON public.model_pricing;

-- User Credits policies
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Credit Transactions policies
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit Packages policies (public read)
CREATE POLICY "Anyone can view active packages" ON public.credit_packages
    FOR SELECT USING (is_active = TRUE);

-- Model Pricing policies (public read)
CREATE POLICY "Anyone can view active pricing" ON public.model_pricing
    FOR SELECT USING (is_active = TRUE);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_pricing_model_id ON public.model_pricing(model_id);

-- ============================================================================
-- Triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credit_packages_updated_at ON public.credit_packages;
CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON public.credit_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_model_pricing_updated_at ON public.model_pricing;
CREATE TRIGGER update_model_pricing_updated_at
    BEFORE UPDATE ON public.model_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data (if tables were recreated)
-- ============================================================================

INSERT INTO public.credit_packages (name, credits, price_cents, bonus_credits, sort_order) VALUES
    ('Starter Pack', 500, 500, 0, 1),
    ('Creator Pack', 1200, 1000, 200, 2),
    ('Pro Pack', 2750, 2000, 750, 3),
    ('Studio Pack', 6000, 4000, 2000, 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.model_pricing (model_id, model_name, provider, generation_type, cost_cents, price_cents) VALUES
    ('wavespeed-ai/wan-2.1', 'Nano Banana Pro', 'replicate', 'image', 15, 20),
    ('black-forest-labs/flux-1.1-pro', 'Flux 1.1 Pro', 'replicate', 'image', 4, 6),
    ('black-forest-labs/flux-schnell', 'Flux Schnell', 'replicate', 'image', 1, 2),
    ('stability-ai/sdxl', 'SDXL', 'replicate', 'image', 2, 4),
    ('minimax/video-01', 'MiniMax Video-01', 'replicate', 'video', 25, 35),
    ('luma/ray', 'Luma Dream Machine', 'replicate', 'video', 30, 40),
    ('character-sheet', 'Character Sheet (2-sided)', 'internal', 'image', 30, 40)
ON CONFLICT (model_id) DO UPDATE SET
    cost_cents = EXCLUDED.cost_cents,
    price_cents = EXCLUDED.price_cents,
    updated_at = NOW();

-- ============================================================================
-- Done! The credits system should now work properly.
-- ============================================================================
