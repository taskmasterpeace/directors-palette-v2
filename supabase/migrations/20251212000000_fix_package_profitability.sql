-- ============================================================================
-- FIX: Package Profitability - $X.99 Pricing for 42% Margins
-- Date: December 12, 2025
-- ============================================================================

-- Clear existing packages and recreate with profitable structure
DELETE FROM public.credit_packages;

-- New packages: 42% margin with psychological pricing ($X.99)
-- Nice round token numbers, better margins
--
-- Starter: $5.99 = 500 tokens = 25 images = $3.50 cost = $2.49 profit (42%)
-- Creator: $11.99 = 1000 tokens = 50 images = $7.00 cost = $4.99 profit (42%)
-- Pro: $23.99 = 2000 tokens = 100 images = $14.00 cost = $9.99 profit (42%)
-- Studio: $47.99 = 4000 tokens = 200 images = $28.00 cost = $19.99 profit (42%)

INSERT INTO public.credit_packages (id, name, credits, price_cents, bonus_credits, stripe_price_id, is_active, sort_order) VALUES
    (gen_random_uuid(), 'Starter Pack', 500, 599, 0, NULL, true, 1),
    (gen_random_uuid(), 'Creator Pack', 1000, 1199, 0, NULL, true, 2),
    (gen_random_uuid(), 'Pro Pack', 2000, 2399, 0, NULL, true, 3),
    (gen_random_uuid(), 'Studio Pack', 4000, 4799, 0, NULL, true, 4);

-- ============================================================================
-- PROFITABILITY BREAKDOWN (42% Margins):
-- ============================================================================
--
-- Starter Pack: $5.99 = 500 tokens
--   - 25 images possible (500 ÷ 20 tokens per image)
--   - Your cost: 25 × $0.14 = $3.50
--   - Your profit: $2.49 (42% margin)
--
-- Creator Pack: $11.99 = 1000 tokens
--   - 50 images possible
--   - Your cost: 50 × $0.14 = $7.00
--   - Your profit: $4.99 (42% margin)
--
-- Pro Pack: $23.99 = 2000 tokens
--   - 100 images possible
--   - Your cost: 100 × $0.14 = $14.00
--   - Your profit: $9.99 (42% margin)
--
-- Studio Pack: $47.99 = 4000 tokens
--   - 200 images possible
--   - Your cost: 200 × $0.14 = $28.00
--   - Your profit: $19.99 (42% margin)
--
-- ============================================================================
-- STRIPE SETUP REQUIRED:
-- After creating products in Stripe Dashboard, update with Price IDs:
--
-- UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Starter Pack';
-- UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Creator Pack';
-- UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Pro Pack';
-- UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Studio Pack';
-- ============================================================================
