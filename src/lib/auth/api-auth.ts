/**
 * API Authentication Utilities
 * Provides authentication verification for API routes
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/lib/db/types'
import { logger } from '@/lib/logger'

export interface AuthenticatedContext {
  user: {
    id: string
    email?: string
  }
  supabase: ReturnType<typeof createServerClient<Database>>
}

/**
 * Verify the authenticated user for API routes
 * Returns authenticated user context or 401 error response
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await getAuthenticatedUser(request)
 *   if (auth instanceof NextResponse) return auth // 401 error
 *
 *   const { user, supabase } = auth
 *   // Use authenticated user ID and supabase client
 * }
 */
export async function getAuthenticatedUser(
  _request: NextRequest
): Promise<AuthenticatedContext | NextResponse> {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore errors in Server Component context
            }
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be authenticated to access this resource'
        },
        { status: 401 }
      )
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      supabase,
    }
  } catch (error) {
    logger.auth.error('Authentication error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: 'Failed to verify authentication'
      },
      { status: 401 }
    )
  }
}
