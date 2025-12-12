/**
 * Admin Service
 * Handles admin operations: user management, credits granting, stats
 *
 * Admin checks use database-backed admin_users table with fallback to hardcoded list
 */

import { getAPIClient } from '@/lib/db/client'
import { creditsService } from '@/features/credits/services/credits.service'
import type { UserWithCredits, AdminStatsResponse, DatabaseAdminUser, AdminPermissions } from '../types/admin.types'
import { isAdminEmail, FALLBACK_ADMIN_EMAILS } from '../types/admin.types'

// Cache for admin emails (refreshed every 5 minutes)
let adminEmailsCache: Set<string> | null = null
let adminEmailsCacheTime = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Helper to get an untyped client for credits tables (not in main DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminCreditsClient(): Promise<any> {
    return await getAPIClient()
}

class AdminService {
    /**
     * Check if a user email is an admin (synchronous - uses cache/fallback)
     * For critical paths, use checkAdminEmailAsync() instead
     */
    isAdmin(email: string | undefined): boolean {
        if (!email) return false
        const normalizedEmail = email.toLowerCase()

        // Check cache if valid
        if (adminEmailsCache && Date.now() - adminEmailsCacheTime < CACHE_TTL_MS) {
            return adminEmailsCache.has(normalizedEmail)
        }

        // Fall back to hardcoded list
        return isAdminEmail(email)
    }

    /**
     * Check if a user email is an admin (async - checks database)
     * This is the preferred method for API routes
     */
    async checkAdminEmailAsync(email: string | undefined): Promise<boolean> {
        if (!email) return false
        const normalizedEmail = email.toLowerCase()

        try {
            const supabase = await getAdminCreditsClient()

            // Check database first
            const { data, error } = await supabase
                .from('admin_users')
                .select('email')
                .eq('email', normalizedEmail)
                .single()

            if (!error && data) {
                // Update cache
                if (!adminEmailsCache) adminEmailsCache = new Set()
                adminEmailsCache.add(normalizedEmail)
                adminEmailsCacheTime = Date.now()
                return true
            }
        } catch (err) {
            console.warn('Database admin check failed, using fallback:', err)
        }

        // Fall back to hardcoded list
        return isAdminEmail(email)
    }

    /**
     * Get admin permissions for an email
     */
    async getAdminPermissions(email: string | undefined): Promise<AdminPermissions | null> {
        if (!email) return null
        const normalizedEmail = email.toLowerCase()

        try {
            const supabase = await getAdminCreditsClient()

            const { data, error } = await supabase
                .from('admin_users')
                .select('permissions')
                .eq('email', normalizedEmail)
                .single()

            if (!error && data) {
                return data.permissions as AdminPermissions
            }
        } catch (err) {
            console.warn('Failed to fetch admin permissions:', err)
        }

        // If in fallback list, grant full access
        if (isAdminEmail(email)) {
            return { full_access: true, can_grant_credits: true, can_manage_users: true }
        }

        return null
    }

    /**
     * Check if admin has a specific permission
     */
    async hasPermission(email: string | undefined, permission: keyof AdminPermissions): Promise<boolean> {
        const permissions = await this.getAdminPermissions(email)
        if (!permissions) return false

        // full_access grants all permissions
        if (permissions.full_access) return true

        return permissions[permission] === true
    }

    /**
     * Get all users with their credit balances
     * Requires service role key for auth.users access
     */
    async getAllUsers(options: {
        page?: number
        pageSize?: number
        search?: string
    } = {}): Promise<{ users: UserWithCredits[]; total: number }> {
        const { page = 1, pageSize = 50, search } = options
        const supabase = await getAPIClient()

        // Use auth admin to list users
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
            page,
            perPage: pageSize,
        })

        if (authError) {
            console.error('Error fetching users:', authError)
            throw new Error('Failed to fetch users')
        }

        const users = authData.users || []
        const total = authData.users?.length || 0

        // Filter by search if provided
        let filteredUsers = users
        if (search) {
            const searchLower = search.toLowerCase()
            filteredUsers = users.filter(u =>
                u.email?.toLowerCase().includes(searchLower) ||
                u.id.toLowerCase().includes(searchLower)
            )
        }

        // Get credits for each user
        const creditsClient = await getAdminCreditsClient()
        const usersWithCredits: UserWithCredits[] = await Promise.all(
            filteredUsers.map(async (user) => {
                // Get credits from user_credits table
                const { data: creditsData } = await creditsClient
                    .from('user_credits')
                    .select('balance, lifetime_purchased, lifetime_used')
                    .eq('user_id', user.id)
                    .single()

                return {
                    id: user.id,
                    email: user.email || '',
                    created_at: user.created_at,
                    last_sign_in_at: user.last_sign_in_at,
                    user_metadata: user.user_metadata,
                    credits: creditsData ? {
                        balance: creditsData.balance,
                        lifetime_purchased: creditsData.lifetime_purchased,
                        lifetime_used: creditsData.lifetime_used,
                    } : null
                }
            })
        )

        return { users: usersWithCredits, total }
    }

    /**
     * Grant credits to a user (admin action)
     */
    async grantCredits(
        adminEmail: string,
        targetUserId: string,
        amount: number,
        description?: string
    ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        // Verify admin
        if (!this.isAdmin(adminEmail)) {
            return { success: false, error: 'Unauthorized: Not an admin' }
        }

        if (amount <= 0) {
            return { success: false, error: 'Amount must be positive' }
        }

        // Use credits service to add credits
        const result = await creditsService.addCredits(targetUserId, amount, {
            type: 'bonus',
            description: description || `Admin grant by ${adminEmail}`,
            metadata: {
                granted_by: adminEmail,
                grant_type: 'admin_grant'
            }
        })

        return {
            success: result.success,
            newBalance: result.newBalance,
            error: result.error
        }
    }

    /**
     * Check if admin has unlimited credits (always returns true for admins)
     * Admins can generate without credits being deducted
     */
    isAdminWithUnlimitedCredits(email: string | undefined): boolean {
        return this.isAdmin(email)
    }

    /**
     * Get overall platform stats
     */
    async getStats(): Promise<AdminStatsResponse> {
        const supabase = await getAPIClient()
        const creditsClient = await getAdminCreditsClient()

        // Get total users
        const { data: authData } = await supabase.auth.admin.listUsers()
        const totalUsers = authData?.users?.length || 0

        // Get aggregate credit stats
        const { data: creditStats } = await creditsClient
            .from('user_credits')
            .select('lifetime_purchased, lifetime_used')

        let totalPurchased = 0
        let totalUsed = 0

        if (creditStats) {
            creditStats.forEach((row: { lifetime_purchased?: number; lifetime_used?: number }) => {
                totalPurchased += row.lifetime_purchased || 0
                totalUsed += row.lifetime_used || 0
            })
        }

        // Get total revenue from purchase transactions
        const { data: purchaseData } = await creditsClient
            .from('credit_transactions')
            .select('metadata')
            .eq('type', 'purchase')

        let totalRevenue = 0
        if (purchaseData) {
            purchaseData.forEach((tx: { metadata?: unknown }) => {
                const meta = tx.metadata as Record<string, unknown>
                if (meta?.price_cents) {
                    totalRevenue += Number(meta.price_cents)
                }
            })
        }

        return {
            total_users: totalUsers || 0,
            total_credits_purchased: totalPurchased,
            total_credits_used: totalUsed,
            total_revenue_cents: totalRevenue
        }
    }

    /**
     * Get admin emails (for display purposes)
     * Returns database admins + fallback list
     */
    async getAdminEmails(): Promise<string[]> {
        try {
            const supabase = await getAdminCreditsClient()

            const { data, error } = await supabase
                .from('admin_users')
                .select('email')

            if (!error && data && data.length > 0) {
                const dbEmails = data.map((row: { email: string }) => row.email)
                // Merge with fallback list (in case DB query succeeded but doesn't have all)
                const allEmails = new Set([...dbEmails, ...FALLBACK_ADMIN_EMAILS])
                return Array.from(allEmails)
            }
        } catch (err) {
            console.warn('Failed to fetch admin emails from DB:', err)
        }

        // Return fallback list
        return [...FALLBACK_ADMIN_EMAILS]
    }

    /**
     * Get all admin users from database
     */
    async listAdminUsers(): Promise<DatabaseAdminUser[]> {
        try {
            const supabase = await getAdminCreditsClient()

            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: true })

            if (!error && data) {
                return data as DatabaseAdminUser[]
            }
        } catch (err) {
            console.error('Failed to list admin users:', err)
        }

        return []
    }

    /**
     * Add a new admin user
     */
    async addAdminUser(
        email: string,
        name?: string,
        permissions: AdminPermissions = { full_access: true }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const supabase = await getAdminCreditsClient()
            const normalizedEmail = email.toLowerCase()

            const { error } = await supabase
                .from('admin_users')
                .insert({
                    email: normalizedEmail,
                    name: name || null,
                    permissions
                })

            if (error) {
                if (error.code === '23505') { // Unique violation
                    return { success: false, error: 'Admin with this email already exists' }
                }
                return { success: false, error: error.message }
            }

            // Clear cache
            adminEmailsCache = null

            return { success: true }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
        }
    }

    /**
     * Remove an admin user
     */
    async removeAdminUser(email: string): Promise<{ success: boolean; error?: string }> {
        try {
            const supabase = await getAdminCreditsClient()
            const normalizedEmail = email.toLowerCase()

            // Don't allow removing fallback admins
            if (FALLBACK_ADMIN_EMAILS.includes(normalizedEmail as typeof FALLBACK_ADMIN_EMAILS[number])) {
                return { success: false, error: 'Cannot remove fallback admin' }
            }

            const { error } = await supabase
                .from('admin_users')
                .delete()
                .eq('email', normalizedEmail)

            if (error) {
                return { success: false, error: error.message }
            }

            // Clear cache
            adminEmailsCache = null

            return { success: true }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
        }
    }

    /**
     * Refresh the admin emails cache
     */
    async refreshCache(): Promise<void> {
        try {
            const emails = await this.getAdminEmails()
            adminEmailsCache = new Set(emails.map(e => e.toLowerCase()))
            adminEmailsCacheTime = Date.now()
        } catch (err) {
            console.warn('Failed to refresh admin cache:', err)
        }
    }
}

export const adminService = new AdminService()
