# Figurine Studio - Design Document

## Overview

Turn any character image into a physical 3D-printed figurine, ordered and shipped directly from the app. Users spend credits for both 3D model generation and physical printing/shipping.

## Pipeline

```
Character Image → Background Removal → 3D Model (GLB) → 3D Viewer → Material Selection → Shipping Address → Order Placed → Figurine Delivered
```

## Technology Stack

### 3D Model Generation
- **Model**: `firtoz/trellis` on Replicate
- **Cost**: ~$0.046/run (~33 seconds)
- **Input**: Single PNG/JPEG image (clean subject, solid/removed background)
- **Output**: GLB file with textures
- **Parameters**: `texture_size: 1024`, `mesh_simplify: 0.95`, `ss_sampling_steps: 12`, `slat_sampling_steps: 12`

### 3D Printing Fulfillment
- **Provider**: Shapeways API
- **Auth**: OAuth2 Bearer token
- **Flow**: Upload model → Get materials/pricing → Place order with shipping
- **Fee**: 5% per transaction (Shapeways) + our markup
- **Materials**: 90+ options (Full Color Sandstone best for figurines)
- **Shipping**: Multiple options, 2-4 weeks typical

### In-Browser 3D Viewer
- **Library**: `<model-viewer>` web component (Google, lightweight, no Three.js needed)
- **Features**: Rotate, zoom, auto-rotate, AR preview on mobile

## Credit Pricing

| Action | Our Cost | User Price (Credits) |
|--------|----------|---------------------|
| Generate 3D Model | $0.05 | 25 credits ($0.25) |
| Order Figurine (small, sandstone) | ~$15-25 | 3500 credits ($35) |
| Order Figurine (medium, color) | ~$25-45 | 6000 credits ($60) |
| Shipping | varies | pass-through + 500 credits |

*Note: Exact Shapeways pricing depends on model volume and material. We query their API for real-time quotes.*

## API Endpoints

### POST `/api/figurine/generate-3d`
Generate a 3D model from an image.
- Input: `{ imageUrl: string }` (gallery image URL)
- Process: Download image → upload to Replicate → run trellis → download GLB → store in R2
- Output: `{ glbUrl: string, predictionId: string }`
- Credits: 25 deducted on success

### POST `/api/figurine/get-quote`
Get printing quote from Shapeways.
- Input: `{ glbUrl: string, materialId?: string }`
- Process: Upload GLB to Shapeways → get pricing for available materials
- Output: `{ materials: [{ id, name, price, priceCredits, thumbnail }] }`
- Credits: None (free to quote)

### POST `/api/figurine/place-order`
Place a physical printing order.
- Input: `{ modelId: string, materialId: string, quantity: number, shipping: { name, address, city, state, zip, country, phone } }`
- Process: Place Shapeways order → deduct credits → save order record
- Output: `{ orderId: string, estimatedDelivery: string, creditsCharged: number }`
- Credits: Quoted amount deducted

### GET `/api/figurine/orders`
List user's figurine orders with status.

## Database

### `figurine_orders` table
```sql
CREATE TABLE figurine_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  gallery_id UUID REFERENCES gallery(id),
  glb_url TEXT NOT NULL,
  glb_storage_path TEXT,
  shapeways_model_id TEXT,
  shapeways_order_id TEXT,
  material_id TEXT,
  material_name TEXT,
  status TEXT DEFAULT 'pending', -- pending, model_uploaded, quoted, ordered, in_production, shipped, delivered
  credits_charged INTEGER DEFAULT 0,
  shapeways_cost_cents INTEGER,
  shipping_address JSONB,
  tracking_number TEXT,
  estimated_delivery TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## UI Flow

### Entry Points
1. **Gallery image context menu** → "Make Figurine" option
2. **New "Figurine Studio" nav item** → upload or select existing image

### Screens
1. **Image Selection** — pick from gallery or upload new character image
2. **3D Generation** — progress indicator → 3D model viewer loads with rotate/zoom
3. **Material Picker** — grid of material options with prices in credits
4. **Shipping Form** — name, address, phone
5. **Order Confirmation** — summary with total credits, confirm button
6. **Order Tracking** — list of orders with status badges

### 3D Viewer Component
- `<model-viewer>` web component
- Auto-rotate on load
- Touch/mouse drag to rotate
- Pinch/scroll to zoom
- Download GLB button
- "Order Print" CTA button

## Feature Location
```
src/features/figurine-studio/
  components/
    FigurineStudio.tsx          — main page component
    ModelViewer.tsx              — 3D GLB viewer
    MaterialPicker.tsx          — material selection grid
    ShippingForm.tsx             — address form
    OrderConfirmation.tsx        — order summary
    OrderList.tsx                — order history
    GenerateProgress.tsx         — 3D generation progress
  services/
    figurine.service.ts          — API client
    shapeways.service.ts         — Shapeways API wrapper
  hooks/
    useFigurineStore.ts          — Zustand store
  types/
    figurine.types.ts
```

## Phase Plan

### Phase 1: 3D Model Generation + Viewer (MVP)
- Trellis integration on Replicate
- GLB storage in R2
- In-browser 3D viewer with model-viewer
- Credit deduction for generation
- "Make Figurine" button in gallery

### Phase 2: Physical Printing
- Shapeways API integration
- Material selection with live pricing
- Shipping address collection
- Order placement and tracking
- Credit-based payment with markup

### Phase 3: Polish
- Order status webhooks from Shapeways
- Email notifications
- Landing page section
- Plush toy / doll providers (future)
