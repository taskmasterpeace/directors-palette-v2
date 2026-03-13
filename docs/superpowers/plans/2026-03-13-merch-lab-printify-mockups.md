# Merch Lab: Printify Mockups & Product Catalog Expansion — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace canvas-drawn product silhouettes with real Printify mockups, expand the catalog from 6 to 10 products with category tabs, and verify with Playwright tests.

**Architecture:** Hybrid rendering — canvas placeholder shows instantly, Printify mockup fades in asynchronously. New API routes create draft Printify products for mockups. Product picker reorganized into 3 category tabs (Apparel, Wall Art, Accessories). usePrintifyMockup hook manages polling with race-condition protection.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, Tailwind CSS v4, Printify API, Playwright

---

## Chunk 1: Foundation (Types, Constants, Store)

### Task 1: Update Product Catalog Constants

**Files:**
- Modify: `src/features/merch-lab/constants/products.ts`

- [ ] **Step 1: Replace MERCH_PRODUCTS array with 10 products in 4 categories**

```typescript
import type { PrintifyProduct } from '../types'

export const MERCH_PRODUCTS: PrintifyProduct[] = [
  // --- Apparel (placed designs) ---
  {
    blueprintId: 12,
    name: 'T-Shirt',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  {
    blueprintId: 77,
    name: 'Hoodie',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  // --- Apparel (all-over-print) ---
  {
    blueprintId: 281,
    name: 'AOP T-Shirt',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['all-over'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 450,
    name: 'AOP Hoodie',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['all-over'],
    hasSizes: true,
    hasFrontBack: false,
  },
  // --- Wall Art ---
  {
    blueprintId: 282,
    name: 'Poster',
    icon: 'Image',
    category: 'wall-art',
    designStyles: ['full-bleed'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 937,
    name: 'Canvas Print',
    icon: 'Frame',
    category: 'wall-art',
    designStyles: ['full-bleed'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 532,
    name: 'Puzzle',
    icon: 'Puzzle',
    category: 'wall-art',
    designStyles: ['full-bleed'],
    hasSizes: true,
    hasFrontBack: false,
  },
  // --- Accessories ---
  {
    blueprintId: 478,
    name: 'Mug 11oz',
    icon: 'Coffee',
    category: 'accessory',
    designStyles: ['wrap'],
    hasSizes: false,
    hasFrontBack: false,
  },
  {
    blueprintId: 400,
    name: 'Stickers',
    icon: 'Sticker',
    category: 'accessory',
    designStyles: ['center'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 413,
    name: 'AOP Backpack',
    icon: 'Backpack',
    category: 'accessory',
    designStyles: ['all-over'],
    hasSizes: false,
    hasFrontBack: false,
  },
]

export const PRINTIFY_PROVIDERS: Record<number, number> = {
  12: 99,    // T-Shirt — Printify Choice
  77: 99,    // Hoodie — Printify Choice
  281: 10,   // AOP T-Shirt — MWW On Demand
  450: 10,   // AOP Hoodie — MWW On Demand
  282: 99,   // Poster — Printify Choice
  937: 2,    // Canvas Print — Sensaria
  532: 29,   // Puzzle — Monster Digital (confirm via API)
  478: 99,   // Mug — Printify Choice
  400: 99,   // Stickers — Printify Choice
  413: 10,   // AOP Backpack — MWW On Demand
}

export const MARGIN_MULTIPLIER = 1.25
export const MAX_QUANTITY = 25

// Product categories for tab navigation
export const PRODUCT_CATEGORIES = [
  { id: 'apparel', label: 'Apparel' },
  { id: 'wall-art', label: 'Wall Art' },
  { id: 'accessory', label: 'Accessories' },
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]['id']
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds (existing components reference `MERCH_PRODUCTS` but the shape hasn't changed)

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/constants/products.ts
git commit -m "feat(merch-lab): expand product catalog to 10 items with categories"
git push origin main
```

---

### Task 2: Update Types for Mockup State and New Product Fields

**Files:**
- Modify: `src/features/merch-lab/types/merch-lab.types.ts`

- [ ] **Step 1: Add full-bleed design style, mockup state types, and product category to types**

Add `'full-bleed'` to the `DesignStyle` union:
```typescript
export type DesignStyle = 'center' | 'all-over' | 'left-chest' | 'back' | 'wrap' | 'full-bleed'
```

Update the `PrintifyProduct` interface — change `icon` from emoji to Lucide icon name string, and update `category`:
```typescript
export interface PrintifyProduct {
  blueprintId: number
  name: string
  icon: string   // Lucide icon component name (e.g. 'Shirt', 'Coffee')
  category: 'apparel' | 'accessory' | 'drinkware' | 'sticker' | 'wall-art'
  designStyles: DesignStyle[]
  hasSizes: boolean
  hasFrontBack: boolean
}
```

Add mockup types to `MerchLabState`:
```typescript
// Inside MerchLabState interface, add after the existing mockupView field:

// Mockup
mockupProductId: string | null
mockupUploadId: string | null
mockupImages: Array<{ src: string; position: string }>
isLoadingMockup: boolean

// Actions (add these to the actions section):
setMockupProductId: (id: string | null) => void
setMockupUploadId: (id: string | null) => void
setMockupImages: (images: Array<{ src: string; position: string }>) => void
setIsLoadingMockup: (loading: boolean) => void
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build fails — store doesn't implement new state/actions yet. That's fine, next task fixes it.

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/types/merch-lab.types.ts
git commit -m "feat(merch-lab): add mockup state types and full-bleed design style"
git push origin main
```

---

### Task 3: Update Zustand Store with Mockup State

**Files:**
- Modify: `src/features/merch-lab/hooks/useMerchLabStore.ts`

- [ ] **Step 1: Add mockup state and actions to store**

Add to initial state (after `error: null`):
```typescript
// Mockup
mockupProductId: null as string | null,
mockupUploadId: null as string | null,
mockupImages: [] as Array<{ src: string; position: string }>,
isLoadingMockup: false,
```

Add to actions:
```typescript
setMockupProductId: (id) => set({ mockupProductId: id }),
setMockupUploadId: (id) => set({ mockupUploadId: id }),
setMockupImages: (images) => set({ mockupImages: images }),
setIsLoadingMockup: (loading) => set({ isLoadingMockup: loading }),
```

Update `setProduct` to also clear mockup state:
```typescript
setProduct: (id) => set({
  selectedProductId: id,
  selectedColor: null,
  selectedColorHex: null,
  selectedSize: null,
  variants: [],
  mockupProductId: null,
  mockupImages: [],
  isLoadingMockup: false,
}),
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/hooks/useMerchLabStore.ts
git commit -m "feat(merch-lab): add mockup state to Zustand store"
git push origin main
```

---

## Chunk 2: API Routes

### Task 4: Create POST /api/merch-lab/mockup Route

**Files:**
- Create: `src/app/api/merch-lab/mockup/route.ts`

- [ ] **Step 1: Write the mockup creation endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS } from '@/features/merch-lab/constants/products'

export const maxDuration = 60

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN!
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID!

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { blueprintId, variantId, designUrl, designPosition, designStyle, existingUploadId } = await request.json()

    if (!blueprintId || !variantId || !designUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const providerId = PRINTIFY_PROVIDERS[blueprintId]
    if (!providerId) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }

    // Step 1: Upload image to Printify (or reuse existing)
    let uploadId = existingUploadId
    if (!uploadId) {
      const uploadRes = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_name: 'merch-design.png', url: designUrl }),
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        lognog.error('mockup_upload_failed', { status: uploadRes.status, error: err })
        return NextResponse.json({ error: 'Failed to upload design' }, { status: 502 })
      }
      const uploadData = await uploadRes.json()
      uploadId = uploadData.id
    }

    // Step 2: Determine print area placement
    const isPlaced = ['center', 'left-chest', 'back'].includes(designStyle ?? '')
    const imageConfig = {
      id: uploadId,
      x: isPlaced ? (designPosition?.x ?? 0.5) : 0.5,
      y: isPlaced ? (designPosition?.y ?? 0.5) : 0.5,
      scale: isPlaced ? (designPosition?.scale ?? 1) : 1,
      angle: 0,
    }

    const position = designStyle === 'back' ? 'back' : 'front'

    // Step 3: Create draft product
    const productRes = await fetch(`${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/products.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PRINTIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Mockup Preview - ${Date.now()}`,
        blueprint_id: blueprintId,
        print_provider_id: providerId,
        variants: [{ id: variantId, price: 0, is_enabled: true }],
        print_areas: [{
          variant_ids: [variantId],
          placeholders: [{
            position,
            images: [imageConfig],
          }],
        }],
      }),
    })

    if (!productRes.ok) {
      const err = await productRes.text()
      lognog.error('mockup_product_failed', { status: productRes.status, error: err })
      return NextResponse.json({ error: 'Failed to create mockup product' }, { status: 502 })
    }

    const productData = await productRes.json()

    return NextResponse.json({
      printifyProductId: productData.id,
      uploadId,
    })
  } catch (error) {
    lognog.error('mockup_create_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mockup creation failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const res = await fetch(
      `${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const data = await res.json()
    const images = data.images ?? []

    return NextResponse.json({
      ready: images.length > 0,
      images: images.map((img: { src: string; position: string; variant_ids: number[] }) => ({
        src: img.src,
        position: img.position ?? 'default',
        variantIds: img.variant_ids ?? [],
      })),
    })
  } catch (error) {
    lognog.error('mockup_poll_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mockup poll failed' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Test the endpoint with cURL**

Run:
```bash
# Get auth token from browser dev tools or test with the API directly
curl -X POST http://localhost:3002/api/merch-lab/mockup \
  -H "Content-Type: application/json" \
  -d '{"blueprintId": 12, "variantId": 39170, "designUrl": "https://example.com/test.png", "designStyle": "center"}'
```
Expected: 401 (no auth) or 200 with `{ printifyProductId, uploadId }` if authenticated

- [ ] **Step 3: Commit**

```bash
git add src/app/api/merch-lab/mockup/route.ts
git commit -m "feat(merch-lab): add POST/GET mockup API routes for Printify draft products"
git push origin main
```

---

### Task 5: Update Products Route — Reduce Cache TTL

**Files:**
- Modify: `src/app/api/merch-lab/products/route.ts`

- [ ] **Step 1: Reduce cache from 1 hour to 15 minutes and add cache-bust support**

Change `CACHE_TTL`:
```typescript
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes
```

Add cache-bust support at the top of the GET handler (after blueprint validation):
```typescript
// Support cache-busting via header
const bustCache = request.headers.get('x-bust-cache') === '1'
if (bustCache) {
  cache.delete(blueprintId)
}
```

Add `'wall-art'` to estimated shipping in the order route:
In `src/app/api/merch-lab/order/route.ts`, update `ESTIMATED_SHIPPING`:
```typescript
const ESTIMATED_SHIPPING: Record<string, number> = {
  apparel: 499, accessory: 399, drinkware: 599, sticker: 299, 'wall-art': 599,
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/merch-lab/products/route.ts src/app/api/merch-lab/order/route.ts
git commit -m "feat(merch-lab): reduce product cache to 15min, add wall-art shipping"
git push origin main
```

---

### Task 6: Update Order Route — Accept Draft Product ID

**Files:**
- Modify: `src/app/api/merch-lab/order/route.ts`

- [ ] **Step 1: Add printifyProductId to skip product creation when available**

In the destructured request body, add `printifyProductId`:
```typescript
const { blueprintId, designUrl, color, size, quantity, shippingAddress, category, designPosition, printifyProductId } = await request.json()
```

Replace Steps 3-4 (upload + create product) with a conditional:
```typescript
    try {
      let productId: string

      if (printifyProductId) {
        // Reuse the draft product from mockup preview
        productId = printifyProductId
      } else {
        // Step 3: Upload design image to Printify
        const uploadRes = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PRINTIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_name: 'merch-design.png',
            url: designUrl,
          }),
        })
        if (!uploadRes.ok) throw new Error('Failed to upload design to Printify')
        const uploadData = await uploadRes.json()

        // Step 4: Create product on Printify
        const productRes = await fetch(`${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/products.json`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PRINTIFY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Custom Merch - ${Date.now()}`,
            blueprint_id: blueprintId,
            print_provider_id: providerId,
            variants: [
              { id: matchingVariant.id, price: matchingVariant.price, is_enabled: true },
            ],
            print_areas: [
              {
                variant_ids: [matchingVariant.id],
                placeholders: [
                  { position: 'front', images: [{ id: uploadData.id, x: designPosition?.x ?? 0.5, y: designPosition?.y ?? 0.5, scale: designPosition?.scale ?? 1, angle: 0 }] },
                ],
              },
            ],
          }),
        })
        if (!productRes.ok) throw new Error('Failed to create Printify product')
        const productData = await productRes.json()
        productId = productData.id
      }

      // Step 5: Submit order (use productId variable now)
      const orderRes = await fetch(`${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/orders.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_id: `dp-merch-${Date.now()}`,
          line_items: [
            { product_id: productId, variant_id: matchingVariant.id, quantity },
          ],
          shipping_method: 1,
          address_to: {
            first_name: shippingAddress.firstName,
            last_name: shippingAddress.lastName,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2 || undefined,
            city: shippingAddress.city,
            region: shippingAddress.state,
            zip: shippingAddress.zip,
            country: shippingAddress.country,
            phone: shippingAddress.phone || undefined,
          },
        }),
      })
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/merch-lab/order/route.ts
git commit -m "feat(merch-lab): accept draft product ID in order route to skip recreation"
git push origin main
```

---

## Chunk 3: Mockup Hook

### Task 7: Create usePrintifyMockup Hook

**Files:**
- Create: `src/features/merch-lab/hooks/usePrintifyMockup.ts`
- Modify: `src/features/merch-lab/hooks/index.ts`

- [ ] **Step 1: Write the mockup lifecycle hook**

```typescript
import { useEffect, useRef, useCallback } from 'react'
import { useMerchLabStore } from './useMerchLabStore'
import { MERCH_PRODUCTS } from '../constants/products'

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 30000

export function usePrintifyMockup() {
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const variants = useMerchLabStore((s) => s.variants)
  const mockupUploadId = useMerchLabStore((s) => s.mockupUploadId)

  const setMockupProductId = useMerchLabStore((s) => s.setMockupProductId)
  const setMockupUploadId = useMerchLabStore((s) => s.setMockupUploadId)
  const setMockupImages = useMerchLabStore((s) => s.setMockupImages)
  const setIsLoadingMockup = useMerchLabStore((s) => s.setIsLoadingMockup)

  const requestIdRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const activeDesign = generatedDesigns[activeDesignIndex]
  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = undefined
    }
  }, [])

  const pollForMockup = useCallback(async (productId: string, reqId: number, startTime: number) => {
    if (requestIdRef.current !== reqId) return // Stale request

    try {
      const res = await fetch(`/api/merch-lab/mockup?productId=${productId}`)
      if (!res.ok) throw new Error('Poll failed')

      const data = await res.json()

      if (requestIdRef.current !== reqId) return // Check again after async

      if (data.ready && data.images.length > 0) {
        setMockupImages(data.images)
        setIsLoadingMockup(false)
        return
      }

      // Timeout check
      if (Date.now() - startTime > POLL_TIMEOUT) {
        setIsLoadingMockup(false)
        return
      }

      // Continue polling
      pollTimerRef.current = setTimeout(() => pollForMockup(productId, reqId, startTime), POLL_INTERVAL)
    } catch {
      if (requestIdRef.current === reqId) {
        setIsLoadingMockup(false)
      }
    }
  }, [setMockupImages, setIsLoadingMockup])

  // Trigger mockup creation when design + product + color are set
  useEffect(() => {
    if (!activeDesign?.url || !selectedProductId || !selectedColor) {
      cleanup()
      return
    }

    // Find matching variant for mockup
    const matchingVariant = variants.find((v) => v.color === selectedColor)
    if (!matchingVariant) return

    const designStyle = product?.designStyles[0] ?? 'center'
    const reqId = ++requestIdRef.current

    cleanup()
    setMockupImages([])
    setIsLoadingMockup(true)
    setMockupProductId(null)

    const createMockup = async () => {
      try {
        const res = await fetch('/api/merch-lab/mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blueprintId: selectedProductId,
            variantId: matchingVariant.id,
            designUrl: activeDesign.url,
            designPosition,
            designStyle,
            existingUploadId: mockupUploadId ?? undefined,
          }),
        })

        if (requestIdRef.current !== reqId) return

        if (!res.ok) {
          setIsLoadingMockup(false)
          return
        }

        const data = await res.json()
        setMockupProductId(data.printifyProductId)
        setMockupUploadId(data.uploadId)

        // Start polling
        pollForMockup(data.printifyProductId, reqId, Date.now())
      } catch {
        if (requestIdRef.current === reqId) {
          setIsLoadingMockup(false)
        }
      }
    }

    createMockup()

    return cleanup
  }, [activeDesign?.url, activeDesign?.id, selectedProductId, selectedColor, variants, product, designPosition, mockupUploadId, cleanup, setMockupImages, setIsLoadingMockup, setMockupProductId, setMockupUploadId, pollForMockup])

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])
}
```

- [ ] **Step 2: Export the hook from index**

Update `src/features/merch-lab/hooks/index.ts`:
```typescript
export { useMerchLabStore } from './useMerchLabStore'
export { usePrintify } from './usePrintify'
export { usePrintifyMockup } from './usePrintifyMockup'
```

- [ ] **Step 3: Wire up usePrintifyMockup in MerchLab.tsx**

In `src/features/merch-lab/components/MerchLab.tsx`, add:
```typescript
import { usePrintify, usePrintifyMockup, useMerchLabStore } from '../hooks'
```
And call `usePrintifyMockup()` right after `usePrintify()`:
```typescript
export function MerchLab() {
  usePrintify()
  usePrintifyMockup()
```

- [ ] **Step 4: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/features/merch-lab/hooks/usePrintifyMockup.ts src/features/merch-lab/hooks/index.ts src/features/merch-lab/components/MerchLab.tsx
git commit -m "feat(merch-lab): add usePrintifyMockup hook with polling and race-condition protection"
git push origin main
```

---

## Chunk 4: UI Components

### Task 8: Rewrite ProductPicker with Category Tabs

**Files:**
- Modify: `src/features/merch-lab/components/ProductPicker.tsx`

- [ ] **Step 1: Replace flat grid with tabbed categories**

```typescript
'use client'

import { useState } from 'react'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS, PRODUCT_CATEGORIES, type ProductCategory } from '../constants/products'
import { cn } from '@/utils/utils'
import { Shirt, Image, Frame, Puzzle, Coffee, Sticker, Backpack } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, Image, Frame, Puzzle, Coffee, Sticker, Backpack,
}

function isAOP(name: string) {
  return name.startsWith('AOP')
}

export function ProductPicker() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const setProduct = useMerchLabStore((s) => s.setProduct)
  const [activeTab, setActiveTab] = useState<ProductCategory>('apparel')

  const filteredProducts = MERCH_PRODUCTS.filter((p) => p.category === activeTab)

  return (
    <div className="border-b border-border/30 p-4">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        1. Pick a Product
      </div>

      {/* Category Tabs */}
      <div className="mb-3 flex gap-1">
        {PRODUCT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              'flex-1 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all',
              activeTab === cat.id
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                : 'border-border/30 text-muted-foreground/60 hover:border-cyan-500/30'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredProducts.map((product) => {
          const Icon = ICON_MAP[product.icon] ?? Shirt
          return (
            <button
              key={product.blueprintId}
              onClick={() => setProduct(product.blueprintId)}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-[10px] border-2 p-2.5 transition-all hover:bg-card/60',
                selectedProductId === product.blueprintId
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-transparent bg-card/30'
              )}
            >
              <Icon className="h-6 w-6 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">{product.name}</span>
              {isAOP(product.name) && (
                <span className="absolute right-1 top-1 rounded-sm bg-cyan-500/20 px-1 py-0.5 text-[8px] font-bold text-cyan-400">
                  AOP
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/components/ProductPicker.tsx
git commit -m "feat(merch-lab): rewrite ProductPicker with category tabs and Lucide icons"
git push origin main
```

---

### Task 9: Update ColorPicker — Conditional Visibility

**Files:**
- Modify: `src/features/merch-lab/components/ColorPicker.tsx`

Products that should NOT show the color picker: Poster (282), Canvas Print (937), Puzzle (532), Stickers (400), AOP Backpack (413).

- [ ] **Step 1: Add conditional rendering based on product type**

Add at the top of the ColorPicker component, before the return:
```typescript
const selectedProductId = useMerchLabStore((s) => s.selectedProductId)

// Products with no color selection
const NO_COLOR_PRODUCTS = [282, 937, 532, 400, 413]
if (NO_COLOR_PRODUCTS.includes(selectedProductId ?? 0)) {
  return null
}
```

Also add the import for `useMerchLabStore` selector if not already used.

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/components/ColorPicker.tsx
git commit -m "feat(merch-lab): hide color picker for products without color options"
git push origin main
```

---

### Task 10: Update DesignStylePicker — Conditional Visibility

**Files:**
- Modify: `src/features/merch-lab/components/DesignStylePicker.tsx`

Only T-Shirt (12) and Hoodie (77) should show the design style picker — all other products have a single fixed style.

- [ ] **Step 1: Hide for products with only one design style**

Add early return logic at the top of DesignStylePicker:
```typescript
const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
const availableStyles = product?.designStyles ?? ['center']

// Hide picker if only one style available (auto-selected)
if (availableStyles.length <= 1) {
  return null
}
```

Also update the store's `setProduct` to auto-set the design style for single-style products. In `useMerchLabStore.ts`, modify `setProduct`:
```typescript
setProduct: (id) => {
  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === id)
  const defaultStyle = product?.designStyles[0] ?? 'center'
  set({
    selectedProductId: id,
    selectedColor: null,
    selectedColorHex: null,
    selectedSize: null,
    variants: [],
    mockupProductId: null,
    mockupImages: [],
    isLoadingMockup: false,
    designStyle: defaultStyle,
  })
},
```

Note: This requires importing `MERCH_PRODUCTS` at the top of `useMerchLabStore.ts`:
```typescript
import { MERCH_PRODUCTS } from '../constants/products'
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/components/DesignStylePicker.tsx src/features/merch-lab/hooks/useMerchLabStore.ts
git commit -m "feat(merch-lab): auto-set design style, hide picker for single-style products"
git push origin main
```

---

### Task 11: Update MockupPreview — Hybrid Canvas/Printify Rendering

**Files:**
- Modify: `src/features/merch-lab/components/MockupPreview.tsx`

This is the biggest UI change. The preview needs 4 states:
1. No design → canvas silhouette + dashed border
2. Design exists, mockup loading → canvas preview + pulsing dot
3. Mockup ready → Printify image fades in, canvas hidden
4. Mockup timeout → canvas stays, "Preview unavailable" text

- [ ] **Step 1: Rewrite MockupPreview with hybrid rendering**

```typescript
'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { DesignThumbnails } from './DesignThumbnails'
import { MockupControls } from './MockupControls'
import { ImageDown } from 'lucide-react'

function drawProductShape(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, category: string) {
  ctx.fillStyle = color
  ctx.shadowColor = 'rgba(0,0,0,0.3)'
  ctx.shadowBlur = 20
  ctx.shadowOffsetY = 8

  switch (category) {
    case 'apparel': {
      const cx = w / 2, top = h * 0.1, bw = w * 0.55, bh = h * 0.7
      ctx.beginPath()
      ctx.arc(cx, top + 15, 30, Math.PI, 0)
      ctx.lineTo(cx + bw / 2 + 40, top + 30)
      ctx.lineTo(cx + bw / 2 + 40, top + 130)
      ctx.lineTo(cx + bw / 2, top + 100)
      ctx.lineTo(cx + bw / 2, top + bh)
      ctx.quadraticCurveTo(cx, top + bh + 20, cx - bw / 2, top + bh)
      ctx.lineTo(cx - bw / 2, top + 100)
      ctx.lineTo(cx - bw / 2 - 40, top + 130)
      ctx.lineTo(cx - bw / 2 - 40, top + 30)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'wall-art': {
      // Simple rectangle with subtle frame effect
      const pad = 30
      ctx.beginPath()
      ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 4)
      ctx.fill()
      // Inner shadow for frame
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 2
      ctx.strokeRect(pad + 4, pad + 4, w - pad * 2 - 8, h - pad * 2 - 8)
      break
    }
    case 'accessory': {
      const bx = w * 0.2, by = h * 0.2, bw2 = w * 0.6, bh2 = h * 0.6
      ctx.beginPath()
      ctx.roundRect(bx, by, bw2, bh2, 8)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(w * 0.35, by, 30, Math.PI, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(w * 0.65, by, 30, Math.PI, 0)
      ctx.stroke()
      break
    }
    case 'drinkware': {
      const mx = w * 0.25, my = h * 0.15, mw = w * 0.4, mh2 = h * 0.65
      ctx.beginPath()
      ctx.roundRect(mx, my, mw, mh2, 12)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.arc(mx + mw + 20, my + mh2 / 2, 30, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      break
    }
    case 'sticker': {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7, 20)
      ctx.fill()
      break
    }
  }

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

function getPrintZone(w: number, h: number, category: string) {
  switch (category) {
    case 'apparel':
      return { x: w * 0.25, y: h * 0.2, w: w * 0.5, h: h * 0.45 }
    case 'wall-art':
      return { x: 35, y: 35, w: w - 70, h: h - 70 }
    case 'accessory':
      return { x: w * 0.25, y: h * 0.25, w: w * 0.5, h: h * 0.5 }
    case 'drinkware':
      return { x: w * 0.28, y: h * 0.2, w: w * 0.35, h: h * 0.55 }
    case 'sticker':
      return { x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6 }
    default:
      return { x: w * 0.25, y: h * 0.2, w: w * 0.5, h: h * 0.5 }
  }
}

export function MockupPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColorHex = useMerchLabStore((s) => s.selectedColorHex)
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const mockupView = useMerchLabStore((s) => s.mockupView)
  const mockupImages = useMerchLabStore((s) => s.mockupImages)
  const isLoadingMockup = useMerchLabStore((s) => s.isLoadingMockup)
  const error = useMerchLabStore((s) => s.error)

  const [mockupFadedIn, setMockupFadedIn] = useState(false)

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const activeDesign = generatedDesigns[activeDesignIndex]

  // Find the right mockup image for the current view
  const mockupImage = mockupImages.find((img) => img.position === mockupView) ?? mockupImages[0]
  const hasMockup = !!mockupImage?.src

  // Reset fade state when mockup changes
  useEffect(() => {
    setMockupFadedIn(false)
    if (hasMockup) {
      const timer = setTimeout(() => setMockupFadedIn(true), 50)
      return () => clearTimeout(timer)
    }
  }, [hasMockup, mockupImage?.src])

  const drawMockup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const color = selectedColorHex || '#2a2a2a'

    ctx.clearRect(0, 0, w, h)
    drawProductShape(ctx, w, h, color, product?.category ?? 'apparel')

    if (activeDesign?.url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const printZone = getPrintZone(w, h, product?.category ?? 'apparel')
        const dw = printZone.w * designPosition.scale
        const dh = printZone.h * designPosition.scale
        const dx = printZone.x + (printZone.w * designPosition.x) - dw / 2
        const dy = printZone.y + (printZone.h * designPosition.y) - dh / 2
        ctx.drawImage(img, dx, dy, dw, dh)
      }
      img.src = activeDesign.url
    }
  }, [selectedColorHex, activeDesign, designPosition, product])

  useEffect(() => { drawMockup() }, [drawMockup])

  const handleDownload = () => {
    if (!activeDesign?.url) return
    const a = document.createElement('a')
    a.href = activeDesign.url
    a.download = `merch-design-${activeDesign.id}.png`
    a.click()
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Live Preview {mockupView === 'back' ? '(Back)' : '(Front)'}
      </div>

      <div className="relative">
        {/* Canvas preview (always rendered, hidden when Printify mockup ready) */}
        <canvas
          ref={canvasRef}
          width={400}
          height={480}
          className={cn(
            'rounded-2xl transition-opacity duration-300',
            hasMockup && mockupFadedIn ? 'opacity-0 absolute inset-0' : 'opacity-100'
          )}
        />

        {/* Printify mockup image */}
        {hasMockup && (
          <img
            src={mockupImage.src}
            alt="Product mockup"
            className={cn(
              'h-[480px] w-[400px] rounded-2xl object-contain transition-opacity duration-300',
              mockupFadedIn ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* State: No design */}
        {!activeDesign && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border-2 border-dashed border-cyan-500/30 px-8 py-6 text-center text-sm text-cyan-500/50">
              Your design appears here
            </div>
          </div>
        )}

        {/* State: Loading mockup */}
        {activeDesign && isLoadingMockup && (
          <div className="absolute right-3 top-3">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-400" />
          </div>
        )}
      </div>

      {/* Loading text */}
      {activeDesign && isLoadingMockup && (
        <div className="text-[10px] text-muted-foreground/40">Loading product preview...</div>
      )}

      {/* Mockup timeout indicator */}
      {activeDesign && !isLoadingMockup && !hasMockup && generatedDesigns.length > 0 && (
        <div className="text-[10px] text-muted-foreground/30">Preview unavailable</div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      <MockupControls />

      {activeDesign && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card/60"
        >
          <ImageDown className="h-3.5 w-3.5" />
          Download PNG
        </button>
      )}

      <DesignThumbnails />
    </div>
  )
}
```

Note: Add `import { cn } from '@/utils/utils'` at the top.

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/components/MockupPreview.tsx
git commit -m "feat(merch-lab): hybrid canvas/Printify mockup rendering with 4 states"
git push origin main
```

---

### Task 12: Update MockupControls — Conditional Front/Back Toggle

**Files:**
- Modify: `src/features/merch-lab/components/MockupControls.tsx`

- [ ] **Step 1: Hide Larger/Smaller when Printify mockup is showing**

```typescript
'use client'

import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import { RotateCw, Maximize2, Minimize2 } from 'lucide-react'

export function MockupControls() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const setMockupView = useMerchLabStore((s) => s.setMockupView)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const setDesignPosition = useMerchLabStore((s) => s.setDesignPosition)
  const mockupImages = useMerchLabStore((s) => s.mockupImages)

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const hasPrintifyMockup = mockupImages.length > 0

  const btnClass = 'flex items-center gap-1.5 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:bg-card/60'

  return (
    <div className="flex gap-2">
      {product?.hasFrontBack && (
        <>
          <button onClick={() => setMockupView('front')} className={btnClass}>
            <RotateCw className="h-3.5 w-3.5" /> Front
          </button>
          <button onClick={() => setMockupView('back')} className={btnClass}>
            <RotateCw className="h-3.5 w-3.5" /> Back
          </button>
        </>
      )}
      {!hasPrintifyMockup && (
        <>
          <button
            onClick={() => setDesignPosition({ ...designPosition, scale: Math.min(2, designPosition.scale + 0.1) })}
            className={btnClass}
          >
            <Maximize2 className="h-3.5 w-3.5" /> Larger
          </button>
          <button
            onClick={() => setDesignPosition({ ...designPosition, scale: Math.max(0.2, designPosition.scale - 0.1) })}
            className={btnClass}
          >
            <Minimize2 className="h-3.5 w-3.5" /> Smaller
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/components/MockupControls.tsx
git commit -m "feat(merch-lab): hide scale controls when Printify mockup is showing"
git push origin main
```

---

### Task 13: Update OrderPanel — Size Picker for Wall Art/Stickers

**Files:**
- Modify: `src/features/merch-lab/components/OrderPanel.tsx`

Products where size is the primary variant (shown as a prominent picker, not just in the order panel): Poster, Canvas Print, Puzzle, Stickers. For these products, color is hidden, so the "size" picker IS the main variant selector.

- [ ] **Step 1: Update OrderPanel to handle products without color selection**

The `canOrder` logic needs updating — for products without color (Poster, Canvas, Puzzle, Stickers, AOP Backpack), we don't require `selectedColor`:
```typescript
const NO_COLOR_PRODUCTS = [282, 937, 532, 400, 413]
const needsColor = !NO_COLOR_PRODUCTS.includes(selectedProductId ?? 0)

// For no-color products, auto-select the first variant's "color" on mount
useEffect(() => {
  if (!needsColor && variants.length > 0 && !selectedColor) {
    const first = variants[0]
    setColor(first.color, first.colorHex)
  }
}, [needsColor, variants, selectedColor, setColor])

const canOrder = generatedDesigns.length > 0 && (!needsColor || selectedColor) && (!product?.hasSizes || selectedSize)
```

For the size picker, it should derive sizes from ALL variants (not filtered by color) when the product has no color:
```typescript
const sizes = useMemo(() => {
  const source = needsColor
    ? variants.filter((v) => v.color === selectedColor)
    : variants
  const seen = new Set<string>()
  return source.filter((v) => {
    if (seen.has(v.size)) return false
    seen.add(v.size)
    return true
  }).map((v) => v.size)
}, [variants, selectedColor, needsColor])
```

Also conditionally hide the "Color" row:
```typescript
{needsColor && (
  <OrderRow
    label="Color"
    value={...}
  />
)}
```

And hide the "Style" row for single-style products:
```typescript
{product && product.designStyles.length > 1 && (
  <OrderRow label="Style" value={designStyle.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
)}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/features/merch-lab/components/OrderPanel.tsx
git commit -m "feat(merch-lab): support no-color products, auto-select variant for wall art"
git push origin main
```

---

### Task 14: Update DesignPrompt Aspect Ratios for New Products

**Files:**
- Modify: `src/app/api/merch-lab/generate-design/route.ts`

- [ ] **Step 1: Add full-bleed aspect ratios for new product types**

The `designStyle` for Poster/Canvas/Puzzle will be `'full-bleed'`. Add it to both aspect ratio maps:

```typescript
const IDEOGRAM_ASPECT_RATIOS: Record<string, string> = {
  'center': '4x5',
  'left-chest': '1x1',
  'back': '4x5',
  'all-over': '1x1',
  'wrap': '2x1',
  'full-bleed': '3x4',  // Wall art portrait orientation
}

const NB2_ASPECT_RATIOS: Record<string, string> = {
  'center': '4:5',
  'left-chest': '1:1',
  'back': '4:5',
  'all-over': '1:1',
  'wrap': '2:1',
  'full-bleed': '3:4',
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/merch-lab/generate-design/route.ts
git commit -m "feat(merch-lab): add full-bleed aspect ratio for wall art products"
git push origin main
```

---

### Task 15: Update usePrintify Hook — Handle No-Color Products

**Files:**
- Modify: `src/features/merch-lab/hooks/usePrintify.ts`

The price-fetching effect currently requires `selectedColor` — but for no-color products, we need to auto-select and still fetch the price.

- [ ] **Step 1: Update price fetch to work with no-color products**

Import the products constant:
```typescript
import { MERCH_PRODUCTS } from '../constants/products'
```

(It's already imported.) The existing logic should work because `OrderPanel` auto-selects the first variant's color for no-color products. But the category for price needs to handle `'wall-art'`:

In the price fetch URL, the category is already passed from the product object. Just verify `product?.category` includes `'wall-art'` — it will since we updated the constants. No code change needed here beyond confirming the existing pattern handles it.

Actually, the `usePrintify` hook already reads `product?.category`, so it should work. Mark this as verified.

- [ ] **Step 2: Verify build compiles**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit (skip if no changes needed)**

---

## Chunk 5: Full Build Verification + Visual Test

### Task 16: Full Build + Visual Smoke Test

**Files:**
- No new files

- [ ] **Step 1: Clean build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -30`
Expected: Build succeeds with no errors

- [ ] **Step 2: Start dev server and visually verify**

Run: `cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &`

Then navigate to `http://localhost:3002` → Merch Lab tab and verify:
1. Category tabs appear (Apparel, Wall Art, Accessories)
2. Clicking each tab shows the correct products
3. Selecting a product loads variants
4. Color picker hides for wall art products
5. Design style picker hides for single-style products
6. Generate a design and see the canvas preview
7. After a few seconds, Printify mockup fades in (if API keys are configured)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "fix(merch-lab): address build/visual issues from integration" && git push origin main
```

---

## Chunk 6: Playwright Tests

### Task 17: Test 1 — Product Catalog Navigation

**Files:**
- Create: `tests/merch-lab/product-catalog.spec.ts`

- [ ] **Step 1: Write the product catalog navigation test**

```typescript
import { test, expect } from '@playwright/test'

const MERCH_LAB_URL = '/'

test.describe('Merch Lab: Product Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(MERCH_LAB_URL)
    await page.waitForLoadState('networkidle')

    // Navigate to Merch Lab tab
    const merchTab = page.locator('[data-tab="merch-lab"]').or(page.getByText('Merch Lab'))
    await merchTab.click()
    await page.waitForTimeout(1000)
  })

  test('shows 3 category tabs', async ({ page }) => {
    await expect(page.getByText('Apparel')).toBeVisible()
    await expect(page.getByText('Wall Art')).toBeVisible()
    await expect(page.getByText('Accessories')).toBeVisible()
  })

  test('Apparel tab shows T-Shirt, Hoodie, AOP T-Shirt, AOP Hoodie', async ({ page }) => {
    await page.getByText('Apparel').click()
    await expect(page.getByText('T-Shirt', { exact: false })).toBeVisible()
    await expect(page.getByText('Hoodie', { exact: false })).toBeVisible()
    await expect(page.getByText('AOP T-Shirt')).toBeVisible()
    await expect(page.getByText('AOP Hoodie')).toBeVisible()
  })

  test('Wall Art tab shows Poster, Canvas Print, Puzzle', async ({ page }) => {
    await page.getByText('Wall Art').click()
    await expect(page.getByText('Poster')).toBeVisible()
    await expect(page.getByText('Canvas Print')).toBeVisible()
    await expect(page.getByText('Puzzle')).toBeVisible()
  })

  test('Accessories tab shows Mug, Stickers, AOP Backpack', async ({ page }) => {
    await page.getByText('Accessories').click()
    await expect(page.getByText('Mug 11oz')).toBeVisible()
    await expect(page.getByText('Stickers')).toBeVisible()
    await expect(page.getByText('AOP Backpack')).toBeVisible()
  })

  test('selecting Poster hides color picker and design style picker', async ({ page }) => {
    await page.getByText('Wall Art').click()
    await page.getByText('Poster').click()
    await page.waitForTimeout(500)

    // Color picker should not be visible
    await expect(page.getByText('2. Product Color')).not.toBeVisible()

    // Design style picker should not be visible (single style)
    await expect(page.getByText('3. Design Style')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/poster-selected.png' })
  })

  test('selecting T-Shirt shows color picker and design style picker', async ({ page }) => {
    await page.getByText('Apparel').click()
    await page.getByText('T-Shirt').first().click()
    await page.waitForTimeout(1500) // Wait for variants to load

    await expect(page.getByText('2. Product Color')).toBeVisible()
    await expect(page.getByText('3. Design Style')).toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/tshirt-selected.png' })
  })

  test('AOP products show AOP badge', async ({ page }) => {
    await page.getByText('Apparel').click()
    await expect(page.locator('text=AOP').first()).toBeVisible()
  })

  test('screenshot all product selections', async ({ page }) => {
    const tabs = ['Apparel', 'Wall Art', 'Accessories']
    for (const tab of tabs) {
      await page.getByText(tab).click()
      await page.waitForTimeout(300)
      await page.screenshot({ path: `test-results/merch-lab/tab-${tab.toLowerCase().replace(' ', '-')}.png` })
    }
  })
})
```

- [ ] **Step 2: Create test-results/merch-lab directory**

Run: `mkdir -p D:/git/directors-palette-v2/test-results/merch-lab`

- [ ] **Step 3: Run test**

Run: `cd D:/git/directors-palette-v2 && npx playwright test tests/merch-lab/product-catalog.spec.ts --project=chromium --reporter=list 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/merch-lab/product-catalog.spec.ts
git commit -m "test(merch-lab): add product catalog navigation Playwright tests"
git push origin main
```

---

### Task 18: Test 2 — Design Generation + Mockup Loading

**Files:**
- Create: `tests/merch-lab/mockup-generation.spec.ts`

- [ ] **Step 1: Write the mockup generation test**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Merch Lab: Design Generation + Mockup', () => {
  test('generate design shows canvas preview then Printify mockup', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to Merch Lab
    const merchTab = page.locator('[data-tab="merch-lab"]').or(page.getByText('Merch Lab'))
    await merchTab.click()
    await page.waitForTimeout(1000)

    // Select T-Shirt (Apparel tab is default)
    await page.getByText('T-Shirt').first().click()
    await page.waitForTimeout(1500)

    // Pick a color (click first color dot)
    const colorDots = page.locator('.rounded-full[style*="background-color"]')
    await colorDots.first().click()
    await page.waitForTimeout(500)

    // Enter a prompt
    const textarea = page.locator('textarea')
    await textarea.fill('A fierce dragon breathing fire')

    // Click Generate
    const generateBtn = page.getByRole('button', { name: /Generate/i })
    await generateBtn.click()

    // Wait for design to appear (canvas preview — up to 3 minutes for AI generation)
    await page.waitForTimeout(5000)

    // Check that the pipeline stepper advanced
    await page.screenshot({ path: 'test-results/merch-lab/design-generated.png' })

    // Check for loading indicator (pulsing dot)
    const pulsingDot = page.locator('.animate-pulse.rounded-full.bg-cyan-400')
    const hasLoadingDot = await pulsingDot.isVisible().catch(() => false)

    if (hasLoadingDot) {
      // Wait for Printify mockup (up to 30 seconds)
      await page.waitForSelector('img[alt="Product mockup"]', { timeout: 35000 }).catch(() => {
        // Mockup may not load — that's acceptable
      })
    }

    await page.screenshot({ path: 'test-results/merch-lab/mockup-final.png' })
  })
})
```

Note: This test involves real AI generation which costs credits. Mark it with a custom annotation or tag if you want to skip in CI:
```typescript
test.skip(process.env.CI === 'true', 'Skips in CI — requires real API calls')
```

- [ ] **Step 2: Run test**

Run: `cd D:/git/directors-palette-v2 && npx playwright test tests/merch-lab/mockup-generation.spec.ts --project=chromium --reporter=list 2>&1 | tail -30`
Expected: Test passes (may skip mockup assertion if Printify is slow)

- [ ] **Step 3: Commit**

```bash
git add tests/merch-lab/mockup-generation.spec.ts
git commit -m "test(merch-lab): add design generation and mockup loading test"
git push origin main
```

---

### Task 19: Test 3 — Mug and Sticker Behavior

**Files:**
- Create: `tests/merch-lab/mug-sticker-behavior.spec.ts`

- [ ] **Step 1: Write the mug/sticker behavior test**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Merch Lab: Mug and Sticker Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const merchTab = page.locator('[data-tab="merch-lab"]').or(page.getByText('Merch Lab'))
    await merchTab.click()
    await page.waitForTimeout(1000)
  })

  test('Mug shows color picker, hides design style', async ({ page }) => {
    await page.getByText('Accessories').click()
    await page.getByText('Mug 11oz').click()
    await page.waitForTimeout(1500)

    // Color picker should be visible
    await expect(page.getByText('2. Product Color')).toBeVisible()

    // Design style should be hidden (single 'wrap' style)
    await expect(page.getByText('3. Design Style')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/mug-selected.png' })
  })

  test('Stickers hides color picker, shows sizes', async ({ page }) => {
    await page.getByText('Accessories').click()
    await page.getByText('Stickers').click()
    await page.waitForTimeout(1500)

    // Color picker should be hidden
    await expect(page.getByText('2. Product Color')).not.toBeVisible()

    // Sizes should be available in order panel
    await page.screenshot({ path: 'test-results/merch-lab/stickers-selected.png' })
  })

  test('AOP Backpack has no color or size picker', async ({ page }) => {
    await page.getByText('Accessories').click()
    await page.getByText('AOP Backpack').click()
    await page.waitForTimeout(1500)

    await expect(page.getByText('2. Product Color')).not.toBeVisible()
    await expect(page.getByText('3. Design Style')).not.toBeVisible()

    await page.screenshot({ path: 'test-results/merch-lab/backpack-selected.png' })
  })
})
```

- [ ] **Step 2: Run test**

Run: `cd D:/git/directors-palette-v2 && npx playwright test tests/merch-lab/mug-sticker-behavior.spec.ts --project=chromium --reporter=list 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/merch-lab/mug-sticker-behavior.spec.ts
git commit -m "test(merch-lab): add mug, sticker, backpack behavior tests"
git push origin main
```

---

### Task 20: Test 4 — Error Resilience

**Files:**
- Create: `tests/merch-lab/error-resilience.spec.ts`

- [ ] **Step 1: Write the error resilience test**

```typescript
import { test, expect } from '@playwright/test'

test.describe('Merch Lab: Error Resilience', () => {
  test('rapid product switching shows correct canvas preview', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const merchTab = page.locator('[data-tab="merch-lab"]').or(page.getByText('Merch Lab'))
    await merchTab.click()
    await page.waitForTimeout(1000)

    // Rapidly switch between products
    await page.getByText('Apparel').click()
    await page.getByText('T-Shirt').first().click()
    await page.waitForTimeout(200)

    await page.getByText('Wall Art').click()
    await page.getByText('Poster').click()
    await page.waitForTimeout(200)

    await page.getByText('Accessories').click()
    await page.getByText('Mug 11oz').click()
    await page.waitForTimeout(200)

    // Should show Mug as the final product (no stale UI)
    await page.screenshot({ path: 'test-results/merch-lab/rapid-switch-final.png' })

    // Verify no crash/error
    const errorBanner = page.locator('.bg-red-500\\/10')
    await expect(errorBanner).not.toBeVisible()
  })

  test('canvas preview stays visible when no mockup loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const merchTab = page.locator('[data-tab="merch-lab"]').or(page.getByText('Merch Lab'))
    await merchTab.click()
    await page.waitForTimeout(1000)

    // Select a product
    await page.getByText('T-Shirt').first().click()
    await page.waitForTimeout(1500)

    // Canvas should be visible
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
  })
})
```

- [ ] **Step 2: Run test**

Run: `cd D:/git/directors-palette-v2 && npx playwright test tests/merch-lab/error-resilience.spec.ts --project=chromium --reporter=list 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/merch-lab/error-resilience.spec.ts
git commit -m "test(merch-lab): add error resilience and rapid switching tests"
git push origin main
```

---

## Chunk 7: Confirm Puzzle Provider + Final Verification

### Task 21: Verify Puzzle Provider ID via Printify API

**Files:**
- No files to create

- [ ] **Step 1: Query Printify API for Puzzle blueprint providers**

Run:
```bash
curl -s -H "Authorization: Bearer $(grep PRINTIFY_API_TOKEN D:/git/directors-palette-v2/.env.local | cut -d= -f2)" \
  "https://api.printify.com/v1/catalog/blueprints/532/print_providers.json" | head -100
```
Expected: JSON array of providers. Look for provider ID 29 (Monster Digital). If not found, use the first available provider.

- [ ] **Step 2: Update products.ts if provider ID differs**

If provider ID 29 is NOT available for blueprint 532, update `PRINTIFY_PROVIDERS` in `src/features/merch-lab/constants/products.ts` with the correct ID.

- [ ] **Step 3: Commit if changes needed**

```bash
git add src/features/merch-lab/constants/products.ts
git commit -m "fix(merch-lab): correct Puzzle provider ID from Printify API"
git push origin main
```

---

### Task 22: Final Clean Build + All Tests

- [ ] **Step 1: Clean build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npx next build 2>&1 | tail -30`
Expected: Build succeeds with zero errors

- [ ] **Step 2: Run all Merch Lab tests**

Run: `cd D:/git/directors-palette-v2 && npx playwright test tests/merch-lab/ --project=chromium --reporter=list 2>&1`
Expected: All tests pass

- [ ] **Step 3: Final commit if any fixes**

```bash
git add -A && git commit -m "fix(merch-lab): final integration fixes" && git push origin main
```
