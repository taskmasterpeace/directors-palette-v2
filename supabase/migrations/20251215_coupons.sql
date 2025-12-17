-- Migration: Create Coupon System Tables

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    points INTEGER NOT NULL CHECK (points > 0),
    max_uses INTEGER, -- NULL means unlimited
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Create coupon_redemptions table
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(coupon_id, user_id) -- Enforce one-time use per user
);

-- 3. RLS Policies
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Admins can read/write coupons
CREATE POLICY "Admins can manage coupons" ON public.coupons
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.email())
    );

-- Admins can view redemptions
CREATE POLICY "Admins can view redemptions" ON public.coupon_redemptions
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.email())
    );

-- Users can view coupons only via strict backend checks (or if we expose public ones?)
-- For now, let's keep coupons private and only accessible via the function below.
-- Actually, we might need a policy for the "admin dashboard" list.

-- 4. Function to redeem coupon (Transactional)
CREATE OR REPLACE FUNCTION public.redeem_coupon(
    p_code TEXT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
    v_new_balance INTEGER;
BEGIN
    -- Locked selection to prevent race conditions
    SELECT * INTO v_coupon FROM public.coupons
    WHERE code = p_code
    FOR UPDATE;

    -- Checks
    IF v_coupon IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid code');
    END IF;

    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon is inactive');
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon expired');
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon usage limit reached');
    END IF;

    -- Check if already redeemed by user
    IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = v_coupon.id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Coupon already used by you');
    END IF;

    -- Execute Redemption
    INSERT INTO public.coupon_redemptions (coupon_id, user_id)
    VALUES (v_coupon.id, p_user_id);

    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon.id;

    -- Add Credits (using existing logic, but we do it manually here for atomicity or rely on service?)
    -- Ideally we call credit update here, but we can return success and let app handle it.
    -- Better: Update user_credits table directly here for true atomicity.
    
    INSERT INTO public.user_credits (user_id, balance, lifetime_purchased, lifetime_used)
    VALUES (p_user_id, v_coupon.points, 0, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        balance = user_credits.balance + v_coupon.points;

    -- Create Transaction Record (optional, but good for history)
    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description, metadata)
    SELECT 
        p_user_id, 
        'coupon_redemption', 
        v_coupon.points, 
        uc.balance, 
        'Redeemed code: ' || p_code,
        jsonb_build_object('coupon_id', v_coupon.id, 'code', p_code)
    FROM public.user_credits uc WHERE uc.user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'points', v_coupon.points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
