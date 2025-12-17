-- Video Model Pricing Migration
-- Date: 2025-12-17
-- Purpose: Add video model pricing for credit deduction system

-- Video Model Pricing (per-second at 720p base for per-second models)
-- Points = cents (1 point = 1 cent)

INSERT INTO public.model_pricing (model_id, model_name, provider, generation_type, cost_cents, price_cents) VALUES
-- Ultra Budget: WAN 2.2-5B Fast (per video, ~4 sec @ 720p)
-- Our cost: 2.5¢, Charge: 4 pts, Margin: 60%
('wan-2.2-5b-fast', 'WAN 2.2-5B Fast', 'replicate', 'video', 3, 4),

-- Budget+: WAN 2.2 I2V Fast (per video, 5 sec @ 720p) - has last frame!
-- Our cost: 11¢, Charge: 16 pts, Margin: 45%
('wan-2.2-i2v-fast', 'WAN 2.2 I2V Fast', 'replicate', 'video', 11, 16),

-- Standard: Seedance Pro Fast (per second @ 720p)
-- Our cost: 2.5¢/sec, Charge: 4 pts/sec, Margin: 44%
('seedance-pro-fast', 'Seedance Pro Fast', 'replicate', 'video', 3, 4),

-- Featured: Seedance Lite (per second @ 720p) - has last frame + ref images (1-4)!
-- Our cost: 3.6¢/sec, Charge: 5 pts/sec, Margin: 44%
('seedance-lite', 'Seedance Lite', 'replicate', 'video', 4, 5),

-- Premium: Kling 2.5 Turbo Pro (per second)
-- Our cost: 7¢/sec, Charge: 10 pts/sec, Margin: 43%
('kling-2.5-turbo-pro', 'Kling 2.5 Turbo Pro', 'replicate', 'video', 7, 10)

ON CONFLICT (model_id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  cost_cents = EXCLUDED.cost_cents,
  price_cents = EXCLUDED.price_cents,
  provider = EXCLUDED.provider,
  generation_type = EXCLUDED.generation_type;

-- Note: Pricing tiers by resolution (for UI display reference):
--
-- WAN 2.2-5B Fast (per video):
--   480p: 1 pt | 720p: 1 pt | Max: 4 sec
--
-- WAN 2.2 I2V Fast (per video):
--   480p: 2 pts | 720p: 3 pts | Max: 5 sec | Has: Last Frame
--
-- Seedance Pro Fast (per second):
--   480p: 2 pts | 720p: 4 pts | 1080p: 9 pts | Max: 12 sec
--
-- Seedance Lite (per second):
--   480p: 3 pts | 720p: 5 pts | 1080p: 11 pts | Max: 12 sec | Has: Last Frame, Ref Images (1-4)
--
-- Kling 2.5 Turbo Pro (per second):
--   720p: 10 pts | Max: 10 sec
