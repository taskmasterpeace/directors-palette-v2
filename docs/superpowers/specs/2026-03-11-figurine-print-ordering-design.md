# Figurine Print Ordering — Design Spec

## Overview

Add physical 3D printing to the Figurine Studio. Users generate a 3D model (GLB) from an image, then order a physical print via Shapeways API. Also add OBJ download support for users who want to print elsewhere.

## Decisions

- **Payment**: Points only. 30% markup on Shapeways cost converted to pts.
- **Charge timing**: Pts deducted only AFTER Shapeways order is successfully placed. Use atomic check-and-deduct in a single DB transaction to prevent race conditions.
- **Sizes**: Two options — 5cm (mini, ~2in) and 10cm (standard, ~4in).
- **Materials**: 5 curated options from Shapeways' 90+ catalog. Each material card maps to ONE default Shapeways material ID (e.g., FDM PLA → 317 White, SLS Colored → 25 Black). Color sub-picker is a v2 follow-up.
- **UI**: Modal dialog triggered from "Order Print" button on ready figurines.
- **Colors**: Cyan accents only. No purple anywhere.
- **Admin pricing**: Admins ARE charged for physical prints (real fulfillment cost).
- **GLB persistence**: GLBs must be re-hosted to Supabase Storage at generation time. Replicate URLs expire after ~1 hour. Update `generate-3d/route.ts` to download the GLB and upload to Supabase Storage before returning the URL.

## Materials

| Material | ID | Color Support | Notes |
|----------|-----|--------------|-------|
| FDM PLA (25% infill) | 315/316/317 | Single color (B/R/W) | Cheapest option |
| SLS Nylon PA12 White | 6 | White only | Strong, professional |
| SLS Nylon PA12 Colored | 25/75-78/93-95 | Dyed colors | Same quality, pick a color |
| MJF Full Color Nylon - Standard | 231 | Full texture | The showpiece |
| MJF Full Color Nylon - Smooth | 232 | Full texture | Premium finish |

### Default Material ID Mapping

Each material card maps to exactly one Shapeways ID:

| Card Label | Shapeways ID | Specific Material |
|-----------|-------------|-------------------|
| PLA Basic | 317 | FDM - PLA - White - 25% |
| Nylon White | 6 | SLS - Nylon PA12 - White |
| Nylon Black | 25 | SLS - Nylon PA12 - Black Dyed |
| Full Color Standard | 231 | MJF - Full Color Nylon PA12 - Standard |
| Full Color Smooth | 232 | MJF - Full Color Nylon PA12 - Smooth |

### Tested Pricing (10cm, 76.7cm³ volume)

| Material | Shapeways Cost | +30% Markup | Est. Pts (@100pts/$1) |
|----------|---------------|-------------|----------------------|
| FDM PLA | ~$6 | ~$7.80 | ~780 pts |
| SLS Nylon White | ~$33 | ~$42.90 | ~4,290 pts |
| SLS Nylon Colored | ~$36 | ~$46.80 | ~4,680 pts |
| Full Color Standard | ~$123 | ~$159.90 | ~15,990 pts |
| Full Color Smooth | ~$140 | ~$182.00 | ~18,200 pts |

5cm models will be significantly cheaper (roughly 1/8th the volume).

## User Flow

### Step 1 — Configure (no API call)
- User clicks "Order Print" on a ready figurine
- Modal opens with size toggle (5cm / 10cm) and material picker (5 cards)
- User selects size + material, clicks "Get Quote"

### Step 2 — Get Quote (API call)
- Backend downloads GLB from Supabase Storage (permanent URL), converts to OBJ via gltf-transform + meshoptimizer
- Simplifies to ~125K triangles (keeps under 64MB Shapeways limit)
- Uploads to Shapeways at chosen scale (50mm or 100mm)
- Backend polls Shapeways every 2s (up to 30s) until pricing is available
- Shapeways returns: exact dimensions, volume, pricing per material
- Show dimension preview (wireframe box with labeled measurements)
- Show price in pts (Shapeways cost + 30% markup, converted to pts)
- User confirms or goes back

### Step 3 — Shipping Address
- Form: first name, last name, address 1, address 2, city, state, zip, country, phone
- Validation before proceeding
- "Place Order" button with pts cost

### Step 4 — Confirmation
- Place order via Shapeways API
- On success: deduct pts, store order in DB
- Show confirmation: order ID, estimated delivery (10-14 business days)
- On failure: show error, no pts deducted

## Downloads

Existing "Download GLB" link becomes a dropdown with two options:
- **Download GLB** — Original file (existing behavior)
- **Download OBJ (Print-Ready)** — Server converts GLB → OBJ + MTL + texture.png → ZIP

## Backend

### New Service: `src/features/figurine-studio/services/shapeways.service.ts`
- `getAccessToken()` — Client Credentials OAuth, cached 50 min
- `uploadModel(objBuffer, textureBuffer, units)` — Upload base64 OBJ, return modelId + pricing
- `getModelPricing(modelId)` — Pricing per material
- `placeOrder(modelId, materialId, shippingAddress)` — Place order
- `getOrderStatus(orderId)` — Order status

### New Service: `src/features/figurine-studio/services/glb-converter.service.ts`
- `convertToObj(glbUrl, scaleMm)` — Download GLB, simplify mesh, export OBJ + MTL + texture
- Uses `@gltf-transform/core`, `@gltf-transform/functions`, `meshoptimizer`
- Simplifies from 500K → ~125K triangles
- Returns: `{ obj: Buffer, mtl: Buffer, texture: Buffer }`

### New API Routes
- `POST /api/figurine/convert-obj` — Returns ZIP of OBJ + MTL + texture. `maxDuration = 60`.
- `POST /api/figurine/print-quote` — Upload to Shapeways, poll for pricing, return dimensions + pts pricing. `maxDuration = 120`.
- `POST /api/figurine/print-order` — Place order, atomic pts deduction on success. `maxDuration = 60`.
- `GET /api/figurine/print-status/[orderId]` — Poll Shapeways on-demand, return current order status.

All print endpoints use `checkRateLimit` with a new `RATE_LIMITS.PRINT_ORDER` config (e.g., 5 quotes/min, 3 orders/hour).

### New DB Table: `figurine_print_orders`

```sql
CREATE TABLE figurine_print_orders (
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
```

Note: `figurine_id` uses `ON DELETE SET NULL` so order records survive when figurines are auto-rotated (5-record limit). Orders are permanent financial records.

### Environment Variables
```
SHAPEWAYS_CLIENT_ID=<from manage-apps>
SHAPEWAYS_CLIENT_SECRET=<from manage-apps>
```

## Frontend

### New Components (`src/features/figurine-studio/components/`)

- **`OrderPrintModal.tsx`** — Main modal with 4-step flow, step indicator, animated transitions
- **`SizeSelector.tsx`** — Two toggle cards for 5cm and 10cm
- **`MaterialPicker.tsx`** — 5 material cards with swatches, names, "Full Color" badges
- **`DimensionPreview.tsx`** — Wireframe box showing height x width x depth in cm/inches
- **`ShippingForm.tsx`** — Address form with validation

### Modified Files

- **`FigurineStudio.tsx`** — Replace "Coming Soon" section with live "Order Print" button + modal trigger. Replace placeholder material cards with real curated materials. Remove all purple/violet colors, use cyan.
- **`figurine.service.ts`** — Add `getQuote()`, `placeOrder()`, `convertToObj()`, `getOrderStatus()` methods

## Error Handling

- **Shapeways upload fails** — Error in modal, retry option. No pts charged.
- **Shapeways order fails** — Error shown, no pts charged.
- **Model not printable** — Hide incompatible materials.
- **Insufficient pts** — Show balance + deficit, link to purchase.
- **Token expiry** — Auto-refresh after 50 min (expires at 60).
- **GLB URL expired** — Replicate URLs expire. Show "Model expired, regenerate."
- **Conversion fails** — Show error, don't proceed.

## Order History

Minimal "My Orders" section at the bottom of Figurine Studio (below saved figurines):
- List of past orders with: material name, size, pts charged, status badge, date
- Status badges: Pending (yellow), In Production (cyan), Shipped (green), Cancelled (red)
- Status is fetched on-demand from Shapeways when user views the section
- No email notifications in v1.

## OBJ Download Scale

The OBJ download exports at the raw model scale (~1m bounding box from Hunyuan). A comment in the OBJ header notes "Units: meters, bounding box ~1m". Users who want a specific size for self-printing can scale in their slicer software.

## Deferred to v2

- Color sub-picker per material (e.g., pick PLA in Red/Black/White)
- Saved shipping addresses
- Email order confirmations
- Shapeways webhooks for auto-updating order status
- Shapeways model ID caching/reuse across quotes

## Technical Notes

- Hunyuan 3D outputs GLB with 1 texture (PNG, ~17MB) and ~500K triangles
- Shapeways accepts: OBJ, STL, DAE, WRL, 3MF, X3D (NOT GLB)
- For full color printing: OBJ + MTL + texture in ZIP
- Model bounding box in GLB is ~1m; we scale to 50mm or 100mm during conversion
- Shapeways max: 64MB file, 1M polygons — our simplified 125K fits easily
- Shapeways model processing takes a few seconds after upload before pricing is available
