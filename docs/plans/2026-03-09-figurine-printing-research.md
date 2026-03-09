# Figurine Studio - Physical Printing API Research

**Date:** 2026-03-09
**Goal:** Find APIs to chain: User Image → AI 3D Model → Physical Print + Ship

---

## The Pipeline

```
User Image → [Image-to-3D API] → GLB/OBJ file → [Print Fulfillment API] → Physical figurine shipped
```

We already have Step 1 (Replicate Trellis). We need Step 2.

---

## Part 1: Image-to-3D APIs (we already have this)

| Service | Cost | Speed | Output | Notes |
|---------|------|-------|--------|-------|
| **Replicate Trellis** (current) | $0.046/run | ~33s | GLB | Already integrated, 687K runs |
| **Meshy API** | 20-30 credits ($0.20-0.30) | ~30s | GLB, OBJ, FBX, USDZ | Better quality, PBR textures, multi-image support |
| **Tripo AI** | $0.20-0.40 | Fast | GLB, OBJ | v3.0 has "sculpture-level geometry precision" |

**Verdict:** Trellis works for now. Could upgrade to Meshy or Tripo later for better print-ready quality.

---

## Part 2: Print Fulfillment APIs

### Option A: Sculpteo (BEST FIT)

**What:** Professional 3D printing service with REST API. Owned by BASF.

**Full-Color?** YES - ColorJet sandstone with 36,000 colors. Perfect for figurines.

**API Endpoints:**
- `POST /en/api/store/3D/order/` - Place order with material, shipping address
- Upload API (Web2Web) - Upload 3D files (zip or single file, max 500MB)
- Materials API - Get available materials and pricing
- Returns order reference for tracking
- `notification_url` parameter for webhooks
- `fake=1` parameter for testing without charges

**File Formats:** OBJ or WRL with texture file for full-color

**Shipping:** Worldwide. France €13.99, free over €1000. UPS delivery.

**Payment:** Invoice-based (must contact to enable). Pay per order.

**Access:** Free API access, contact Sculpteo to enable invoice payments.

**Pros:**
- Real REST API with documented endpoints
- Full-color sandstone = ideal for figurines
- Test mode (`fake=1`) for development
- Webhook notifications
- Owned by BASF (stable company)
- Accepts OBJ with textures (our 3D models have textures)

**Cons:**
- Must contact them to enable invoice payments
- Documentation behind 403 (need account)
- Invoice-based payment (not credit card per order)

**Action needed:** Sign up at sculpteo.com, contact them to enable API + invoice payments.

---

### Option B: Slant 3D

**What:** Large FDM print farm with API.

**Full-Color?** NO - Single-color FDM only (black, white, grey, red, yellow PLA/PETG)

**API:** REST API at slant3dapi.com. Upload file, order, ships in 2-5 days.

**Pricing:** No upfront fees, pay per part.

**Pros:**
- Self-serve API access
- Fast fulfillment (2-5 days)
- Good for high-volume
- No minimum orders

**Cons:**
- NO FULL COLOR - single-color plastic only
- FDM quality (layer lines visible)
- Figurines would look like unpainted plastic blobs
- Limited materials

**Verdict:** Not suitable for figurines. Good for functional parts, bad for collectibles.

---

### Option C: JLC3DP

**What:** Industrial 3D printing from China with API.

**Full-Color?** Yes - HP MJF full-color nylon

**API:** Ordering API with file upload, auto-pricing, order tracking.

**Pricing:** Starts at $0.30/part. Very competitive.

**Shipping:** Worldwide from China.

**Pros:**
- Full-color printing available
- Cheapest pricing
- Worldwide shipping
- Auto-pricing API

**Cons:**
- Must apply via email (support@jlcpcb.com)
- Need "substantial experience importing from China"
- Monthly volume requirements
- Strict branding rules (can't mention JLC)
- Longer shipping from China
- Not all applicants approved

**Verdict:** Great pricing but gated access. Worth applying but not guaranteed.

---

### Bonus: Artelo (2D Print-on-Demand, NOT 3D)

**What:** Print-on-demand for wall art (canvas, acrylic, framed prints).

**API:** Full REST API for creating products, submitting orders, tracking fulfillment.

**Fulfillment:** 1-3 business days, US-based.

**Why it matters:** If we can't get 3D printing working, we could offer "print your character on canvas/acrylic" as an alternative product. Skip the 3D conversion entirely - just send the 2D image to Artelo.

---

## Recommendation

### Primary Path: Sculpteo
1. Sign up for Sculpteo account
2. Contact them to enable API access + invoice payments
3. Integrate: Upload OBJ+texture → Select full-color sandstone → Specify shipping → Place order
4. Use `fake=1` for all development/testing

### Backup Path: JLC3DP
1. Email support@jlcpcb.com to apply for API access
2. If approved, integrate as alternative/cheaper option

### Quick Win: Artelo (2D merch)
1. Could add "Print on Canvas" or "Print on Acrylic" right now
2. No 3D conversion needed - just send the original character image
3. Fast fulfillment, real API, US-based

### What YOU need to do:
- [ ] Create Sculpteo account at sculpteo.com
- [ ] Email them requesting API access + invoice payment enablement
- [ ] Optionally email support@jlcpcb.com to apply for JLC3DP API
- [ ] Optionally check out artelo.io for 2D merch alternative
