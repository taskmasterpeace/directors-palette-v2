/**
 * Desktop API Authentication
 * Handles both dp_ API keys and Supabase JWTs for Desktop app integration
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

export interface DesktopUser {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
}

type DesktopAuthResult =
  | { user: DesktopUser }
  | NextResponse

/**
 * Authenticate a Desktop API request.
 * Accepts either a dp_ API key or a Supabase JWT in the Authorization header.
 */
export async function authenticateDesktopRequest(
  request: NextRequest
): Promise<DesktopAuthResult> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : authHeader

  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  // dp_ API key auth
  if (token.startsWith('dp_')) {
    const validated = await apiKeyService.validateApiKey(token)
    if (!validated) {
      return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
    }
    return lookupUser(validated.userId)
  }

  // Supabase JWT auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }

  const meta = (user.user_metadata || {}) as Record<string, string>
  return {
    user: {
      id: user.id,
      email: user.email || '',
      display_name: meta.full_name || user.email?.split('@')[0] || '',
      avatar_url: meta.avatar_url || null,
    },
  }
}

/**
 * Look up user info from a user ID (for API key auth path)
 */
async function lookupUser(userId: string): Promise<DesktopAuthResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
  if (error || !user) {
    return NextResponse.json({ error: 'invalid_api_key' }, { status: 401 })
  }

  const meta = (user.user_metadata || {}) as Record<string, string>
  return {
    user: {
      id: user.id,
      email: user.email || '',
      display_name: meta.full_name || user.email?.split('@')[0] || '',
      avatar_url: meta.avatar_url || null,
    },
  }
}

/**
 * Add CORS headers for Desktop API responses
 */
export function withDesktopCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}
