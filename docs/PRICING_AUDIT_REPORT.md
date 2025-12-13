# Directors Palette Pricing Audit Report
**Date:** December 12, 2025

---

## CRITICAL ISSUE: Point Deduction Mismatch

### Problem Identified
You generated with **Nano Banana Pro** and were charged **20 points** instead of the displayed **15 points**.

### Root Cause
The database `model_pricing` table has:
```sql
('google/nano-banana-pro', 'Nano Banana Pro', 'replicate', 'image', 14, 20)
--                                                         cost^  price^
```
- **cost_cents = 14** (our cost from Replicate = $0.14)
- **price_cents = 20** (what we charge users = 20 points)

The UI may be displaying `cost_cents` (14-15) but the system correctly charges `price_cents` (20).

### FIX NEEDED
Either:
1. Update UI to show correct price (20 pts) - **RECOMMENDED**
2. Or lower the price in database to 15 if you want to charge less

---

## Database Tables for Credits

### Where Credits Are Stored

| Table | Purpose | Location |
|-------|---------|----------|
| `user_credits` | User balances | Supabase → Table Editor |
| `credit_transactions` | Transaction history | Supabase → Table Editor |
| `model_pricing` | Per-model costs/prices | Supabase → Table Editor |
| `credit_packages` | Purchasable packages | Supabase → Table Editor |

### How to Give Yourself Credits

**Option 1: Direct SQL (Supabase SQL Editor)**
```sql
-- Add 500 credits to your account
UPDATE user_credits
SET balance = balance + 500,
    lifetime_purchased = lifetime_purchased + 500
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'taskmasterpeace@gmail.com');
```

**Option 2: Table Editor**
1. Go to Supabase → Table Editor → `user_credits`
2. Find your user_id row
3. Edit the `balance` field directly

### How to Track Changes
View `credit_transactions` table - every deduction/addition is logged with:
- `amount` (negative for usage, positive for purchases)
- `balance_after`
- `metadata` (model used, prediction_id, etc.)

---

## Current Pricing Configuration

### Image Models (Nano Banana Family)

| Model | Our Cost | We Charge | Margin | Margin % |
|-------|----------|-----------|--------|----------|
| Nano Banana | $0.04 | 6 pts ($0.06) | $0.02 | 50% |
| Nano Banana Pro (2K) | $0.14 | 20 pts ($0.20) | $0.06 | 43% |
| Nano Banana Pro (4K) | $0.24 | TBD | TBD | TBD |

### Video Models (Future)

| Model | Our Cost | We Charge | Margin | Margin % |
|-------|----------|-----------|--------|----------|
| Seedance Lite | $0.20 | 30 pts ($0.30) | $0.10 | 50% |
| Seedance Pro | $0.35 | 50 pts ($0.50) | $0.15 | 43% |

---

## Package Profitability Analysis

### Current Packages

| Package | Price | Credits | Bonus | Total | Effective Rate |
|---------|-------|---------|-------|-------|----------------|
| Starter Pack | $5.00 | 500 | 0 | 500 | $0.01/pt |
| Creator Pack | $10.00 | 1,200 | 200 | 1,400 | $0.0071/pt |
| Pro Pack | $20.00 | 2,750 | 750 | 3,500 | $0.0057/pt |

### Revenue per Package (Nano Banana Pro @ $0.14 cost)

| Package | Price | Images | Our Cost | Gross Profit | Profit Margin |
|---------|-------|--------|----------|--------------|---------------|
| Starter | $5.00 | 25 | $3.50 | **$1.50** | 30% |
| Creator | $10.00 | 70 | $9.80 | **$0.20** | 2% |
| Pro | $20.00 | 175 | $24.50 | **-$4.50** | -22.5% |

### PROBLEM: Higher packages are LOSING money!

The bonus credits are too generous. When a Pro Pack user generates 175 Nano Banana Pro images:
- You receive: $20.00
- You pay Replicate: $24.50 (175 × $0.14)
- **Net Loss: $4.50 per Pro Pack sold**

---

## Competitor Pricing Comparison

### Runway Gen 4 (Premium Competitor)

| Product | Cost | Notes |
|---------|------|-------|
| Gen4 Image (720p) | $0.05/image | 5 credits |
| Gen4 Image (1080p) | $0.08/image | 8 credits |
| Gen4 Image Turbo | $0.02/image | Any resolution |
| Gen4 Video Turbo | $0.05/second | 5 credits/sec |
| Gen4 Video Aleph | $0.15/second | 15 credits/sec |

**Runway Subscription Plans:**
- Free: 125 credits (one-time)
- Standard: $12/mo = 625 credits
- Pro: $28/mo = 2,250 credits
- Unlimited: $76/mo = 2,250 + relaxed mode

### Nano Banana Pro (Direct from Google/Replicate)

| Resolution | Google Direct | Replicate | Our Price |
|------------|---------------|-----------|-----------|
| 1K/2K | $0.134 | $0.14 | $0.20 (20 pts) |
| 4K | $0.24 | $0.24 | TBD |
| Batch Mode | $0.067 | N/A | N/A |

### Other Providers

| Provider | Nano Banana Pro Cost |
|----------|---------------------|
| Google AI Studio | $0.134-0.15 |
| Replicate | $0.14 |
| Kie.ai | ~$0.12 |
| NanoBananaAPI.ai | ~$0.12 |
| **Directors Palette** | **$0.20** |

---

## Recommendations

### 1. Fix Package Profitability (URGENT)

**Option A: Reduce Bonuses**
```sql
UPDATE credit_packages SET bonus_credits = 0 WHERE name = 'Starter Pack';
UPDATE credit_packages SET bonus_credits = 100 WHERE name = 'Creator Pack';  -- was 200
UPDATE credit_packages SET bonus_credits = 250 WHERE name = 'Pro Pack';      -- was 750
```

**Option B: Increase Prices**
- Starter: $5 → $5 (keep)
- Creator: $10 → $12
- Pro: $20 → $25

**Option C: Reduce Credit Amounts**
- Starter: 500 → 400
- Creator: 1,200 → 800
- Pro: 2,750 → 1,500

### 2. Target Margins

| Model Type | Target Margin | Reasoning |
|------------|---------------|-----------|
| Fast/Cheap (Nano Banana) | 50%+ | Volume play |
| Premium (Nano Banana Pro) | 40-50% | Quality play |
| Video | 50%+ | Expensive, need buffer |

### 3. LLM/Storyboard Token Charging

Current storyboard uses OpenRouter for:
- Story extraction
- Shot breakdown
- Prompt generation

**Recommendation:** Implement token-based charging
- Track input/output tokens
- Charge ~$0.01-0.02 per 1K tokens (10-20x our cost)
- Or flat rate per story: 5-10 points

This prevents spam while keeping costs low for legitimate use.

### 4. Updated Pricing Recommendation

| Package | Price | Credits | Bonus | Images (Pro) | Our Cost | Profit | Margin |
|---------|-------|---------|-------|--------------|----------|--------|--------|
| Starter | $5 | 500 | 0 | 25 | $3.50 | $1.50 | 30% |
| Creator | $10 | 1,000 | 100 | 55 | $7.70 | $2.30 | 23% |
| Pro | $20 | 2,000 | 200 | 110 | $15.40 | $4.60 | 23% |

---

## Action Items

1. [ ] **Fix UI display** - Show 20 pts for Nano Banana Pro, not 14-15
2. [ ] **Update credit_packages** - Reduce bonuses to maintain profitability
3. [ ] **Monitor transactions** - Check `credit_transactions` table regularly
4. [ ] **Add 4K pricing** - $0.24 cost, charge 35-40 pts
5. [ ] **Consider LLM charges** - Flat 5 pts per storyboard extraction

---

## Quick Reference: Database Queries

**Check your balance:**
```sql
SELECT * FROM user_credits WHERE user_id = 'YOUR_USER_ID';
```

**View recent transactions:**
```sql
SELECT * FROM credit_transactions
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

**Check model pricing:**
```sql
SELECT * FROM model_pricing WHERE is_active = true;
```

**Check packages:**
```sql
SELECT * FROM credit_packages WHERE is_active = true ORDER BY sort_order;
```

---

## Sources

- [Runway API Pricing](https://docs.dev.runwayml.com/guides/pricing/)
- [Runway Plans](https://runwayml.com/pricing)
- [Replicate Nano Banana Pro](https://replicate.com/google/nano-banana-pro)
- [Nano Banana Pro Pricing Guide](https://magichour.ai/blog/nano-banana-pro-pricing)
