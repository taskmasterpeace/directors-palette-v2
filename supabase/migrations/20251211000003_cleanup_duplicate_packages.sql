-- ============================================================================
-- CLEANUP: Remove duplicate credit packages
-- Run this if you have duplicate packages from running migrations multiple times
-- ============================================================================

-- Delete all packages first, then re-insert clean data
DELETE FROM public.credit_packages;

-- Insert only 3 packages (Starter, Creator, Pro)
INSERT INTO public.credit_packages (name, credits, price_cents, bonus_credits, sort_order) VALUES
    ('Starter Pack', 500, 500, 0, 1),
    ('Creator Pack', 1200, 1000, 200, 2),
    ('Pro Pack', 2750, 2000, 750, 3);

-- Verify the cleanup
-- SELECT * FROM public.credit_packages ORDER BY sort_order;
