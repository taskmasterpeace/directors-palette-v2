/**
 * Admin Authentication Helper
 * Verifies user is authenticated AND is an admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, type AuthenticatedContext } from './api-auth'
import { isAdminEmail } from '@/features/admin/types/admin.types'

/**
 * Require admin access for an API route.
 * Returns authenticated context if admin, or a 403 response if not.
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

  if (!isAdminEmail(auth.user.email)) {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Admin access required' },
      { status: 403 }
    )
  }

  return auth
}
