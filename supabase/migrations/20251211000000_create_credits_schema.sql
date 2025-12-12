-- ============================================================================
-- Credits/Points System Schema
-- Allows users to purchase credits and use them for AI generations
-- ============================================================================

-- User Credits Balance Table
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,  -- Credits in cents (100 = $1.00)
    lifetime_purchased INTEGER NOT NULL DEFAULT 0,  -- Total ever purchased
    lifetime_used INTEGER NOT NULL DEFAULT 0,  -- Total ever used
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Credit Transactions History
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'bonus', 'adjustment')),
    amount INTEGER NOT NULL,  -- Positive for additions, negative for deductions
    balance_after INTEGER NOT NULL,  -- Balance after this transaction
    description TEXT,  -- e.g., "Image generation - Nano Banana Pro"
    metadata JSONB DEFAULT '{}'::jsonb,  -- Additional data (model used, prediction_id, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit Packages (for purchasing)
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,  -- Amount of credits in cents
    price_cents INTEGER NOT NULL,  -- Price in USD cents
    bonus_credits INTEGER NOT NULL DEFAULT 0,  -- Extra bonus credits
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Model Pricing Configuration
CREATE TABLE IF NOT EXISTS public.model_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id TEXT NOT NULL UNIQUE,  -- e.g., "wavespeed-ai/wan-2.1"
    model_name TEXT NOT NULL,  -- e.g., "Nano Banana Pro"
    provider TEXT NOT NULL,  -- e.g., "replicate"
    generation_type TEXT NOT NULL CHECK (generation_type IN ('image', 'video', 'audio', 'text')),
    cost_cents INTEGER NOT NULL,  -- Our cost per generation (e.g., 15 for $0.15)
    price_cents INTEGER NOT NULL,  -- What we charge user (e.g., 20 for $0.20)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;

-- User Credits: Users can only see/manage their own credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.user_credits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.user_credits
    FOR UPDATE USING (auth.uid() = user_id);

-- Credit Transactions: Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.credit_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Credit Packages: Everyone can read active packages
CREATE POLICY "Anyone can view active packages" ON public.credit_packages
    FOR SELECT USING (is_active = TRUE);

-- Model Pricing: Everyone can read active pricing
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
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credits_updated_at
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at
    BEFORE UPDATE ON public.credit_packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_pricing_updated_at
    BEFORE UPDATE ON public.model_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data: Default Credit Packages
-- ============================================================================

INSERT INTO public.credit_packages (name, credits, price_cents, bonus_credits, sort_order) VALUES
    ('Starter Pack', 500, 500, 0, 1),      -- $5 = 500 credits ($0.05 each = 25 images at 20c)
    ('Creator Pack', 1200, 1000, 200, 2),  -- $10 = 1200 credits (20% bonus)
    ('Pro Pack', 2750, 2000, 750, 3),      -- $20 = 2750 credits (37.5% bonus)
    ('Studio Pack', 6000, 4000, 2000, 4)   -- $40 = 6000 credits (50% bonus)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Seed Data: Default Model Pricing
-- ============================================================================

INSERT INTO public.model_pricing (model_id, model_name, provider, generation_type, cost_cents, price_cents) VALUES
    -- Image Models
    ('wavespeed-ai/wan-2.1', 'Nano Banana Pro', 'replicate', 'image', 15, 20),
    ('black-forest-labs/flux-1.1-pro', 'Flux 1.1 Pro', 'replicate', 'image', 4, 6),
    ('black-forest-labs/flux-schnell', 'Flux Schnell', 'replicate', 'image', 1, 2),
    ('stability-ai/sdxl', 'SDXL', 'replicate', 'image', 2, 4),

    -- Video Models
    ('minimax/video-01', 'MiniMax Video-01', 'replicate', 'video', 25, 35),
    ('luma/ray', 'Luma Dream Machine', 'replicate', 'video', 30, 40),

    -- Character Sheet (uses Nano Banana)
    ('character-sheet', 'Character Sheet (2-sided)', 'internal', 'image', 30, 40)
ON CONFLICT (model_id) DO UPDATE SET
    cost_cents = EXCLUDED.cost_cents,
    price_cents = EXCLUDED.price_cents,
    updated_at = NOW();
