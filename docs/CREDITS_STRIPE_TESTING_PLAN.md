# Credits & Stripe Integration Testing Plan

This document tracks the testing and verification of the credits/points system and Stripe payment integration.

---

## 🔴 Current Issue: Database Not Set Up

**Error:** `Failed to fetch credits` on local instance

**Root Cause:** The `user_credits` table doesn't exist in your Supabase database yet.

**Fix Required:**
1. Run the credits migration in Supabase SQL Editor
2. Run the Stripe price IDs migration

---

## Pre-Testing Setup Checklist

### 1. Database Setup (Required First!)

- [ ] **Run Credits Schema Migration**
  ```
  File: supabase/migrations/20251211000000_create_credits_schema.sql
  ```
  Go to Supabase Dashboard → SQL Editor → New Query → Paste & Run

  This creates:
  - `user_credits` table
  - `credit_transactions` table
  - `credit_packages` table (with seed data)
  - `model_pricing` table (with seed data)
  - RLS policies for all tables

- [ ] **Run Stripe Price IDs Migration**
  ```
  File: supabase/migrations/20251211000001_add_stripe_price_ids.sql
  ```
  This adds `stripe_price_id` column to `credit_packages` table

### 2. Environment Variables

- [ ] Verify `.env.local` has all required variables:
  ```
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=

  # Stripe (Test Mode)
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

  # App URL (for redirects)
  NEXT_PUBLIC_APP_URL=http://localhost:3202
  ```

### 3. Stripe Dashboard Setup

- [ ] **Create Products/Prices in Stripe Test Mode**
  1. Go to Stripe Dashboard → Products
  2. Create products matching your credit packages:
     - Starter Pack: $5.00
     - Creator Pack: $10.00
     - Pro Pack: $20.00
     - Studio Pack: $40.00
  3. Copy each Price ID (starts with `price_`)

- [ ] **Update Database with Stripe Price IDs**
  ```sql
  UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Starter Pack';
  UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Creator Pack';
  UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Pro Pack';
  UPDATE credit_packages SET stripe_price_id = 'price_xxx' WHERE name = 'Studio Pack';
  ```

- [ ] **Set Up Webhook Endpoint**
  1. Go to Stripe Dashboard → Developers → Webhooks
  2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
  3. Listen for events:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `payment_intent.payment_failed`
  4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Testing Scenarios

### Test 1: New User Gets Initial Credits ✨

**Expected Behavior:** New users automatically receive 100 credits (5 free generations)

**Steps:**
1. [ ] Create a new user account in Supabase Auth
2. [ ] Log in to the app
3. [ ] Verify credits display shows "5 pts" (100 credits / 20 per gen)
4. [ ] Check `user_credits` table has new row with `balance: 100`

**Pass Criteria:**
- [ ] New user sees 5 points on first login
- [ ] Database has correct initial balance

---

### Test 2: Credits Insufficient Error 🚫

**Expected Behavior:** Generation fails gracefully when user has 0 credits

**Steps:**
1. [ ] Manually set user's balance to 0 in database:
   ```sql
   UPDATE user_credits SET balance = 0 WHERE user_id = 'your-user-id';
   ```
2. [ ] Attempt to generate an image
3. [ ] Verify error message: "Not Enough Points"
4. [ ] Verify no image is generated
5. [ ] Verify no credits are deducted

**Pass Criteria:**
- [ ] HTTP 402 error returned
- [ ] User-friendly error shown in UI
- [ ] No generation occurs

---

### Test 3: Successful Credit Deduction ✅

**Expected Behavior:** Credits are deducted after successful generation

**Steps:**
1. [ ] Set user balance to 100 (5 generations)
2. [ ] Note starting balance
3. [ ] Generate one image
4. [ ] Check balance decreased by 20 points
5. [ ] Check `credit_transactions` table has new usage record

**Pass Criteria:**
- [ ] Balance goes from 100 → 80
- [ ] Transaction logged with correct metadata
- [ ] UI updates to show new balance

---

### Test 4: Admin Bypass 👑

**Expected Behavior:** Admin users can generate without credits

**Setup:** Add your email to admin list in `src/features/admin/types/admin.types.ts`

**Steps:**
1. [ ] Log in with admin email
2. [ ] Set admin's balance to 0
3. [ ] Attempt to generate an image
4. [ ] Verify generation succeeds
5. [ ] Verify no credits deducted

**Pass Criteria:**
- [ ] Admin can generate with 0 balance
- [ ] No credit deduction for admins

---

### Test 5: Stripe Checkout Flow (Test Mode) 💳

**Expected Behavior:** Users can purchase credits via Stripe

**Steps:**
1. [ ] Click on points display to open purchase modal
2. [ ] Select a credit package
3. [ ] Click "Buy" to start checkout
4. [ ] On Stripe checkout, use test card: `4242 4242 4242 4242`
5. [ ] Complete purchase
6. [ ] Verify redirect to success URL
7. [ ] Verify credits added to account

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

**Pass Criteria:**
- [ ] Checkout session created
- [ ] Redirect to Stripe works
- [ ] Webhook processes payment
- [ ] Credits added to user account
- [ ] Transaction logged

---

### Test 6: Stripe Webhook Verification 🔒

**Expected Behavior:** Only valid signed webhooks are processed

**Steps:**
1. [ ] Send POST to `/api/webhooks/stripe` with no signature
2. [ ] Verify 400 error
3. [ ] Send POST with invalid signature
4. [ ] Verify 400 error

**Pass Criteria:**
- [ ] Invalid webhooks rejected
- [ ] Valid webhooks (from Stripe) processed

---

### Test 7: Admin Dashboard Stats 📊

**Expected Behavior:** Admins can see all user credits and grant credits

**Steps:**
1. [ ] Navigate to `/admin`
2. [ ] Verify user list displays
3. [ ] Verify "Gens" column shows correct count
4. [ ] Grant credits to a test user
5. [ ] Verify user balance updated

**Pass Criteria:**
- [ ] Stats cards show correct totals
- [ ] Users table shows all users
- [ ] Grant credits function works
- [ ] Generation count displays correctly

---

## Security Checklist

### API Security

- [x] **Authentication Required**
  - All credit endpoints require valid session
  - Checked in `getAuthenticatedUser()`

- [x] **User ID from Session**
  - User ID extracted server-side, not from request body
  - Prevents impersonation attacks

- [x] **RLS Policies**
  - Users can only see/modify their own credits
  - Policies in migration file

- [x] **Admin Protection**
  - Admin endpoints check for admin email
  - `isAdminEmail()` function

### Stripe Security

- [ ] **Webhook Signature Verification**
  - Verify `STRIPE_WEBHOOK_SECRET` is set
  - Verify `stripe.webhooks.constructEvent()` validates signature

- [ ] **Test Mode Check**
  - Confirm using test API keys (sk_test_, pk_test_)
  - NEVER commit live keys

- [ ] **Metadata Validation**
  - Webhook handler validates user_id exists
  - Validates credits amount is positive

### Data Validation

- [x] **Credit Amount Validation**
  - Can't deduct more than balance
  - Can't add negative amounts

- [x] **Package Validation**
  - Only active packages can be purchased
  - Package must have valid stripe_price_id

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/features/credits/services/credits.service.ts` | Credit operations (get, add, deduct) |
| `src/features/credits/store/credits.store.ts` | Client-side credit state |
| `src/app/api/credits/route.ts` | Credits API endpoint |
| `src/app/api/payments/create-checkout/route.ts` | Stripe checkout creation |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/generation/image/route.ts` | Image generation (checks/deducts credits) |
| `src/features/admin/components/AdminDashboard.tsx` | Admin panel |
| `supabase/migrations/20251211000000_create_credits_schema.sql` | Database schema |
| `supabase/migrations/20251211000001_add_stripe_price_ids.sql` | Stripe price IDs |

---

## Test Results Log

| Test | Date | Result | Notes |
|------|------|--------|-------|
| Database Setup | | ⏳ Pending | Need to run migrations |
| Test 1: Initial Credits | | ⏳ Pending | |
| Test 2: Insufficient Credits | | ⏳ Pending | |
| Test 3: Credit Deduction | | ⏳ Pending | |
| Test 4: Admin Bypass | | ⏳ Pending | |
| Test 5: Stripe Checkout | | ⏳ Pending | |
| Test 6: Webhook Security | | ⏳ Pending | |
| Test 7: Admin Dashboard | | ⏳ Pending | |

---

## Next Steps

1. **Immediate:** Run database migrations to fix "Failed to fetch credits" error
2. **Then:** Test each scenario above
3. **Before Production:**
   - Switch to Stripe live keys
   - Update webhook URL to production domain
   - Add production domain to Supabase redirect URLs
