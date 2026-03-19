import { NextRequest } from 'next/server'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createClient } from '@supabase/supabase-js'
import { errors } from './response'
import { isAdminEmail } from '@/features/admin/types/admin.types'

export interface V2AuthContext {
  userId: string
  email: string
  apiKeyId: string
  isAdmin: boolean
}

/**
 * Validate API key and return auth context.
 * Returns V2AuthContext on success, or a NextResponse error on failure.
 */
export async function validateV2ApiKey(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const rawKey = apiKeyService.extractKeyFromHeader(authHeader)

  if (!rawKey) {
    return errors.unauthorized()
  }

  const validated = await apiKeyService.validateApiKey(rawKey)
  if (!validated) {
    return errors.unauthorized()
  }

  // Rate limit check (60 req/min per key)
  const rateLimitResult = checkRateLimit(validated.apiKey.id)
  if (!rateLimitResult.allowed) {
    return errors.rateLimited(rateLimitResult.retryAfter)
  }

  // Look up user email from auth.users
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: userData } = await supabase.auth.admin.getUserById(validated.userId)
  const email = userData?.user?.email || ''

  return {
    userId: validated.userId,
    email,
    apiKeyId: validated.apiKey.id,
    isAdmin: isAdminEmail(email),
  }
}

/** Check if result is an auth context (not an error response) */
export function isAuthContext(result: unknown): result is V2AuthContext {
  return typeof result === 'object' && result !== null && 'userId' in result && 'apiKeyId' in result
}

// ---- In-memory rate limiter ----
// Note: approximate on serverless (per-isolate counters)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 60

function checkRateLimit(keyId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(keyId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter: 0 }
}
