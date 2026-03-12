# Merch Lab — Design Spec

## Overview

Merch Lab is an AI-powered apparel design module for Directors Palette. Users pick a product (tee, hoodie, sweatshirt, tote, mug, stickers), customize it (color, design placement), generate artwork via AI prompt with transparent backgrounds, preview a live mockup, and order through Printify. We collect payment via pts (same model as Figurine Studio print orders), then submit the order to Printify for fulfillment.

## User Flow

**Template-first:** Product → Color → Design Style → AI Prompt → Preview → Order

1. User picks a product from the curated catalog (6 products)
2. User selects the product color from available swatches
3. User picks a design style/placement (center graphic, all-over print, left chest, back print)
4. User writes a prompt describing their design
5. AI generates a transparent-background PNG via Recraft V3 (costs pts)
6. Background removal cleanup pass via 851-labs/background-remover (automatic, near-free)
7. Design is placed on the product mockup in the center panel
8. User can regenerate (costs pts again) — previous designs shown as thumbnails below the mockup
9. User can adjust placement (move, scale) and view front/back
10. User selects size, quantity, reviews price
11. User clicks "Order" → modal opens with shipping address form + price summary
12. User confirms → pts deducted (covering Printify cost + margin) → order submitted to Printify

## Product Catalog (Phase 1 — 6 Products)

| # | Product | Printify Blueprint ID | Brand/Model | Base Cost | Retail Target |
|---|---------|----------------------|-------------|-----------|---------------|
| 1 | T-Shirt | 12 | Bella+Canvas 3001 Unisex Jersey | ~$9 | $22-30 |
| 2 | Hoodie | 77 | Gildan 18500 Heavy Blend | ~$18-22 | $40-55 |
| 3 | Crewneck Sweatshirt | 49 | Gildan 18000 Heavy Blend | ~$18 | $38-48 |
| 4 | Tote Bag (AOP) | 375 | Generic Brand AOP Tote | ~$10-14 | $25-35 |
| 5 | Ceramic Mug 11oz | 478 | Generic Brand Ceramic | ~$3.50-4.69 | $14-20 |
| 6 | Kiss-Cut Stickers | 400 | Generic Brand Kiss-Cut | ~$1.21 | $4-6 |

**Print Provider Strategy:** Hardcode Monster Digital or SwiftPOD for apparel (Blueprint 12, 77, 49). Check best available provider for non-apparel (375, 478, 400). Store mapping in `PRINTIFY_PROVIDERS` config constant.

**Why these 6:**
- 3 apparel items (tee, hoodie, crewneck) for a cohesive clothing line
- 1 accessory (tote) for lifestyle branding — AOP wraps designs across full surface
- 1 drinkware (mug) for the gift market
- 1 low-cost impulse item (stickers) to boost average order value
- No hats (user preference), no phone cases (too many SKUs), no tanks (seasonal)

## UI Layout

Three-panel layout matching existing Directors Palette patterns (e.g., Shot Creator):

### Left Panel (320px) — Design Controls
Stepped workflow, top to bottom:

1. **Pick a Product** — Grid of 6 product cards with icons. Single select, highlight active.
2. **Product Color** — Row of color swatches. Colors sourced from Printify API per product/provider.
3. **Design Style** — 2x2 grid of placement options: Center Graphic, All-Over Print, Left Chest, Back Print. Availability depends on product type (e.g., mugs and stickers only show "wrap" or "center").
4. **Describe Your Design** — Textarea for AI prompt + "Generate Design" button with pts cost.

### Center Panel (flex) — Live Mockup Preview
- Client-side canvas overlay for instant preview (transparent PNG on product template)
- Dashed border showing the printable area
- Design placement controls: Front/Back toggle, Move, Scale
- Thumbnail strip below mockup showing previous generations (click to swap)
- Download button for transparent PNG only (free)

### Right Panel (280px) — Order Details
- Order summary: product, color, style
- Size selector (pill buttons — options vary by product type from Printify; hidden for stickers)
- Quantity control (+/- buttons, max 25 per order)
- Price display: Printify base cost + our margin, shown as total pts
- Shipping cost included in total (not shown separately in Phase 1)
- "Printed & shipped by Printify" note with delivery estimate
- **"Order" button** → opens `OrderModal`

### Order Modal (triggered by Order button)
Multi-step modal (same pattern as Figurine Studio's `OrderPrintModal`):
1. **Shipping Address** — reuse/extract `ShippingForm` component from Figurine Studio
2. **Review & Confirm** — summary of product, design, size, qty, shipping, total pts cost. Server-side price re-verification before deducting pts.
3. **Processing** — spinner while order is submitted to Printify
4. **Confirmation** — order submitted, Printify order ID shown

## Technical Architecture

### Feature Structure
```
src/features/merch-lab/
├── components/
│   ├── index.ts
│   ├── MerchLab.tsx              # Main component, renders 3-panel layout
│   ├── ProductPicker.tsx          # Product grid selector (6 products)
│   ├── ColorPicker.tsx            # Color swatch selector
│   ├── DesignStylePicker.tsx      # Placement style grid
│   ├── DesignPrompt.tsx           # Prompt textarea + generate button
│   ├── MockupPreview.tsx          # Center panel — canvas overlay + design thumbnails
│   ├── MockupControls.tsx         # Move/scale/front-back controls
│   ├── DesignThumbnails.tsx       # Strip of previous generations
│   ├── OrderPanel.tsx             # Right panel: size, qty, price, order button
│   └── OrderModal.tsx             # Multi-step: shipping → review → confirm
├── hooks/
│   ├── index.ts
│   ├── useMerchLabStore.ts        # Zustand store
│   └── usePrintify.ts             # Printify API interactions
├── services/
│   ├── index.ts
│   ├── merch-lab-api.ts           # Internal API calls
│   └── printify.service.ts        # Printify API wrapper
├── types/
│   ├── index.ts
│   └── merch-lab.types.ts
├── constants/
│   └── products.ts               # PRINTIFY_PROVIDERS config, blueprint IDs, product metadata
└── index.ts
```

### API Routes
```
src/app/api/merch-lab/
├── generate-design/route.ts      # Recraft V3 gen + bg removal cleanup (maxDuration=120)
├── products/route.ts             # Fetch Printify product catalog (maxDuration=30)
├── price/route.ts                # Get pricing for product + options (maxDuration=30)
└── order/route.ts                # Server-side price verify + upload image + create product + submit order (maxDuration=120)
```

### State (Zustand Store)
```typescript
interface MerchLabState {
  // Product selection
  selectedProduct: PrintifyProduct | null
  selectedColor: string | null
  designStyle: 'center' | 'all-over' | 'left-chest' | 'back'

  // Design
  prompt: string
  generatedDesigns: string[]        // Array of URLs to transparent PNGs
  activeDesignIndex: number         // Which design is currently shown on mockup
  designPosition: { x: number; y: number; scale: number }

  // Order
  selectedSize: string | null
  quantity: number
  shippingAddress: ShippingAddress | null
  pricePts: number | null           // Total cost in pts

  // Printify
  printifyProductId: string | null  // Created product ID for ordering
  printifyOrderId: string | null    // Returned after order submission

  // UI
  isGenerating: boolean
  isOrdering: boolean
  mockupView: 'front' | 'back'
  orderModalOpen: boolean
  orderModalStep: 'shipping' | 'review' | 'processing' | 'confirmation'
  error: string | null
}
```

### Image Generation Pipeline
Two-step pipeline for reliable transparent backgrounds:

**Step 1: Generate with Recraft V3**
- Model: `recraft-ai/recraft-v3` on Replicate
- Cost: $0.04 per image (~5 pts)
- Prompt injection: Append "transparent background, isolated subject, clean edges" to user's prompt
- Native transparency support — outputs PNG with alpha channel
- Style guidance: Inject "vector art style, bold lines, print-ready" for apparel-appropriate output

**Step 2: Background Removal Cleanup**
- Model: `851-labs/background-remover` on Replicate
- Cost: $0.00047 per image (essentially free)
- Automatic pass on every generation to catch halos/artifacts
- Output: clean transparent PNG stored in Supabase Storage (`merch-lab/` prefix, public bucket)

**Total generation cost: ~$0.04 per design (~5 pts)**

### Printify Integration
- **Auth:** Printify API token stored in `.env.local` (`PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`)
- **Product Catalog:** We use a curated set of 6 blueprint IDs (12, 77, 49, 375, 478, 400). Fetch colors/sizes/pricing from Printify API per blueprint+provider. Cache in memory with 1-hour TTL.
- **Image Upload:** Upload transparent PNG to Printify via `POST /v1/uploads/images.json` before creating product. This gives Printify its own copy.
- **Order Flow (server-side, in order/route.ts):**
  1. Re-fetch Printify pricing server-side to verify pts amount matches (security check)
  2. Deduct pts from user account
  3. Upload design image to Printify
  4. Create product with design placement on Printify
  5. Submit order with variant (color+size), quantity, shipping address
  6. If Printify submission fails, refund pts and return error
- **Payment:** We charge the user in pts. Price = Printify base cost + shipping + our margin (converted to pts). We pay Printify from our account. Same model as Figurine Studio print orders.

### Design Placement Mapping
- Each product type has a defined print area from Printify (width x height in pixels, position offset)
- User's `designPosition` (x, y, scale) is relative to the visible print area in the UI
- On order submission, convert UI coordinates to Printify's coordinate system using the print area dimensions from the provider's specs
- "All-over print" ignores placement controls — design fills the entire printable surface
- Mugs use a "wrap" placement — design wraps around the surface
- Stickers use center placement only

### Sidebar Integration
- Tab ID: `merch-lab`
- Icon: Lucide `shirt` icon
- Location: Under "CREATION TOOLS" section (alongside Shot Creator, Figurine Studio)
- Banner: cyan accent matching other tools

### Authentication
- Feature is accessible to all users for browsing products
- Auth required at generation time (pts deduction requires a user account)
- Same pattern as Shot Creator — `CreditInsufficiencyModal` if insufficient pts

## Phase 1 Scope

**In scope:**
- Curated 6-product catalog (tee, hoodie, crewneck, tote, mug, stickers)
- Color selection per product (from Printify provider)
- Design style/placement picker (availability varies by product)
- AI prompt → transparent PNG via Recraft V3 + background removal cleanup
- Design regeneration with thumbnail history
- Client-side mockup preview (canvas overlay)
- Design placement controls (move, scale, front/back)
- Size and quantity selection (max 25 per order)
- Price display in pts (Printify cost + shipping + margin)
- Order modal with shipping address collection
- Server-side price verification before pts deduction
- pts-based payment → Printify order submission
- Download transparent PNG design file (free)

**Out of scope (Phase 2+):**
- Upload your own artwork
- Import from Gallery
- Pre-made templates / style presets
- Order history / tracking
- Phone cases (too many SKUs)
- Stripe checkout (direct credit card payment)
- Batch ordering
- Multiple designs per product (front + back combo)
- Brand Studio integration (auto-apply brand assets)
- High-fidelity Printify mockup API (Phase 1 uses client-side overlay)
- Separate shipping cost display

## Printify API Overview

Key endpoints we'll use:
- `GET /v1/catalog/blueprints.json` — list product types
- `GET /v1/catalog/blueprints/{id}/print_providers.json` — print providers per product
- `GET /v1/catalog/blueprints/{id}/print_providers/{id}/variants.json` — sizes/colors
- `POST /v1/uploads/images.json` — upload design image to Printify
- `POST /v1/shops/{shop_id}/products.json` — create product with design
- `POST /v1/shops/{shop_id}/orders.json` — submit order

Env vars required: `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`

## Pricing

- **Design generation:** ~5 pts per generation (~$0.04 Recraft V3 + $0.00047 bg removal)
- **Product ordering:** Printify base cost + estimated shipping + 25% margin, converted to pts
  - T-shirt example: ~$9 base + ~$5 shipping = $14 × 1.25 margin = ~$17.50 → ~110 pts
  - Sticker example: ~$1.21 base + ~$3 shipping = $4.21 × 1.25 = ~$5.26 → ~33 pts
- **Download design PNG:** Free (user already paid for generation)

## Error Handling

- Printify API errors: Show user-friendly message in order modal, retry option
- Printify catalog fetch failure: Show cached products if available, "retry" button if not
- Generation failures: Standard retry flow (same as Shot Creator)
- Out of pts: Existing `CreditInsufficiencyModal`
- Order submission failure: Refund pts, keep modal open on "review" step, show error, allow retry
- Shipping address validation: Client-side required fields check before submission
- Background removal failure: Use the raw Recraft V3 output (it already has transparency, cleanup is just a safety net)
