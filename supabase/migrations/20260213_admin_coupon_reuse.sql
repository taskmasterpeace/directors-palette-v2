-- Migration: Allow admins to reuse coupon codes multiple times
-- Date: 2026-02-13
--
-- Changes:
-- 1. Updates redeem_coupon() to accept p_is_admin flag
-- 2. Admins skip the per-user redemption check
-- 3. Admins still count toward used_count (for accurate tracking)
-- 4. For admin reuse, we delete the old redemption record first so the INSERT succeeds

CREATE OR REPLACE FUNCTION public.redeem_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_is_admin BOOLEAN DEFAULT false
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

    -- Check if already redeemed by user (skip for admins)
    IF NOT p_is_admin THEN
        IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = v_coupon.id AND user_id = p_user_id) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Coupon already used by you');
        END IF;
    ELSE
        -- Admin reuse: delete old redemption record so INSERT won't violate UNIQUE constraint
        DELETE FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
    END IF;

    -- Execute Redemption
    INSERT INTO public.coupon_redemptions (coupon_id, user_id)
    VALUES (v_coupon.id, p_user_id);

    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon.id;

    -- Add Credits
    INSERT INTO public.user_credits (user_id, balance, lifetime_purchased, lifetime_used)
    VALUES (p_user_id, v_coupon.points, 0, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET
        balance = user_credits.balance + v_coupon.points;

    -- Create Transaction Record
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
