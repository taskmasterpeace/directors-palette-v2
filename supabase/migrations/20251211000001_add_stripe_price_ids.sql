-- Add stripe_price_id column to credit_packages
ALTER TABLE credit_packages
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT UNIQUE;

-- Update existing packages with Stripe Price IDs
-- These are the LIVE price IDs from the Directors Palette Stripe account
UPDATE credit_packages
SET stripe_price_id = 'price_1SdEisK3BQWwUpL0jaKeh09j'
WHERE name = 'Starter Pack';

UPDATE credit_packages
SET stripe_price_id = 'price_1SdEjzK3BQWwUpL09vLkpknK'
WHERE name = 'Creator Pack';

UPDATE credit_packages
SET stripe_price_id = 'price_1SdEkNK3BQWwUpL06jA4pcEY'
WHERE name = 'Pro Pack';

UPDATE credit_packages
SET stripe_price_id = 'price_1SdEkiK3BQWwUpL08QDluW6h'
WHERE name = 'Studio Pack';
