# Merch Lab: Printify Mockups & Product Catalog Expansion

## Goal

Replace the canvas-drawn product silhouettes with real Printify-generated photorealistic mockups. Expand the product catalog from 6 to 10 items, reorganize the product picker into categories, and add Playwright tests to verify the full flow.

## Architecture

Hybrid rendering: canvas placeholder shows instantly, Printify mockup fades in when ready. Draft products are created on Printify when a design is generated, then reused at order time. Product catalog expands to 10 products across 3 categories with live variant data from Printify's API.

---

## 1. Product Catalog

### Final Lineup (10 products)

**Apparel (placed designs)**
| Product | Blueprint ID | Provider ID | Sizes | Front/Back | Design Styles |
|---------|-------------|------------|-------|-----------|---------------|
| T-Shirt | 12 | 99 (Printify Choice) | Yes | Yes | center, left-chest, back |
| Hoodie | 77 | 99 | Yes | Yes | center, left-chest, back |

**Apparel (all-over-print)**
| Product | Blueprint ID | Provider ID | Sizes | Design Style |
|---------|-------------|------------|-------|-------------|
| AOP T-Shirt | 281 | 10 (MWW On Demand) | Yes | all-over |
| AOP Hoodie | 450 | 10 (MWW On Demand) | Yes | all-over |

**Wall Art**
| Product | Blueprint ID | Provider ID | Size Variants | Design Style |
|---------|-------------|------------|--------------|-------------|
| Poster | 282 | 99 (Printify Choice) | 46 sizes | full-bleed |
| Canvas Print | 937 | 2 (Sensaria) | Multiple | full-bleed |
| Puzzle | 532 | 29 (Monster Digital) | 30/110/252/500/1000 pieces | full-bleed |

**Accessories**
| Product | Blueprint ID | Provider ID | Sizes | Design Style |
|---------|-------------|------------|-------|-------------|
| Mug 11oz | 478 | 99 | No (11oz fixed) | wrap |
| Stickers | 400 | 99 | 2"/3"/4"/5.5" | center |
| AOP Backpack | 413 | 10 (MWW On Demand) | One size | all-over |

> **Note:** Puzzle provider ID (29) is a best guess based on Monster Digital's catalog coverage. Must be confirmed via `GET /v1/catalog/blueprints/532/print_providers.json` at implementation time. If unavailable, fall back to querying the API for the first available provider.

### Removed Products
- Crewneck (Blueprint 49) — redundant with Hoodie + AOP Hoodie
- Tote Bag (Blueprint 507) — replaced by AOP Backpack

### Pricing Formula (unchanged)
```
pricePts = (baseCostCents + shippingCents) * MARGIN_MULTIPLIER(1.25)
```

Estimated shipping by category:
- Apparel: $4.99
- Wall Art: $5.99
- Accessories (Mug, Stickers): $3.99-$5.99
- AOP Backpack: $5.99

---

## 2. Mockup Generation Flow

### Hybrid Canvas → Printify Approach

```
User generates design
  ├─ INSTANT: Canvas preview draws product shape + overlays design
  └─ ASYNC (background):
       1. Upload design PNG to Printify (/uploads/images.json)
       2. Create draft product (/shops/{id}/products.json)
       3. Poll for mockup images (every 2s, max 30s)
       4. When images[] populated → fade in real mockup
```

### Trigger Points

**On design generation:**
- Upload to Printify + create draft product for currently selected product/color
- Store the Printify `uploadId` for reuse when switching products

**On product/color change (when design already exists):**
- Reuse the existing `uploadId` (same design image, skip re-upload)
- Create new draft product with new blueprint/variant
- Delete previous draft product (fire-and-forget)
- Canvas updates instantly, Printify mockup loads in background

**On order:**
- Use existing draft product (skip product creation step in order route)
- Fall back to creating product if draft doesn't exist

### Draft Product Cleanup
- When user switches product → delete previous draft via `DELETE /shops/{id}/products/{product_id}.json`
- Fire-and-forget (don't block UI on deletion)
- Non-critical: orphaned drafts don't cost anything and Printify has no strict draft limits for typical usage

### Cache-Busting on Variant Errors
- If mockup creation fails with "variant unavailable" → bust the `/api/merch-lab/products` cache
- Refetch fresh variants from Printify
- Update color picker to reflect current availability

---

## 3. API Routes

### Environment Variables Required
```
PRINTIFY_API_TOKEN=...        # Already exists in .env.local
PRINTIFY_SHOP_ID=...          # Already exists in .env.local
```

### New: `POST /api/merch-lab/mockup`

Creates a draft product on Printify for mockup generation.

```typescript
// Request
{
  blueprintId: number,
  variantId: number,
  designUrl: string,                    // Supabase public URL
  designPosition?: { x: number, y: number, scale: number },  // Optional — ignored for AOP/full-bleed/wrap
  designStyle: string,                  // 'center' | 'left-chest' | 'back' | 'all-over' | 'wrap' | 'full-bleed'
  existingUploadId?: string             // Reuse previous Printify image upload
}

// Response
{
  printifyProductId: string,
  uploadId: string                      // Printify image upload ID (cache for reuse)
}
```

Steps:
1. If `existingUploadId` provided, skip upload. Otherwise upload design image to Printify.
2. Determine print area config based on `designStyle`:
   - **placed (center/left-chest/back):** Use `designPosition` for x, y, scale
   - **all-over:** Omit position (Printify handles full coverage)
   - **full-bleed:** Set x=0.5, y=0.5, scale=1.0 (centered, full size)
   - **wrap:** Set x=0.5, y=0.5, scale=1.0 (centered, full size)
3. Create draft product with blueprint, provider, variant, print area
4. Return product ID immediately (don't wait for mockups)

### New: `GET /api/merch-lab/mockup?productId={id}`

Polls for mockup images on a draft product.

```typescript
// Response
{
  ready: boolean,
  images: Array<{
    src: string,             // Printify CDN URL
    position: string,        // 'front' | 'back' | 'default'
    variantIds: number[]
  }>
}
```

### Modified: `POST /api/merch-lab/order`

Accept optional `printifyProductId` to skip product creation:
```typescript
// Added to request body
printifyProductId?: string   // Reuse draft product if available
```

If provided, skip upload + product creation steps (3-4 in current flow). Go straight to submitting order.

### Modified: `GET /api/merch-lab/products`

No logic changes, but the route implicitly changes behavior because the `MERCH_PRODUCTS` constant it reads from is updated with new blueprint IDs. Cache reduced from 1 hour to 15 minutes for faster variant availability updates. Cache-bust header added for error recovery.

### Unchanged Routes
- `POST /api/merch-lab/generate-design` — no changes
- `GET /api/merch-lab/price` — no changes

---

## 4. Store Changes

### New State
```typescript
// Mockup
mockupProductId: string | null      // Printify draft product ID
mockupUploadId: string | null       // Printify image upload ID (reusable across products)
mockupImages: Array<{ src: string; position: string }> // Resolved Printify mockup URLs
isLoadingMockup: boolean            // Loading spinner state
```

### New Actions
```typescript
setMockupProductId: (id: string | null) => void
setMockupUploadId: (id: string | null) => void
setMockupImages: (images: Array<{ src: string; position: string }>) => void
setIsLoadingMockup: (loading: boolean) => void
```

---

## 5. Error Handling & Failure States

### Printify API Down (500/503)
- Mockup creation fails silently — canvas preview remains visible
- No error toast (mockup is a nice-to-have, not blocking)
- Order route falls back to creating product at order time (existing behavior)

### Design Upload Failure
- If Printify upload fails (file too large, auth error), log the error
- Canvas preview remains — user can still generate designs and order
- Printify upload max: 200MB per image (our PNGs are well under this)
- If upload fails, `mockupUploadId` stays null, next attempt re-uploads

### Mockup Timeout (30s elapsed, no images)
- Stop polling
- Canvas preview stays visible (already showing the design)
- `isLoadingMockup` set to false, small "Preview unavailable" text replaces loading indicator
- Order button remains enabled — ordering works independently of mockup display

### Rate Limiting (429)
- Back off and stop polling for that request
- Canvas preview stays visible
- Next product/design change triggers a fresh attempt

### Rapid Product Switching (Race Conditions)
- Each mockup request gets a unique `requestId` stored in the hook
- When poll response arrives, compare `requestId` to current — ignore stale responses
- Prevents old mockup from replacing new canvas preview

### Variant Unavailable at Order Time
- Order route already re-verifies variants server-side
- If variant gone → return error → UI shows "This color/size is no longer available"
- Bust product cache → refetch variants → update color picker

---

## 6. UI Design

### Design Direction
Dark, immersive, consistent with app's existing dark theme + cyan accents. The mockup preview should feel like a product photography studio — dark background with the product lit and floating.

### ProductPicker.tsx — Category Tabs

Replace the flat 6-product grid with tabbed categories:

```
[ Apparel ]  [ Wall Art ]  [ Accessories ]
```

- Tabs use the existing pill-style active state (cyan border + bg)
- Each tab shows its products in a responsive grid
- Products keep the current card style (icon + name)
- AOP products get a small "AOP" badge in the corner to distinguish from regular versions
- Replace emoji icons with Lucide icons:
  - T-Shirt → `Shirt`, Hoodie → `Shirt` with variant, AOP T-Shirt → `Shirt` + AOP badge
  - AOP Hoodie → `Shirt` + AOP badge, Poster → `Image`, Canvas → `Frame`
  - Puzzle → `Puzzle`, Mug → `Coffee`, Stickers → `Sticker`, Backpack → `Backpack`

### MockupPreview.tsx — Three States

**State 1: No design yet**
- Current canvas silhouette with "Your design appears here" dashed border
- Canvas draws basic product shapes for all 10 products:
  - **apparel** (T-Shirt, Hoodie): existing torso shape
  - **all-over** (AOP Tee, AOP Hoodie, AOP Backpack): same shape as apparel/accessory, tinted with design overlay
  - **wall-art** (Poster, Canvas, Puzzle): simple rectangle with subtle shadow/frame
  - **drinkware** (Mug): existing cylinder shape
  - **sticker**: existing white rounded square

**State 2: Design exists, mockup loading**
- Canvas preview with design overlaid (instant)
- Small pulsing dot in the top-right corner of the preview
- Subtle text below: "Loading product preview..."

**State 3: Mockup ready**
- Real Printify mockup image fades in (0.3s ease-in-out crossfade)
- Canvas hidden, replaced by `<img>` tag
- Full quality product photo from Printify CDN
- If product has front/back, the front/back toggle switches between mockup images

**State 4: Mockup timeout/failed**
- Canvas preview stays visible (same as State 2 but without loading indicator)
- Small muted text: "Preview unavailable" (non-blocking)

### Loading Transition
```
Canvas (instant) ──[2-15 seconds]──> Printify Mockup (fade in)
                                      ↑
                          Small pulsing dot in corner
                          (NOT a full-screen spinner — preview stays usable)
```

### MockupControls.tsx — Updated
- Front/Back toggle: visible only for placed-design products (T-Shirt, Hoodie) — hidden for AOP, full-bleed, wrap, stickers
- When Printify mockup is loaded, front/back switches between `position: 'front'` and `position: 'back'` images
- Larger/Smaller controls only apply to canvas mode (Printify handles placement)

### ColorPicker.tsx — Conditional Visibility
- **Show** for: T-Shirt, Hoodie, AOP T-Shirt, AOP Hoodie, Mug
- **Hide** for: Poster, Canvas Print, Puzzle, Stickers, AOP Backpack (no color options)

### DesignStylePicker.tsx — Conditional Visibility
- **Show** for: T-Shirt, Hoodie (center, left-chest, back)
- **Hide** for: AOP products (always all-over), full-bleed (always full), wrap (always wrap), stickers (always center)

### SizeVariantPicker — New Component or ColorPicker Mode
For products where "size" is the primary variant (Poster, Canvas, Puzzle, Stickers):
- Show a grid of size options styled like the color picker (pill buttons)
- Poster: list of dimension options (8x10, 11x14, 16x20, 18x24, 24x36, etc.)
- Canvas: same dimension options
- Puzzle: piece count options (30, 110, 252, 500, 1000)
- Stickers: diameter options (2", 3", 4", 5.5")
- Reuse the same visual style as ColorPicker (grid of selectable buttons with cyan active state)

---

## 7. Product Type Behavior Matrix

| Product | Color Picker | Design Style | Front/Back | Size Picker | designPosition |
|---------|-------------|-------------|-----------|------------|---------------|
| T-Shirt | Yes | center/left-chest/back | Yes | In OrderPanel | Used |
| Hoodie | Yes | center/left-chest/back | Yes | In OrderPanel | Used |
| AOP T-Shirt | Yes | Hidden (all-over) | No | In OrderPanel | Ignored |
| AOP Hoodie | Yes | Hidden (all-over) | No | In OrderPanel | Ignored |
| Poster | No | Hidden (full-bleed) | No | Primary picker | Ignored |
| Canvas Print | No | Hidden (full-bleed) | No | Primary picker | Ignored |
| Puzzle | No | Hidden (full-bleed) | No | Primary picker (pieces) | Ignored |
| Mug 11oz | Yes | Hidden (wrap) | No | No | Ignored |
| Stickers | No | Hidden (center) | No | Primary picker (diameter) | x=0.5, y=0.5, scale=1 |
| AOP Backpack | No | Hidden (all-over) | No | No (one size) | Ignored |

---

## 8. Playwright Test Plan

### Test 1: Product Catalog Navigation
```
1. Login → Navigate to Merch Lab
2. Verify 3 category tabs visible (Apparel, Wall Art, Accessories)
3. Click each tab → verify correct products appear
4. Click each product → verify:
   - Color picker loads (for products that have colors)
   - Color picker hidden (for Poster, Canvas, Puzzle, Stickers, Backpack)
   - Design style picker shows correct options (T-Shirt, Hoodie only)
   - Design style picker hidden for AOP/full-bleed/wrap products
   - Stepper shows Step 1 active
5. Screenshot each product selection
```

### Test 2: Design Generation + Mockup Loading
```
1. Select T-Shirt → pick Black color
2. Enter prompt: "A fierce dragon breathing fire"
3. Click Generate Design
4. ASSERT: Canvas preview appears within 2s (instant feedback)
5. ASSERT: Stepper advances to Step 3 (design exists)
6. ASSERT: Loading indicator (pulsing dot) appears on preview
7. WAIT: Poll for Printify mockup (max 30s)
8. ASSERT: Real mockup image appears (src contains images.printify.com)
9. ASSERT: Loading indicator disappears
10. Screenshot final mockup
```

### Test 3: Product Switching with Existing Design
```
1. After Test 2, switch to Poster tab
2. ASSERT: Canvas preview updates instantly to rectangle shape
3. ASSERT: Color picker hidden
4. ASSERT: Size picker appears with dimension options
5. WAIT: New Printify mockup loads (max 30s)
6. Screenshot poster mockup
7. Switch to AOP Hoodie (Apparel tab)
8. ASSERT: Design style picker hidden
9. ASSERT: Front/back toggle hidden
10. WAIT: New Printify mockup loads
11. Screenshot AOP hoodie mockup
```

### Test 4: Mug and Sticker Behavior
```
1. Select Mug (Accessories tab)
2. ASSERT: Color picker visible
3. ASSERT: Design style picker hidden
4. ASSERT: Front/back toggle hidden
5. ASSERT: Canvas shows cylinder/mug shape
6. Select Stickers
7. ASSERT: Color picker hidden
8. ASSERT: Size picker shows diameter options (2", 3", 4", 5.5")
9. Screenshot each
```

### Test 5: Order Flow with Draft Product
```
1. With a mockup-ready T-Shirt
2. Select size, set quantity
3. Click "Order via Printify"
4. Fill shipping form (US only)
5. ASSERT: Review step shows correct product details
6. ASSERT: Confirmation screen shows order ID
```

### Test 6: Variant Availability
```
1. Select a product with many colors (T-Shirt)
2. ASSERT: All displayed colors are clickable
3. ASSERT: No "gray dot" placeholders (all colors have hex values)
4. Select a color → ASSERT: price updates in order panel
```

### Test 7: Error Resilience
```
1. Generate a design on T-Shirt
2. If mockup doesn't load within 30s:
   - ASSERT: Canvas preview still visible (not broken)
   - ASSERT: "Preview unavailable" text shown
   - ASSERT: Order button still enabled
3. Rapidly switch between 3 products in <2 seconds
4. ASSERT: Final product's canvas preview is shown (no stale mockup from earlier product)
```

---

## 9. File Changes Summary

### New Files
- `src/app/api/merch-lab/mockup/route.ts` — Draft product creation + mockup polling
- `src/features/merch-lab/hooks/usePrintifyMockup.ts` — Hook to manage mockup lifecycle (polling, race condition handling)

### Modified Files
- `src/features/merch-lab/constants/products.ts` — New product catalog (10 items, 3 categories, new provider IDs)
- `src/features/merch-lab/types/merch-lab.types.ts` — New store state types, product category type
- `src/features/merch-lab/hooks/useMerchLabStore.ts` — New mockup state + actions
- `src/features/merch-lab/components/ProductPicker.tsx` — Category tabs, new products, Lucide icons
- `src/features/merch-lab/components/MockupPreview.tsx` — Hybrid canvas/Printify rendering with 4 states
- `src/features/merch-lab/components/MockupControls.tsx` — Conditional front/back toggle
- `src/features/merch-lab/components/ColorPicker.tsx` — Conditional visibility based on product type
- `src/features/merch-lab/components/DesignStylePicker.tsx` — Conditional visibility based on product type
- `src/features/merch-lab/components/OrderPanel.tsx` — Size variant picker for wall art/stickers
- `src/app/api/merch-lab/order/route.ts` — Accept draft product ID, skip creation when available
- `src/app/api/merch-lab/products/route.ts` — Reduce cache to 15 min, add cache-bust support

### New Test Files
- `tests/merch-lab/product-catalog.spec.ts`
- `tests/merch-lab/mockup-generation.spec.ts`
- `tests/merch-lab/product-switching.spec.ts`
- `tests/merch-lab/mug-sticker-behavior.spec.ts`
- `tests/merch-lab/order-flow.spec.ts`
- `tests/merch-lab/variant-availability.spec.ts`
- `tests/merch-lab/error-resilience.spec.ts`
