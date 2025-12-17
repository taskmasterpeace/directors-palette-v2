-- Fix deduct_credits_atomic to also update lifetime_used

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
    v_current_lifetime_used NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Lock the user's credit row to prevent concurrent modifications
    SELECT balance, lifetime_used INTO v_current_balance, v_current_lifetime_used
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

    -- Deduct credits AND update lifetime_used
    v_new_balance := v_current_balance - p_amount;

    UPDATE public.user_credits
    SET balance = v_new_balance,
        lifetime_used = COALESCE(v_current_lifetime_used, 0) + p_amount,
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
        COALESCE(p_metadata, '{}'::JSONB),
        v_new_balance
    );

    RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

-- Also fix existing data: calculate lifetime_used from balance and lifetime_purchased
-- lifetime_used should be: lifetime_purchased - balance
UPDATE public.user_credits
SET lifetime_used = GREATEST(0, lifetime_purchased - balance)
WHERE lifetime_used = 0 AND balance < lifetime_purchased;
