# Printify Setup Guide — Browser Team

## Overview

Merch Lab uses the Printify API to fetch product catalogs (colors, sizes, pricing) and submit print-on-demand orders. This guide walks through setting up a Printify account, getting API credentials, and configuring the correct print provider IDs for each product.

---

## Step 1: Create a Printify Account

1. Go to [printify.com](https://www.printify.com) and create an account
2. Choose **"I want to sell products"** when prompted
3. Skip the Shopify/Etsy store connection — we use the **API directly**
4. Complete onboarding (you can skip the store setup wizard)

---

## Step 2: Get Your API Token

1. Go to **Account Settings** > **Connections** (or visit `printify.com/app/account/api`)
2. Click **"Create new API token"**
3. Name it something like `directors-palette-merch-lab`
4. Copy the token — you'll only see it once

---

## Step 3: Get Your Shop ID

1. With your API token, make this request:
   ```bash
   curl -s -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     https://api.printify.com/v1/shops.json | jq .
   ```
2. The response will include your shop(s). Copy the `id` field.
   - If no shops exist, create one via the Printify dashboard first (any name works, e.g. "Directors Palette Merch")

---

## Step 4: Add Credentials to `.env.local`

Add these two lines to `D:/git/directors-palette-v2/.env.local`:

```
PRINTIFY_API_TOKEN=your_token_here
PRINTIFY_SHOP_ID=your_shop_id_here
```

---

## Step 5: Find the Correct Print Provider IDs

This is the most important step. Each product type (blueprint) can be fulfilled by multiple print providers. We need to pick **one provider per product** and update the hardcoded IDs.

### Products We Use

| Product    | Blueprint ID | Category   |
|------------|-------------|------------|
| T-Shirt    | 12          | apparel    |
| Hoodie     | 77          | apparel    |
| Crewneck   | 49          | apparel    |
| Tote Bag   | 375         | accessory  |
| Mug        | 478         | drinkware  |
| Stickers   | 400         | sticker    |

### How to Find Providers

For each blueprint, list available print providers:

```bash
# Replace 12 with each blueprint ID
curl -s -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://api.printify.com/v1/catalog/blueprints/12/print_providers.json | jq '.[] | {id, title, location}'
```

### What to Look For

Pick providers based on:
- **Location**: US-based providers for faster domestic shipping
- **Rating**: Higher-rated providers have better quality
- **Price**: Compare base costs across providers
- **Variant count**: More variants = more color/size options for users

### Recommended Providers (verify these are still available)

| Product    | Blueprint | Suggested Provider | Provider ID |
|------------|-----------|-------------------|-------------|
| T-Shirt    | 12        | Monster Digital    | 99          |
| Hoodie     | 77        | Monster Digital    | 99          |
| Crewneck   | 49        | Monster Digital    | 99          |
| Tote Bag   | 375       | (check available)  | TBD         |
| Mug        | 478       | (check available)  | TBD         |
| Stickers   | 400       | (check available)  | TBD         |

### Verify Variants Exist

After picking a provider, confirm it has variants:

```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://api.printify.com/v1/catalog/blueprints/12/print_providers/99/variants.json | jq '.variants | length'
```

Should return a number > 0.

---

## Step 6: Update Provider IDs in Code

Edit `src/features/merch-lab/constants/products.ts`:

```typescript
// Update these with real provider IDs from Step 5
export const PRINTIFY_PROVIDERS: Record<number, number> = {
  12: 99,    // T-Shirt — replace 99 with actual provider ID
  77: 99,    // Hoodie
  49: 99,    // Crewneck
  375: 99,   // Tote Bag
  478: 99,   // Mug
  400: 99,   // Stickers
}
```

---

## Step 7: Test the Integration

### Test 1: Product Catalog

Start the dev server and hit the products endpoint:

```bash
curl -s "http://localhost:3002/api/merch-lab/products?blueprintId=12" | jq '.variants | length'
```

Should return the number of variants (colors/sizes) available.

### Test 2: Pricing

Pick a variant ID from the catalog response and test pricing:

```bash
curl -s "http://localhost:3002/api/merch-lab/price?blueprintId=12&variantId=VARIANT_ID&category=apparel" | jq .
```

Should return `pricePts` (the user-facing price in pts).

### Test 3: Full Order Flow (use with caution — this charges your Printify account)

The order endpoint creates a real product and submits a real order on Printify. Only test this when you're ready to verify the full flow. You can cancel orders in the Printify dashboard.

---

## Variant Title Format

Printify variant titles follow the format: `"Color / Size"` (e.g., `"Black / M"`, `"White / XL"`).

Our API parses these to extract color and size separately. If a product has no sizes (like mugs or stickers), the title is just the color name and we default size to `"One Size"`.

### Color Hex Values

Printify may or may not include hex color values in variant options. Our code falls back to `#333333` if no hex is provided. If colors look wrong in the UI, check what Printify returns in the variant `options` field and adjust the `extractColorHex()` function in `src/app/api/merch-lab/products/route.ts`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `401 Unauthorized` from Printify | Check `PRINTIFY_API_TOKEN` in `.env.local` |
| `Invalid blueprint ID` | Blueprint ID not in `PRINTIFY_PROVIDERS` map |
| No variants returned | Wrong provider ID for that blueprint |
| Colors showing as gray | Printify not returning hex in variant options — update `extractColorHex()` |
| Order fails at "create product" | Check that the provider ID is valid for your shop |
| Order fails at "submit order" | Check shipping address format, variant availability |

---

## Cost Structure

- **Printify charges us** (the store owner) for each order
- **We charge the user** in pts, with a 1.25x margin over cost + estimated shipping
- Conversion rate: 1 pt ~ $0.16
- If order submission fails after pts deduction, the API automatically refunds the user
