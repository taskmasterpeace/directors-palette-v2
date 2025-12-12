-- ============================================================================
-- UPDATE: Model Pricing - Sync with actual models in use
-- Run this to update model_pricing table with correct models
-- ============================================================================

-- Clear old/incorrect model pricing
DELETE FROM public.model_pricing;

-- Insert ACTUAL models used by Directors Palette
-- cost_cents = our cost from Replicate
-- price_cents = what we charge users (points)
INSERT INTO public.model_pricing (model_id, model_name, provider, generation_type, cost_cents, price_cents) VALUES
    -- Image models (Nano Banana family only)
    ('google/nano-banana', 'Nano Banana', 'replicate', 'image', 4, 6),
    ('google/nano-banana-pro', 'Nano Banana Pro', 'replicate', 'image', 14, 20),

    -- Video models (Seedance family)
    ('bytedance/seedance-1-lite', 'Seedance Lite', 'replicate', 'video', 20, 30),
    ('bytedance/seedance-1-pro', 'Seedance Pro', 'replicate', 'video', 35, 50),

    -- Special internal features
    ('character-sheet', 'Character Sheet (2-sided)', 'internal', 'image', 30, 40);

-- ============================================================================
-- PRICING SUMMARY:
--
-- IMAGE MODELS:
--   Nano Banana:     6 pts/image   (~$0.04 cost, 50% margin)
--   Nano Banana Pro: 20 pts/image  (~$0.14 cost, 43% margin)
--
-- VIDEO MODELS:
--   Seedance Lite:   30 pts/video  (~$0.20 cost, 50% margin)
--   Seedance Pro:    50 pts/video  (~$0.35 cost, 43% margin)
--
-- SPECIAL:
--   Character Sheet: 40 pts (2 images, ~$0.30 cost)
--
-- ============================================================================
