-- Figurine Print Orders table
CREATE TABLE IF NOT EXISTS figurine_print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  figurine_id UUID REFERENCES figurines(id) ON DELETE SET NULL,
  shapeways_model_id TEXT,
  shapeways_order_id TEXT,
  material_id INTEGER NOT NULL,
  material_name TEXT NOT NULL,
  size_cm INTEGER NOT NULL,
  shapeways_price DECIMAL NOT NULL,
  our_price_pts INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address JSONB NOT NULL,
  dimensions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE figurine_print_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON figurine_print_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON figurine_print_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
