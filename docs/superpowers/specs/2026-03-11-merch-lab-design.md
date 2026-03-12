# Merch Lab — Design Spec

## Overview

Merch Lab is an AI-powered apparel design module for Directors Palette. Users pick a product (tee, hoodie, hat, etc.), customize it (color, design placement), generate artwork via AI prompt, preview a live mockup, and order through Printify. We collect payment via pts (same model as Figurine Studio print orders), then submit the order to Printify for fulfillment.

## User Flow

**Template-first:** Product → Color → Design Style → AI Prompt → Preview → Order

1. User picks a product from the catalog (t-shirt, hoodie, tank, hat, tote)
2. User selects the product color from available swatches
3. User picks a design style/placement (center graphic, all-over print, left chest, back print)
4. User writes a prompt describing their design
5. AI generates a transparent-background PNG (costs pts)
6. Design is placed on the product mockup in the center panel
7. User can regenerate (costs pts again) — previous designs shown as thumbnails below the mockup
8. User can adjust placement (move, scale) and view front/back
9. User selects size, quantity, reviews price
10. User clicks "Order" → modal opens with shipping address form + price summary
11. User confirms → pts deducted (covering Printify cost + margin) → order submitted to Printify

## UI Layout

Three-panel layout matching existing Directors Palette patterns (e.g., Shot Creator):

### Left Panel (320px) — Design Controls
Stepped workflow, top to bottom:

1. **Pick a Product** — Grid of product cards with icons (tee, hoodie, tank, hat, tote). Single select, highlight active.
2. **Product Color** — Row of color swatches. Colors sourced from Printify API per product/provider.
3. **Design Style** — 2x2 grid of placement options: Center Graphic, All-Over Print, Left Chest, Back Print. Availability depends on product type.
4. **Describe Your Design** — Textarea for AI prompt + "Generate Design" button with pts cost.

### Center Panel (flex) — Live Mockup Preview
- Client-side canvas overlay for instant preview (transparent PNG on product template)
- Optionally fetch Printify mockup API for high-fidelity preview in background
- Dashed border showing the printable area
- Design placement controls: Front/Back toggle, Move, Scale
- Thumbnail strip below mockup showing previous generations (click to swap)
- Download button for transparent PNG only (free)

### Right Panel (280px) — Order Details
- Order summary: product, color, style
- Size selector (pill buttons — options vary by product type from Printify)
- Quantity control (+/- buttons)
- Price display: Printify base cost + our margin, shown as total pts
- "Printed & shipped by Printify" note with delivery estimate
- **"Order" button** → opens `OrderModal`

### Order Modal (triggered by Order button)
Multi-step modal (same pattern as Figurine Studio's `OrderPrintModal`):
1. **Shipping Address** — reuse/extract `ShippingForm` component from Figurine Studio
2. **Review & Confirm** — summary of product, design, size, qty, shipping, total pts cost
3. **Processing** — spinner while order is submitted to Printify
4. **Confirmation** — order submitted, Printify order ID shown

## Technical Architecture

### Feature Structure
```
src/features/merch-lab/
├── components/
│   ├── index.ts
│   ├── MerchLab.tsx              # Main component, renders 3-panel layout
│   ├── ProductPicker.tsx          # Product grid selector
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
└── index.ts
```

### API Routes
```
src/app/api/merch-lab/
├── generate-design/route.ts      # AI image gen with transparent bg (maxDuration=120)
├── products/route.ts             # Fetch Printify product catalog (maxDuration=30)
├── mockup/route.ts               # Generate product mockup with design (maxDuration=60)
├── price/route.ts                # Get pricing for product + options (maxDuration=30)
└── order/route.ts                # Upload image + create product + submit order to Printify (maxDuration=120)
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

### Image Generation
- Uses existing Replicate integration (same as Shot Creator)
- Model: Flux or similar that supports transparent backgrounds
- If model doesn't natively support transparency, apply background removal post-generation (rembg or Replicate bg-removal model)
- Output: transparent PNG, stored in Supabase Storage (`merch-lab/` prefix, public bucket)
- Cost: ~15 pts per generation (TBD based on model pricing)
- Each generation appends to `generatedDesigns` array; user can click thumbnails to swap active design

### Printify Integration
- **Auth:** Printify API token stored in `.env.local` (`PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`)
- **Print Provider Strategy:** Hardcode one preferred provider per product type for Phase 1. Store mapping in a config constant (e.g., `PRINTIFY_PROVIDERS` object). Choose providers based on quality/price balance.
- **Product Catalog:** Fetch available products, colors, sizes from Printify API. Cache in memory with 1-hour TTL to avoid repeated calls.
- **Mockup Preview:** Primary: client-side canvas overlay (instant). Secondary: Printify mockup API (async, poll for result, show when ready).
- **Image Upload:** Upload transparent PNG to Printify via `POST /v1/uploads/images.json` before creating product. This gives Printify its own copy — no dependency on Supabase URL accessibility.
- **Order Flow:**
  1. Upload design image to Printify
  2. Create product with design placement on Printify
  3. Submit order with variant (color+size), quantity, shipping address
- **Payment:** We charge the user in pts. Price = Printify base cost + our margin (converted to pts). We pay Printify from our account. Same model as Figurine Studio print orders.
- **No MCP server needed for Phase 1** — direct REST API calls are simpler and more maintainable

### Design Placement Mapping
- Each product type has a defined print area from Printify (width x height in pixels, position offset)
- User's `designPosition` (x, y, scale) is relative to the visible print area in the UI
- On order submission, convert UI coordinates to Printify's coordinate system using the print area dimensions from the provider's specs
- "All-over print" ignores placement controls — design fills the entire printable surface

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
- Product picker with Printify catalog (tees, hoodies, tanks, hats, totes)
- Color selection per product (from Printify provider)
- Design style/placement picker (availability varies by product)
- AI prompt → transparent PNG generation
- Design regeneration with thumbnail history
- Client-side mockup preview (canvas overlay)
- Design placement controls (move, scale, front/back)
- Size and quantity selection
- Price display in pts (Printify cost + margin)
- Order modal with shipping address collection
- pts-based payment → Printify order submission
- Download transparent PNG design file

**Out of scope (Phase 2+):**
- Upload your own artwork
- Import from Gallery
- Pre-made templates / style presets
- Order history / tracking
- Phone cases (requires different UI: model selection instead of sizes)
- Stripe checkout (direct credit card payment)
- Batch ordering
- Multiple designs per product (front + back combo)
- Brand Studio integration (auto-apply brand assets)
- High-fidelity Printify mockup API (Phase 1 uses client-side overlay)

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

- **Design generation:** ~15 pts per generation (same ballpark as Shot Creator)
- **Product ordering:** Printify base cost + margin, converted to pts
  - Example: Printify charges ~$8 for a basic tee + ~$5 shipping = $13. We charge ~$16 worth of pts (~100 pts at current rate). Exact pricing TBD after Printify account setup.
- **Download design PNG:** Free (user already paid for generation)

## Error Handling

- Printify API errors: Show user-friendly message in order modal, retry option
- Printify catalog fetch failure: Show cached products if available, "retry" button if not
- Generation failures: Standard retry flow (same as Shot Creator)
- Out of pts: Existing `CreditInsufficiencyModal`
- Order submission failure: Keep modal open on "review" step, show error, allow retry
- Shipping address validation: Client-side required fields check before submission
