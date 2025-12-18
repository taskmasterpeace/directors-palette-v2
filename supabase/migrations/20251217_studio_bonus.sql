-- ============================================================================
-- Add bonus tokens to Studio Pack to incentivize larger purchases
--
-- Current pricing (no incentive to buy bigger):
--   Starter: $5.99 = 500 tokens
--   Creator: $11.99 = 1000 tokens
--   Pro: $23.99 = 2000 tokens
--   Studio: $47.99 = 4000 tokens (same rate - no value!)
--
-- New pricing (with bonuses):
--   Starter: $5.99 = 500 tokens (no bonus)
--   Creator: $11.99 = 1100 tokens (+100 bonus, 10%)
--   Pro: $23.99 = 2300 tokens (+300 bonus, 15%)
--   Studio: $47.99 = 5000 tokens (+1000 bonus, 25%)
-- ============================================================================

-- Update packages with bonus credits
UPDATE public.credit_packages
SET bonus_credits = 0
WHERE name = 'Starter Pack';

UPDATE public.credit_packages
SET bonus_credits = 100
WHERE name = 'Creator Pack';

UPDATE public.credit_packages
SET bonus_credits = 300
WHERE name = 'Pro Pack';

UPDATE public.credit_packages
SET bonus_credits = 1000
WHERE name = 'Studio Pack';
