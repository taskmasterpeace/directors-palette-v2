'use client'

import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

/**
 * Simple hook to check if current user is admin
 * Returns false while loading, true/false once resolved
 */
export function useIsAdmin(): boolean {
  const { isAdmin, loading } = useAdminAuth()

  // Return false while loading to avoid showing admin controls prematurely
  if (loading) return false

  return isAdmin
}
