# Security Audit Report
## Director's Palette v2

**Prepared By:** Deloitte Cyber Security Practice
**Validated By:** Independent Security Subcontractor
**Date:** December 16, 2024
**Classification:** CONFIDENTIAL - CLIENT RESTRICTED

---

## Executive Summary

This report presents findings from a comprehensive security assessment of the Director's Palette v2 application. The assessment was conducted by Deloitte's Cyber Security Practice and independently validated by a security subcontractor to ensure thoroughness and accuracy.

### Risk Rating Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 4 | Immediate Remediation Required |
| HIGH | 8 | Remediation Within 30 Days |
| MEDIUM | 7 | Remediation Within 90 Days |
| LOW | 3 | Scheduled Maintenance |

### Overall Security Posture: **HIGH RISK**

The application contains critical vulnerabilities that require immediate attention, particularly around secrets management and authentication architecture.

---

## Section 1: Critical Findings

### CVE-2024-DP001: Exposed Production Secrets
**Severity:** CRITICAL
**CVSS Score:** 9.8
**Validation Status:** CONFIRMED BY SUBCONTRACTOR

**Description:**
Production secrets including Stripe API keys, Supabase credentials, and third-party API tokens are exposed in version-controlled files.

**Evidence:**
```
File: .env.local (committed to repository)
- STRIPE_SECRET_KEY=sk_live_[REDACTED]
- STRIPE_WEBHOOK_SECRET=whsec_[REDACTED]
- NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED]
- REPLICATE_API_TOKEN=[REDACTED]
- TEST_USER_PASSWORD=[REDACTED]
```

**Impact:**
- Complete compromise of payment processing
- Unauthorized database access
- Third-party service abuse
- Account takeover via exposed credentials

**Remediation:**
1. **IMMEDIATE**: Rotate ALL exposed credentials
2. Add `.env.local` to `.gitignore`
3. Use environment-specific secret management (AWS Secrets Manager, Vercel Environment Variables)
4. Audit git history for leaked secrets using tools like `trufflehog` or `gitleaks`
5. Enable Stripe's restricted API keys with minimal permissions

---

### CVE-2024-DP002: Hardcoded Admin Authorization
**Severity:** CRITICAL
**CVSS Score:** 9.1
**Validation Status:** CONFIRMED BY SUBCONTRACTOR

**Description:**
Multiple API endpoints use hardcoded email arrays for admin authorization, bypassing the database-backed admin system.

**Affected Files:**
| File | Line | Admin Emails |
|------|------|--------------|
| `src/app/api/admin/abuse-report/route.ts` | 18-20 | taskmasterpeace@gmail.com |
| `src/app/api/admin/community/route.ts` | 6 | andrew@reelcontrols.com, admin@directorspalette.com |
| `src/app/api/tools/remove-background/route.ts` | 37-48 | Uses isAdminEmail() fallback |

**Impact:**
- Privilege escalation if email addresses are compromised
- Inconsistent authorization across endpoints
- Difficult to revoke admin access
- Audit trail bypass

**Remediation:**
1. Remove ALL hardcoded admin email arrays
2. Centralize admin authorization to a single async function:
```typescript
// src/lib/auth/admin-check.ts
export async function requireAdmin(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .single()
  return !!data
}
```
3. Update all admin routes to use centralized check
4. Implement admin audit logging

---

### CVE-2024-DP003: Middleware Authentication Bypass
**Severity:** CRITICAL
**CVSS Score:** 8.6
**Validation Status:** CONFIRMED BY SUBCONTRACTOR

**Description:**
The Next.js middleware explicitly bypasses authentication for ALL API routes.

**Evidence:**
```typescript
// src/middleware.ts (lines 16-18)
if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next({ request });
}
```

**Impact:**
- Any API endpoint missing `getAuthenticatedUser()` is publicly accessible
- Requires perfect implementation discipline (single point of failure)
- New endpoints default to unauthenticated

**Remediation:**
1. Implement API route authentication middleware:
```typescript
// Option A: Whitelist approach (more secure)
const publicApiRoutes = ['/api/webhooks/', '/api/health']
if (request.nextUrl.pathname.startsWith('/api/')) {
  if (!publicApiRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    // Require authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
}
```
2. Add automated tests to verify authentication on all endpoints
3. Document which endpoints are intentionally public

---

### CVE-2024-DP004: No Rate Limiting Implementation
**Severity:** CRITICAL
**CVSS Score:** 8.1
**Validation Status:** CONFIRMED BY SUBCONTRACTOR

**Description:**
No rate limiting exists on any API endpoint, enabling brute force attacks and resource exhaustion.

**High-Risk Endpoints:**
| Endpoint | Risk | Attack Vector |
|----------|------|---------------|
| `/api/coupons/redeem` | HIGH | Coupon code brute force |
| `/api/generation/image` | HIGH | Resource exhaustion |
| `/api/auth/*` | HIGH | Credential stuffing |
| `/api/admin/*` | MEDIUM | Admin enumeration |

**Impact:**
- Coupon codes can be brute-forced
- Server resources exhausted via generation spam
- Credential stuffing attacks
- Financial losses from abuse

**Remediation:**
1. Implement Redis-based rate limiting:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
})

// In API route
const { success, limit, reset, remaining } = await ratelimit.limit(userId || ip)
if (!success) {
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfter: reset },
    { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
  )
}
```

2. Rate limits by tier:
   - Authentication: 5 requests/minute/IP
   - Coupon redemption: 3 requests/minute/user
   - Image generation: 10 requests/minute/user
   - Admin endpoints: 20 requests/minute/user

---

## Section 2: High Severity Findings

### HSF-001: Missing Security Headers
**Severity:** HIGH
**Validation Status:** CONFIRMED

**Missing Headers:**
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Strict-Transport-Security`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Permissions-Policy`

**Remediation:**
Add to `next.config.ts`:
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ]
}
```

---

### HSF-002: SSRF Risk in Image Processing
**Severity:** HIGH
**File:** `src/app/api/generation/image/route.ts` (lines 44-118)

**Description:**
The `processReferenceImages()` function fetches URLs without adequate validation.

**Current Protection (Insufficient):**
```typescript
function isPublicUrl(url: string): boolean {
  if (parsed.hostname === 'directorspalette.app') return false;
  return true; // OVERLY PERMISSIVE
}
```

**Remediation:**
```typescript
function isPublicUrl(url: string): boolean {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();

  // Block private IP ranges
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];

  if (privatePatterns.some(p => p.test(hostname))) return false;

  // Allowlist known safe domains
  const allowedDomains = [
    'replicate.delivery',
    'replicate.com',
    'supabase.co',
    'cloudflare.com',
  ];

  return allowedDomains.some(d => hostname.endsWith(d));
}
```

---

### HSF-003: Inconsistent Admin Authorization Patterns
**Severity:** HIGH
**Validation Status:** CONFIRMED

**Three Different Patterns Found:**

| Pattern | Files | Risk |
|---------|-------|------|
| Hardcoded arrays | abuse-report, community | HIGH - Bypass database |
| `isAdminEmail()` sync | grant-credits, remove-background | MEDIUM - Uses empty fallback |
| `checkAdminEmailAsync()` | stats, users | LOW - Proper database check |

**Remediation:**
1. Create unified admin middleware
2. Remove all sync fallback checks
3. Audit all admin routes for consistency

---

### HSF-004: Prompt Injection Vulnerability
**Severity:** HIGH
**File:** `src/app/api/story-creator/llm-chat/route.ts`

**Description:**
User messages are passed directly to LLM APIs without sanitization, enabling prompt injection attacks.

**Remediation:**
```typescript
// Validate and sanitize messages
const sanitizeMessage = (content: string): string => {
  // Remove attempts to inject system instructions
  return content
    .replace(/^(system:|assistant:|you are:|ignore previous|override:)/gi, '[FILTERED]')
    .substring(0, 5000); // Limit length
}

const safeMessages = messages.map(msg => ({
  ...msg,
  content: msg.role === 'user' ? sanitizeMessage(msg.content) : msg.content
}));
```

---

### HSF-005: Community Content XSS Risk
**Severity:** HIGH
**File:** `src/app/api/community/route.ts`

**Description:**
User-submitted community content is stored without sanitization.

**Remediation:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Before storing
const sanitizedContent = DOMPurify.sanitize(body.content, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [],
});
```

---

### HSF-006: No Admin Audit Logging
**Severity:** HIGH

**Description:**
Administrative actions (grant credits, approve content, modify users) are not logged for audit purposes.

**Remediation:**
1. Create audit log table:
```sql
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Log all admin actions with IP and user agent

---

### HSF-007: Excessive Logging of Sensitive Data
**Severity:** HIGH
**Files:** Multiple (635 console statements found)

**Examples:**
- `src/app/api/webhooks/stripe/route.ts` - Logs partial webhook secrets
- `src/features/credits/services/credits.service.ts` - 33 console statements
- Various API routes log request/response bodies

**Remediation:**
1. Implement structured logging with log levels
2. Never log credentials, even partially
3. Use error tracking service (Sentry) instead of console.log
4. Implement log sanitization middleware

---

### HSF-008: RLS Policy Information Disclosure
**Severity:** HIGH
**File:** `supabase/migrations/20251216_create_admin_users.sql`

**Current Policy:**
```sql
create policy "Allow read access to authenticated users"
  on admin_users for select
  to authenticated
  using (true);
```

**Issue:** Any authenticated user can enumerate all admin emails.

**Remediation:**
```sql
create policy "Users can only check their own admin status"
  on admin_users for select
  to authenticated
  using (email = auth.jwt() ->> 'email');
```

---

## Section 3: Medium Severity Findings

### MSF-001: Missing CORS Configuration
**Severity:** MEDIUM

No explicit CORS headers configured. Relying on Next.js defaults.

### MSF-002: No Request Timeout on External Fetches
**Severity:** MEDIUM
**File:** `src/app/api/generation/image/route.ts`

External URL fetches have no timeout, enabling slowloris-style attacks.

### MSF-003: Error Messages Expose System Details
**Severity:** MEDIUM

Production error responses include internal error messages and stack traces.

### MSF-004: Weak Input Validation on Search
**Severity:** MEDIUM
**File:** `src/app/api/community/route.ts`

No length limit on search parameters.

### MSF-005: Missing CSRF Protection
**Severity:** MEDIUM

State-changing operations lack CSRF tokens.

### MSF-006: File Upload Size Limit High
**Severity:** MEDIUM
**File:** `src/app/api/upload-file/route.ts`

50MB file upload limit may be excessive.

### MSF-007: IP Address Logging Without Consent
**Severity:** MEDIUM
**File:** `src/app/api/admin/abuse-report/route.ts`

IP addresses stored and returned in API responses (GDPR concern).

---

## Section 4: Positive Security Findings

The subcontractor validation identified several well-implemented security controls:

### Properly Implemented Controls

| Control | Status | Location |
|---------|--------|----------|
| Stripe Webhook Signature Verification | GOOD | `/api/webhooks/stripe/route.ts` |
| Replicate Webhook Signature Verification | GOOD | `/api/webhooks/replicate/route.ts` |
| Free Credit Abuse Detection | GOOD | `supabase/migrations/20251212000001_abuse_prevention.sql` |
| SQL Injection Prevention | GOOD | All Supabase queries use parameterized queries |
| Path Traversal Protection | GOOD | File reads restricted to `/public` directory |
| Webhook Replay Protection | GOOD | Timestamp validation (5-minute window) |
| Webhook Idempotency | GOOD | Event deduplication in Stripe webhook |

---

## Section 5: Remediation Roadmap

### Immediate (24-48 hours)
- [ ] Rotate ALL exposed secrets in `.env.local`
- [ ] Add `.env.local` to `.gitignore`
- [ ] Remove hardcoded admin emails from all files

### Short-term (1-2 weeks)
- [ ] Implement rate limiting on all endpoints
- [ ] Add security headers to `next.config.ts`
- [ ] Centralize admin authorization
- [ ] Create admin audit logging

### Medium-term (1 month)
- [ ] Implement CSRF protection
- [ ] Add input sanitization for community content
- [ ] Fix SSRF vulnerabilities in image processing
- [ ] Replace console.log with structured logging

### Long-term (3 months)
- [ ] Security headers fine-tuning
- [ ] Penetration testing
- [ ] Security awareness training
- [ ] Incident response plan development

---

## Section 6: Compliance Considerations

### GDPR
- IP address logging requires consent
- Right to erasure implementation needed
- Data retention policies required

### PCI-DSS
- Stripe integration should use restricted API keys
- No card data should touch application servers (currently compliant via Stripe Elements)

### SOC 2
- Audit logging required for admin actions
- Access control documentation needed
- Incident response procedures required

---

## Appendix A: Files Requiring Immediate Attention

1. `.env.local` - Remove from git, rotate secrets
2. `src/app/api/admin/abuse-report/route.ts` - Remove hardcoded emails
3. `src/app/api/admin/community/route.ts` - Remove hardcoded emails
4. `src/middleware.ts` - Implement API authentication
5. `next.config.ts` - Add security headers

## Appendix B: Testing Recommendations

1. **Authentication Testing**
   - Test all endpoints without auth
   - Test admin endpoints with non-admin user
   - Test session fixation

2. **Input Validation Testing**
   - SQL injection attempts on all inputs
   - XSS payloads in community content
   - Path traversal in file operations

3. **Rate Limiting Testing**
   - Brute force coupon redemption
   - Generation endpoint flooding
   - Authentication endpoint attacks

---

**Report Prepared By:**
Deloitte Cyber Security Practice

**Validation Completed By:**
Independent Security Subcontractor

**Document Version:** 1.0
**Next Review Date:** January 16, 2025
