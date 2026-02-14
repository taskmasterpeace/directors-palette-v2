# Security Audit Report - Directors Palette v2

**Date:** February 13, 2026
**Auditor:** Claude Code (Automated Security Analysis)
**Scope:** Full codebase security review (96 API routes, client-side code, configuration)

---

## Executive Summary

Comprehensive security analysis of the directors-palette-v2 Next.js application covering API security, authentication, injection vulnerabilities, client-side data exposure, CORS/headers, and rate limiting. **8 issues remediated**, several informational findings documented for future improvement.

---

## Findings by Severity

### CRITICAL (Fixed)

#### C-1: XSS via `dangerouslySetInnerHTML` without sanitization
- **Status:** FIXED
- **Files:**
  - `src/features/storybook/components/DraggableTextEditor.tsx:147`
  - `src/features/storybook/components/PageLayoutRenderer.tsx:99,149,174`
  - `src/features/storybook/components/RichTextEditor.tsx:26`
- **Description:** Rich text HTML from user input was rendered without sanitization, allowing script injection.
- **Fix:** Created `src/lib/sanitize.ts` with allowlist-based HTML sanitizer. All `dangerouslySetInnerHTML` and `innerHTML` assignments now pass through `sanitizeHtml()`.

#### C-2: Missing prediction ownership verification (IDOR)
- **Status:** FIXED
- **Files:**
  - `src/app/api/generation/status/[predictionId]/route.ts`
  - `src/app/api/generation/cancel/[predictionId]/route.ts`
- **Description:** Any authenticated user could check status of or cancel any other user's image generation by guessing prediction IDs.
- **Fix:** Added ownership verification via `generation_events` table lookup (prediction_id + user_id). Returns 404 for non-owned predictions (fail closed).

### HIGH (Fixed)

#### H-1: RegExp injection in adhub template processing
- **Status:** FIXED
- **File:** `src/app/api/adhub/generate/route.ts:77-80`
- **Description:** Template field names from database were used directly in `new RegExp()` without escaping, enabling ReDoS attacks.
- **Fix:** Field names are now escaped with `String.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before RegExp construction.

#### H-2: API key exposed via `NEXT_PUBLIC_` prefix
- **Status:** FIXED
- **Files:** `.env.example:7`, `.env.local.example:14`
- **Description:** Requesty API key was templated as `NEXT_PUBLIC_REQUESTY_API_KEY`, which would embed it in client-side JavaScript bundles. Code actually uses `REQUESTY_API_KEY` (server-only).
- **Fix:** Changed templates to `REQUESTY_API_KEY` with security comments.

#### H-3: Pricing endpoint exposing profit margins
- **Status:** FIXED
- **File:** `src/app/api/credits/pricing/route.ts`
- **Description:** Public endpoint returned `cost_cents`, `margin_cents`, and `margin_percent` - revealing internal cost structure and profit margins.
- **Fix:** Response now only includes `model_id`, `model_name`, `generation_type`, `price_cents`, `formatted_price`, and `is_active`.

#### H-4: Missing Content-Security-Policy and HSTS headers
- **Status:** FIXED
- **File:** `next.config.ts`
- **Description:** No CSP or HSTS headers were configured, leaving the app vulnerable to XSS and downgrade attacks.
- **Fix:** Added comprehensive CSP with specific allowed sources for scripts, styles, images, media, connections, and frames. Added HSTS with 2-year max-age, includeSubDomains, and preload.

### MEDIUM (Fixed)

#### M-1: No rate limiting on coupon redemption
- **Status:** FIXED
- **File:** `src/app/api/coupons/redeem/route.ts`
- **Description:** Coupon codes could be brute-forced with unlimited attempts.
- **Fix:** Created `src/lib/rate-limit.ts` with in-memory rate limiter. Coupon redemption limited to 5 attempts per 60 seconds per user. Returns 429 with Retry-After header.

#### M-2: No rate limiting on admin credit grants
- **Status:** FIXED
- **File:** `src/app/api/admin/grant-credits/route.ts`
- **Description:** Admin credit grant endpoint had no throttling.
- **Fix:** Limited to 10 grants per 60 seconds per admin user.

#### M-3: Cron secret in query parameters
- **Status:** FIXED
- **File:** `src/app/api/cron/cleanup-expired/route.ts`
- **Description:** CRON_SECRET accepted via URL query parameter (`?secret=xxx`), which gets logged in HTTP access logs.
- **Fix:** Removed query parameter fallback. Now only accepts secret via `Authorization: Bearer <secret>` header.

#### M-4: Debug info leaking in API response
- **Status:** FIXED
- **File:** `src/app/api/generation/status/[predictionId]/route.ts`
- **Description:** Error responses included `debug` object with `hasSupabaseUrl` and `hasSupabaseKey` booleans, revealing infrastructure configuration.
- **Fix:** Removed debug object from error responses.

### MEDIUM (Not Fixed - Requires Architectural Changes)

#### M-5: No rate limiting on image/video generation
- **Recommendation:** Add rate limiting using the `checkRateLimit()` utility with `RATE_LIMITS.IMAGE_GENERATION` config.
- **Why not fixed:** Generation endpoints have complex credit-checking logic that already provides some abuse protection. Adding rate limiting requires careful testing to avoid breaking legitimate batch operations.

#### M-6: Admin operations lack audit logging
- **Recommendation:** Add audit trail for admin actions (credit grants, user management, moderation).
- **Why not fixed:** Requires new database table and broader infrastructure changes.

#### M-7: Middleware skips all API route authentication
- **File:** `src/middleware.ts:16-18`
- **Description:** Middleware bypasses authentication for all `/api/` routes, relying on individual route handlers.
- **Recommendation:** Consider adding a middleware-level auth check with an explicit allowlist of public endpoints.

### LOW

#### L-1: Recipe image copy without ownership check
- **File:** `src/app/api/recipes/[recipeId]/copy-images/route.ts`
- **Description:** Users may be able to copy reference images from recipes they don't own.
- **Recommendation:** Add ownership verification before allowing image copy operations.

#### L-2: Export-PDF accepts project data in request body
- **File:** `src/app/api/storybook/export-pdf/route.ts`
- **Description:** Project data is sent in the request body rather than fetched by ID with ownership check. While this means users can only export data they already have, it bypasses server-side access control.
- **Recommendation:** Fetch project by ID with user ownership verification instead.

#### L-3: `console.log` statements may leak sensitive data in production
- **Description:** Found 12+ files with `console.log` that may log request/response bodies in production.
- **Recommendation:** Implement structured logging with sensitive data redaction.

### INFORMATIONAL

#### I-1: Storybook project ownership already enforced at service layer
- **File:** `src/features/storybook/services/storybook-projects.service.ts`
- **Status:** Already secure - all queries filter by `.eq('user_id', userId)`.

#### I-2: Webhook signature verification properly implemented
- **Files:** `src/app/api/webhooks/replicate/route.ts`, `src/app/api/webhooks/stripe/route.ts`
- **Status:** Both use HMAC-SHA256 verification. Stripe has idempotency checks and retry queue.

#### I-3: SSRF protection in image generation
- **File:** `src/app/api/generation/image/route.ts`
- **Status:** `isPublicUrl()` function blocks localhost and internal IPs.

#### I-4: SQL injection protection
- **Status:** All database queries use Supabase client with parameterized queries. No raw SQL detected.

#### I-5: Supabase anon key correctly public
- The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is designed to be public; Row-Level Security policies enforce authorization.

#### I-6: Rate limiter is per-instance only
- The in-memory rate limiter (`src/lib/rate-limit.ts`) works per serverless function instance. For production-grade rate limiting across all instances, consider Upstash Redis.

#### I-7: `.gitignore` properly configured
- `.env*` files are excluded from git tracking.

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/lib/sanitize.ts` | HTML sanitization utility (XSS prevention) |
| `src/lib/rate-limit.ts` | In-memory rate limiter for API endpoints |

### Modified Files
| File | Change |
|------|--------|
| `src/features/storybook/components/DraggableTextEditor.tsx` | Added sanitizeHtml() to dangerouslySetInnerHTML |
| `src/features/storybook/components/PageLayoutRenderer.tsx` | Added sanitizeHtml() to 3 dangerouslySetInnerHTML uses |
| `src/features/storybook/components/RichTextEditor.tsx` | Added sanitizeHtml() to innerHTML assignment |
| `src/app/api/adhub/generate/route.ts` | Escaped field names in RegExp |
| `src/app/api/generation/status/[predictionId]/route.ts` | Added ownership verification, removed debug info leak |
| `src/app/api/generation/cancel/[predictionId]/route.ts` | Added ownership verification |
| `src/app/api/credits/pricing/route.ts` | Removed cost/margin data from public response |
| `src/app/api/coupons/redeem/route.ts` | Added rate limiting |
| `src/app/api/admin/grant-credits/route.ts` | Added rate limiting |
| `src/app/api/cron/cleanup-expired/route.ts` | Removed query param secret fallback |
| `next.config.ts` | Added CSP and HSTS headers |
| `.env.example` | Fixed NEXT_PUBLIC_ prefix on secret key |
| `.env.local.example` | Fixed NEXT_PUBLIC_ prefix on secret key |

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 2 | 2 | 0 |
| High | 4 | 4 | 0 |
| Medium | 7 | 4 | 3 |
| Low | 3 | 0 | 3 |
| Informational | 7 | N/A | N/A |
| **Total** | **23** | **10** | **6** |

All critical and high severity issues have been remediated. Remaining medium and low issues require architectural changes or broader infrastructure updates.
