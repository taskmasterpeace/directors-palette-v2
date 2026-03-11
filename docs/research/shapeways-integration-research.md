# Shapeways API Integration Research

## Executive Summary

We want to let users order **physical 3D-printed figurines** from their generated models. Shapeways has a REST API that supports uploading models, selecting materials, and placing orders. The main challenge is **file format conversion** — our models are GLB (from Hunyuan 3D), but Shapeways doesn't accept GLB.

---

## Current State (Directors Palette)

- **3D Model Source**: Hunyuan 3D 3.1 via Replicate
- **Output Format**: `.glb` (binary glTF)
- **Face Count**: 500,000 polygons
- **Storage**: GLB URL stored in `figurines` table (`glb_url` column)
- **Viewer**: `@google/model-viewer` web component

---

## Shapeways API Overview

### Authentication (OAuth 2.0)

**Two flows:**

1. **Client Credentials** (our use case — app acts on behalf of our account)
   - `POST https://api.shapeways.com/oauth2/token`
   - Body: `grant_type=client_credentials`, `client_id`, `client_secret`
   - Returns access token (expires in 3600s, no refresh token)

2. **Authorization Code** (if users need their own Shapeways accounts — probably NOT our flow)
   - Redirect to `https://api.shapeways.com/oauth2/authorize`
   - Returns auth code → exchange for access + refresh tokens

**Our approach**: Client Credentials flow. We own the Shapeways account, users order through us, we place orders on their behalf.

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth2/token` | POST | Get access token |
| `/materials/v1` | GET | List all available materials with IDs and pricing |
| `/models/v1` | POST | Upload a 3D model (base64-encoded file) |
| `/models/{modelId}/v1` | GET | Get model details, printable materials, pricing per material |
| `/models/v1` | GET | List all models |
| `/models/{modelId}/v1` | DELETE | Delete a model |
| `/orders/v1` | POST | Place an order |
| `/orders/{orderId}/v1` | GET | Check order status |
| `/cart/shipping-options/v1` | GET | Get shipping options |

### Model Upload (POST `/models/v1`)

Required fields:
```json
{
  "fileName": "figurine.obj",
  "file": "<base64-encoded file>",
  "description": "Custom 3D figurine",
  "hasRightsToModel": true,
  "acceptTermsAndConditions": true
}
```

Response includes: `modelId`, printable materials list, pricing per material.

### Placing Orders (POST `/orders/v1`)

```json
{
  "items": [
    {
      "materialId": 26,
      "modelId": "abc123",
      "quantity": 1
    }
  ],
  "shippingOption": "Cheapest",
  "paymentMethod": "credit_card",
  "firstName": "...",
  "lastName": "...",
  "country": "US",
  "state": "CA",
  "city": "Los Angeles",
  "address1": "123 Main St",
  "zipCode": "90001",
  "phoneNumber": "555-0100"
}
```

**Prerequisite**: Credit card must be on file in the Shapeways account.

---

## File Format Problem

### The Gap
- **We produce**: `.glb` (binary glTF 2.0)
- **Shapeways accepts**: DAE, OBJ, STL, X3D, X3DB, X3DV, WRL, 3MF, STP, STEP
- **For full color**: DAE, WRL, X3D, X3DB, X3DV, OBJ (with textures in ZIP)
- **GLB is NOT supported**

### Conversion Options

| Option | Format | Color Support | Notes |
|--------|--------|---------------|-------|
| GLB → OBJ + MTL + textures | OBJ | Yes (full color) | Best option — preserves color via texture maps |
| GLB → STL | STL | No (geometry only) | Loses all color/texture information |
| GLB → DAE | DAE | Yes (full color) | Also preserves textures |
| GLB → WRL (VRML) | WRL | Yes (full color) | Legacy format but Shapeways supports it |

### Recommended: GLB → OBJ (with textures)

**Server-side conversion using `trimesh` (Python) or a Node.js library:**

- **Node.js**: Use `gltf-transform` library (by Don McCurdy, same author as model-viewer)
  - Can extract mesh data, textures, and convert to OBJ
  - `@gltf-transform/core` + `@gltf-transform/extensions`

- **Python**: Use `trimesh` library
  - `trimesh.load('model.glb')` → `mesh.export('model.obj')`
  - Handles textures automatically

- **Online API**: Aspose.3D REST API or Convert3D API
  - Could offload conversion but adds dependency + latency

**Best bet**: Use `gltf-transform` in Node.js since we're already a Next.js app. Or shell out to a Python script using `trimesh`.

---

## Pricing

### Shapeways Transaction Fee
- **5% per order** (default)
- Volume discounts available

### Material Pricing (Key Materials for Figurines)

| Material | Cost | Notes |
|----------|------|-------|
| **Full Color Sandstone** | ~$0.99/cm³ + $1.50 setup | Cheapest color option. Fragile. Min wall 3mm. |
| **Versatile Plastic (Nylon)** | ~$0.28/cm³ + $1.50 setup | Strong, white only. No color. |
| **Full Color Plastic** | Higher than sandstone | Better durability + color |
| **Metals** | $$$ | Steel, bronze, silver — premium options |

### Figurine Cost Estimate

A typical small figurine (~5cm tall):
- **Volume**: ~10-30 cm³ depending on complexity
- **Full Color Sandstone**: ~$11-$31 + $1.50 setup = **$12.50 - $32.50**
- **Shipping**: Included in sandstone pricing (worldwide)

### Our Markup Opportunity
- Shapeways charges us wholesale
- We can add a markup on top
- Typical approach: 20-50% markup on Shapeways base price

---

## Upload Constraints

| Constraint | Limit |
|-----------|-------|
| Max file size | 64 MB |
| Max polygons | 1,000,000 |
| Our current face count | 500,000 (within limit) |
| Min wall thickness | 3mm (for sandstone) |
| Texture files | Single PNG or JPEG |

---

## Integration Architecture

### Flow

```
User clicks "Order Print" on figurine
  → Frontend collects shipping info + material choice
  → POST /api/figurine/order-print
    → Download GLB from stored URL
    → Convert GLB → OBJ + textures (server-side)
    → Upload to Shapeways API (base64 OBJ + texture ZIP)
    → Get modelId + pricing from Shapeways
    → Show price to user for confirmation
    → On confirm: POST order to Shapeways
    → Deduct credits / charge user
    → Store order reference in our DB
    → Show order tracking
```

### Two-Step Flow (Better UX)

**Step 1: "Get Quote"**
- Upload model to Shapeways
- Get back available materials + prices
- Show user a material picker with prices

**Step 2: "Place Order"**
- User selects material, enters shipping info
- We place the order via API
- Charge user (our markup included)

### New API Routes Needed

1. `POST /api/figurine/print-quote` — Upload to Shapeways, return materials + prices
2. `POST /api/figurine/print-order` — Place order with selected material + shipping
3. `GET /api/figurine/print-status/[orderId]` — Check order status

### Database Changes

New table: `figurine_orders`
```sql
CREATE TABLE figurine_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  figurine_id UUID REFERENCES figurines(id),
  shapeways_model_id TEXT,
  shapeways_order_id TEXT,
  material_id INTEGER,
  material_name TEXT,
  shapeways_price DECIMAL,
  our_price DECIMAL,
  status TEXT DEFAULT 'pending',
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Environment Variables Needed

```
SHAPEWAYS_CLIENT_ID=<from manage-apps>
SHAPEWAYS_CLIENT_SECRET=<from manage-apps>
```

---

## Open Questions / Action Items

1. **Create Shapeways App** — Go to https://developers.shapeways.com/manage-apps and create an app to get Client ID + Secret
2. **Credit Card** — Ensure a credit card is on file in the Shapeways account
3. **Test Upload** — Upload a test model via API to verify format conversion works
4. **Pricing Strategy** — Decide our markup percentage on top of Shapeways pricing
5. **GLB → OBJ Conversion** — Need to test with `gltf-transform` or `trimesh` to ensure textures/colors transfer correctly
6. **Full Color vs Single Color** — Hunyuan 3D GLB files may or may not have texture maps (need to inspect a sample output)
7. **Rate Limits** — Shapeways API rate limits are not documented; need to test
8. **Webhook/Polling** — No webhook support mentioned; we'll need to poll order status

---

## Browser Team Tasks (If Needed)

If you want the browser team to help:

1. **Log into Shapeways** at https://developers.shapeways.com/manage-apps
2. **Create a new app** — note down Client ID and Client Secret
3. **Verify credit card** is on file at https://www.shapeways.com/account/billing
4. **Test the materials endpoint** — `GET https://api.shapeways.com/materials/v1` with bearer token
5. **Upload a test model** — Take one of our existing GLB files, convert to OBJ, upload via API

---

## Sources

- [Shapeways Developer Quick Start](https://developers.shapeways.com/quick-start)
- [Shapeways Developer Portal](https://developers.shapeways.com)
- [Shapeways File Upload Guide](https://www.shapeways.com/blog/upload-3d-print-files-designs-stl)
- [Full Color 3D Printing](https://www.shapeways.com/blog/shapeways-full-color-3d-printing)
- [Full Color Sandstone Design Guide](https://support.shapeways.com/hc/en-us/articles/360008363353-Designing-for-Full-Color-Sandstone)
- [Shapeways Pricing](https://www.shapeways.com/support/pricing)
- [Shapeways Forum - Pricing Discussion](https://www.shapeways.com/forum/t/its-that-time-again-to-figure-out-how-prices-are-calculated.97793/)
- [GLB to OBJ Conversion](https://imagetostl.com/convert/file/glb/to/obj)
- [gltf-transform Library](https://gltf-transform.dev/)
