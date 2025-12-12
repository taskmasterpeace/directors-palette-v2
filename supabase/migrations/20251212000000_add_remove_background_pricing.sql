-- ============================================================================
-- ADD: Background Removal Tool Pricing
-- Cost: ~2 cents, Charge: 3 points (50% margin)
-- ============================================================================

INSERT INTO public.model_pricing (model_id, model_name, provider, generation_type, cost_cents, price_cents)
VALUES ('remove-background', 'Remove Background', 'replicate', 'tool', 2, 3)
ON CONFLICT (model_id) DO UPDATE SET
    cost_cents = EXCLUDED.cost_cents,
    price_cents = EXCLUDED.price_cents;

-- ============================================================================
-- PRICING SUMMARY (Updated):
--
-- IMAGE MODELS:
--   Nano Banana:     6 pts/image   (~$0.04 cost, 50% margin)
--   Nano Banana Pro: 20 pts/image  (~$0.14 cost, 43% margin)
--
-- VIDEO MODELS:
--   Seedance Lite:   30 pts/video  (~$0.20 cost, 50% margin)
--   Seedance Pro:    50 pts/video  (~$0.35 cost, 43% margin)
--
-- TOOLS:
--   Remove Background: 3 pts      (~$0.02 cost, 50% margin)
--
-- SPECIAL:
--   Character Sheet: 40 pts (2 images, ~$0.30 cost)
--
-- ============================================================================
