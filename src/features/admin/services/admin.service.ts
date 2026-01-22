
import { SupabaseClient } from '@supabase/supabase-js'

import { getClient } from '@/lib/db/client'

// Define the shape of User with Stats
export interface UserWithStats {
    id: string
    email: string
    created_at: string
    last_sign_in_at: string
    credits?: {
        balance: number
        lifetime_purchased: number
    }
}

export class AdminService {
    constructor(
        private readonly supabase?: SupabaseClient
    ) { }

    /**
     * Check if the current user is an admin
     */
    async isAdmin(): Promise<boolean> {
        try {
            const client = this.supabase || await getClient()
            const { data: { user } } = await client.auth.getUser()
            if (!user?.email) return false
            return this.checkAdminEmailAsync(user.email)
        } catch (error) {
            console.error('Error checking admin status:', error)
            return false
        }
    }

    /**
     * Check if an email belongs to an admin
     */
    async checkAdminEmailAsync(email: string): Promise<boolean> {
        try {
            const client = this.supabase || await getClient()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (client as any)
                .from('admin_users')
                .select('*')
                .eq('email', email)
                .maybeSingle()
            return !!data
        } catch (error) {
            console.error('Error checking admin email:', error)
            return false
        }
    }

    /**
     * Get platform-wide statistics
     * Note: Limited by RLS - only returns data visible to authenticated admin
     */
    async getStats(): Promise<{
        total_users: number
        total_credits_purchased: number
        total_credits_used: number
        total_revenue_cents: number
    }> {
        try {
            const client = this.supabase || await getClient()

            // Get user count from user_credits table (proxy for registered users)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count: userCount } = await (client as any)
                .from('user_credits')
                .select('*', { count: 'exact', head: true })

            // Get aggregated credit stats
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: creditStats } = await (client as any)
                .from('user_credits')
                .select('balance, lifetime_purchased, lifetime_used')

            let totalPurchased = 0
            let totalUsed = 0

            if (creditStats) {
                for (const row of creditStats) {
                    totalPurchased += row.lifetime_purchased || 0
                    totalUsed += row.lifetime_used || 0
                }
            }

            return {
                total_users: userCount || 0,
                total_credits_purchased: totalPurchased,
                total_credits_used: totalUsed,
                total_revenue_cents: totalPurchased // Assuming 1 credit = 1 cent for now
            }
        } catch (error) {
            console.error('Error fetching stats:', error)
            return {
                total_users: 0,
                total_credits_purchased: 0,
                total_credits_used: 0,
                total_revenue_cents: 0
            }
        }
    }

    /**
     * Get all users with stats (Admin only)
     * Combines user_credits with emails from generation_events
     */
    async getAllUsers(options: { page: number; pageSize: number; search?: string }): Promise<{ users: UserWithStats[]; total: number }> {
        const client = this.supabase || await getClient()

        const from = (options.page - 1) * options.pageSize
        const to = from + options.pageSize - 1

        // Get all user credits
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (client as any)
            .from('user_credits')
            .select('*', { count: 'exact' })

        // If searching, we need to search by user_id (can't search email from this table)
        if (options.search) {
            query = query.ilike('user_id', `%${options.search}%`)
        }

        const { data: creditsData, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to)

        if (error) {
            console.error('Error fetching user_credits:', error)
            return { users: [], total: 0 }
        }

        if (!creditsData || creditsData.length === 0) {
            return { users: [], total: 0 }
        }

        // Get emails from generation_events for these users
        const userIds = creditsData.map((u: { user_id: string }) => u.user_id)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: emailData } = await (client as any)
            .from('generation_events')
            .select('user_id, user_email')
            .in('user_id', userIds)
            .not('user_email', 'is', null)

        // Create email lookup map
        const emailMap = new Map<string, string>()
        if (emailData) {
            for (const e of emailData) {
                if (e.user_email && !emailMap.has(e.user_id)) {
                    emailMap.set(e.user_id, e.user_email)
                }
            }
        }

        // Check which users are admins
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: adminData } = await (client as any)
            .from('admin_users')
            .select('email')

        const adminEmails = new Set(adminData?.map((a: { email: string }) => a.email) || [])

        // Build user list
        const users = creditsData.map((u: { user_id: string; balance: number; lifetime_purchased: number; lifetime_used: number; created_at?: string }) => {
            const email = emailMap.get(u.user_id) || u.user_id.slice(0, 8) + '...'
            return {
                id: u.user_id,
                email,
                created_at: u.created_at || new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
                credits: {
                    balance: u.balance,
                    lifetime_purchased: u.lifetime_purchased,
                    lifetime_used: u.lifetime_used
                },
                is_admin: adminEmails.has(email)
            }
        })

        return { users, total: count || 0 }
    }

    /**
     * Grant credits to a user (Admin only)
     */
    async grantCredits(
        adminEmail: string,
        userId: string,
        amount: number,
        description?: string
    ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
        try {
            // Verify admin
            const isAdmin = await this.checkAdminEmailAsync(adminEmail)
            if (!isAdmin) {
                return { success: false, error: 'Unauthorized - not an admin' }
            }

            const client = this.supabase || await getClient()

            // Get current balance
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: currentCredits, error: fetchError } = await (client as any)
                .from('user_credits')
                .select('balance')
                .eq('user_id', userId)
                .maybeSingle()

            if (fetchError) {
                console.error('Error fetching user credits:', fetchError)
                return { success: false, error: 'Failed to fetch user credits' }
            }

            const currentBalance = currentCredits?.balance || 0
            const newBalance = currentBalance + amount

            // Update or insert credits
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: updateError } = await (client as any)
                .from('user_credits')
                .upsert({
                    user_id: userId,
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (updateError) {
                console.error('Error granting credits:', updateError)
                return { success: false, error: 'Failed to grant credits' }
            }

            console.log(`Admin ${adminEmail} granted ${amount} credits to user ${userId}. Reason: ${description || 'N/A'}`)

            return { success: true, newBalance }
        } catch (error) {
            console.error('Error in grantCredits:', error)
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
    }
}

export const adminService = new AdminService()
