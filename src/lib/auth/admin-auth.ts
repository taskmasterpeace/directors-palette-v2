/**
 * Admin Authentication Helper
 * Verifies user is authenticated AND is an admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, type AuthenticatedContext } from './api-auth'
import { getAPIClient } from '@/lib/db/client'

/**
 * Require admin access for an API route.
 * Returns authenticated context if admin, or a 403 response if not.
 * Checks the admin_users table in the database (same as /api/admin/check).
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await requireAdmin(request)
 *   if (auth instanceof NextResponse) return auth // 401 or 403
 *   const { user, supabase } = auth
 * }
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedContext | NextResponse> {
  const auth = await getAuthenticatedUser(request)
  if (auth instanceof NextResponse) return auth // 401

  const email = auth.user.email
  if (!email) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    )
  }

  // Check admin_users table (service role bypasses RLS)
  const supabaseAdmin = await getAPIClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    )
  }

  return auth
}
