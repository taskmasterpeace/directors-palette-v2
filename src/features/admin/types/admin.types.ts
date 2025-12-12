/**
 * Admin System Types
 * Defines types for admin users, permissions, and operations
 */

export interface AdminUser {
    id: string
    email: string
    created_at: string
    last_sign_in_at?: string
    user_metadata?: Record<string, unknown>
}

export interface UserWithCredits {
    id: string
    email: string
    created_at: string
    last_sign_in_at?: string
    user_metadata?: Record<string, unknown>
    credits: {
        balance: number
        lifetime_purchased: number
        lifetime_used: number
    } | null
}

export interface AdminUserListResponse {
    users: UserWithCredits[]
    total: number
    page: number
    pageSize: number
}

export interface GrantCreditsRequest {
    user_id: string
    amount: number
    description?: string
}

export interface GrantCreditsResponse {
    success: boolean
    new_balance?: number
    error?: string
}

export interface AdminStatsResponse {
    total_users: number
    total_credits_purchased: number
    total_credits_used: number
    total_revenue_cents: number
}

/**
 * Fallback admin emails - used when database check fails
 * Primary admin check should use checkAdminEmail() which queries database
 */
export const FALLBACK_ADMIN_EMAILS = [
    // Admin controlled via database admin_users table
    // Add emergency fallback emails here only if database is inaccessible
] as const

export type AdminEmail = typeof FALLBACK_ADMIN_EMAILS[number]

/**
 * Synchronous admin check - uses fallback list only
 * Use checkAdminEmail() for full database + fallback check
 */
export function isAdminEmail(email: string | undefined): boolean {
    if (!email) return false
    return FALLBACK_ADMIN_EMAILS.includes(email.toLowerCase() as AdminEmail)
}

/**
 * Admin permissions from database
 */
export interface AdminPermissions {
    full_access?: boolean
    can_grant_credits?: boolean
    can_manage_users?: boolean
}

/**
 * Database admin user record
 */
export interface DatabaseAdminUser {
    id: string
    email: string
    name: string | null
    permissions: AdminPermissions
    created_at: string
    updated_at: string
}
