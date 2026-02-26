/**
 * Credits Service
 * Handles all credit-related operations: balance checks, deductions, additions
 * Includes abuse prevention for free credits
 */

import { getClient, getAPIClient } from '@/lib/db/client'
import { lognog } from '@/lib/lognog'
import type {
    UserCredits,
    CreditTransaction,
    ModelPricing,
    CreditPackage,
    TransactionType,
    GenerationType
} from '../types/credits.types'
import { logger } from '@/lib/logger'

// Helper to get an untyped client for credits tables (not in main DB types yet)
// Uses anon key - respects RLS (for user-facing operations)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCreditsClient(): Promise<any> {
    return await getClient()
}

// Helper to get admin client for server-side operations that need to bypass RLS
// Uses service role key - bypasses RLS (for webhooks, admin operations)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAdminCreditsClient(): Promise<any> {
    return await getAPIClient()
}

// Re-export DEFAULT_PRICING for use in this service
const FALLBACK_PRICING: Record<GenerationType, { cost_cents: number; price_cents: number }> = {
    image: { cost_cents: 15, price_cents: 20 },
    video: { cost_cents: 30, price_cents: 40 },
    audio: { cost_cents: 10, price_cents: 15 },
    text: { cost_cents: 2, price_cents: 3 },
}

// Initial credits for new users (matches database trigger in migrations)
const INITIAL_CREDITS_FOR_NEW_USERS = 65

// Reduced credits for suspicious signups (detected same IP)
const REDUCED_CREDITS_FOR_SUSPICIOUS = 0  // Give nothing if IP already used

export interface AbuseCheckResult {
    isSuspicious: boolean
    existingUsers: number
    recommendation: 'allow_full_credits' | 'allow_reduced_credits' | 'deny_free_credits'
    creditsToGrant: number
}

class CreditsService {
    /**
     * Get user's current credit balance
     * Creates record if doesn't exist (new user)
     */
    async getBalance(userId: string): Promise<UserCredits | null> {
        const supabase = await getCreditsClient()

        // Try to get existing record
        const { data, error } = await supabase
            .from('user_credits')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') {
            logger.credits.error('Error fetching user credits', { error: error })
            return null
        }

        // If no record exists, create one with initial free credits
        if (!data) {
            const { data: newRecord, error: insertError } = await supabase
                .from('user_credits')
                .insert({
                    user_id: userId,
                    balance: INITIAL_CREDITS_FOR_NEW_USERS,
                    lifetime_purchased: 0,
                    lifetime_used: 0
                })
                .select()
                .single()

            if (insertError) {
                logger.credits.error('Error creating user credits record', { insertError: insertError })
                return null
            }

            logger.credits.info('New user received free credits', { userId, credits: INITIAL_CREDITS_FOR_NEW_USERS, generations: 5 })
            return newRecord as UserCredits
        }

        return data as UserCredits
    }

    /**
     * Get pricing for a specific model
     */
    async getModelPricing(modelId: string): Promise<ModelPricing | null> {
        const supabase = await getCreditsClient()

        const { data, error } = await supabase
            .from('model_pricing')
            .select('*')
            .eq('model_id', modelId)
            .eq('is_active', true)
            .single()

        if (error) {
            logger.credits.warn('No pricing found for model, using fallback', { modelId })
            return null
        }

        return data as ModelPricing
    }

    /**
     * Get price for a model (with fallback)
     */
    async getPriceForModel(modelId: string, generationType: GenerationType = 'image'): Promise<number> {
        const pricing = await this.getModelPricing(modelId)
        if (pricing) {
            return pricing.price_cents
        }
        return FALLBACK_PRICING[generationType].price_cents
    }

    /**
     * Check if user has sufficient credits for a model
     */
    async hasSufficientCredits(
        userId: string,
        modelId: string,
        generationType: GenerationType = 'image'
    ): Promise<{ sufficient: boolean; balance: number; required: number; modelName: string }> {
        const [balance, pricing] = await Promise.all([
            this.getBalance(userId),
            this.getModelPricing(modelId)
        ])

        const currentBalance = balance?.balance ?? 0
        const required = pricing?.price_cents ?? FALLBACK_PRICING[generationType].price_cents
        const modelName = pricing?.model_name ?? modelId

        return {
            sufficient: currentBalance >= required,
            balance: currentBalance,
            required,
            modelName
        }
    }

    /**
     * Deduct credits for a generation
     * Uses atomic database function to prevent race conditions
     * Returns the transaction or null if insufficient funds
     */
    async deductCredits(
        userId: string,
        modelId: string,
        options: {
            generationType?: GenerationType
            predictionId?: string
            description?: string
            overrideAmount?: number  // For video: calculated cost based on duration/resolution
            user_email?: string  // For LogNog analytics
        } = {}
    ): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string; newBalance?: number }> {
        const { generationType = 'image', predictionId, description, overrideAmount, user_email } = options
        const supabase = await getCreditsClient()

        // Get pricing for this model (used for metadata, may be overridden for videos)
        const pricing = await this.getModelPricing(modelId)
        // Use override amount if provided (for video duration-based pricing), otherwise use DB pricing
        const priceToDeduct = overrideAmount ?? pricing?.price_cents ?? FALLBACK_PRICING[generationType].price_cents
        const modelName = pricing?.model_name ?? modelId

        // Build metadata for the transaction
        const metadata = {
            model_id: modelId,
            model_name: modelName,
            prediction_id: predictionId,
            generation_type: generationType,
            cost_cents: pricing?.cost_cents ?? FALLBACK_PRICING[generationType].cost_cents,
            price_cents: priceToDeduct
        }

        // Use atomic deduction function (race-condition safe)
        // This function uses FOR UPDATE lock to prevent concurrent modifications
        const { data: result, error: rpcError } = await supabase
            .rpc('deduct_credits_atomic', {
                p_user_id: userId,
                p_amount: priceToDeduct,
                p_description: description || `${modelName} generation`,
                p_transaction_type: 'generation',
                p_metadata: metadata
            })

        // If the atomic function exists and works, use its result
        if (!rpcError && result && result.length > 0) {
            const atomicResult = result[0]
            if (atomicResult.success) {
                // Log successful credit deduction
                lognog.info('credit_deduction', {
                    type: 'business',
                    event: 'credit_deduction',
                    user_id: userId,
                    user_email: user_email,
                    credits_deducted: priceToDeduct,
                    credits_after: atomicResult.new_balance,
                    model: modelId,
                    reason: generationType,
                    prediction_id: predictionId,
                })
                return {
                    success: true,
                    newBalance: atomicResult.new_balance
                }
            } else {
                // Log failed credit deduction (critical - revenue impacting)
                lognog.warn('credit_deduction_failed', {
                    type: 'business',
                    event: 'credit_deduction_failed',
                    user_id: userId,
                    user_email: user_email,
                    credits_deducted: priceToDeduct,
                    model: modelId,
                    reason: atomicResult.error_message || 'unknown',
                })
                return {
                    success: false,
                    error: atomicResult.error_message || 'Deduction failed'
                }
            }
        }

        // Fallback to non-atomic method if RPC fails (e.g., function doesn't exist yet)
        if (rpcError) {
            logger.credits.warn('Atomic deduction unavailable, falling back to standard method', { message: rpcError.message })
        }

        // FALLBACK: Standard non-atomic deduction (for backwards compatibility)
        const balance = await this.getBalance(userId)
        if (!balance) {
            return { success: false, error: 'Unable to fetch user balance' }
        }

        // Check sufficient funds
        if (balance.balance < priceToDeduct) {
            // Log insufficient credits
            lognog.warn('credit_deduction_failed', {
                type: 'business',
                event: 'credit_deduction_failed',
                user_id: userId,
                user_email: user_email,
                credits_deducted: priceToDeduct,
                credits_before: balance.balance,
                model: modelId,
                reason: 'insufficient_balance',
            })
            return {
                success: false,
                error: `Insufficient credits. Need ${priceToDeduct} credits, have ${balance.balance}`
            }
        }

        const newBalance = balance.balance - priceToDeduct

        // Update balance
        const { error: updateError } = await supabase
            .from('user_credits')
            .update({
                balance: newBalance,
                lifetime_used: balance.lifetime_used + priceToDeduct
            })
            .eq('user_id', userId)

        if (updateError) {
            logger.credits.error('Error updating balance', { updateError: updateError })
            return { success: false, error: 'Failed to update balance' }
        }

        // Create transaction record
        const transactionData = {
            user_id: userId,
            type: 'usage' as TransactionType,
            amount: -priceToDeduct,
            balance_after: newBalance,
            description: description || `${modelName} generation`,
            metadata
        }

        const { data: transaction, error: txError } = await supabase
            .from('credit_transactions')
            .insert(transactionData)
            .select()
            .single()

        if (txError) {
            logger.credits.error('Error creating transaction', { txError: txError })
            // Balance was already deducted, so still return success
        }

        return {
            success: true,
            transaction: transaction as CreditTransaction,
            newBalance
        }
    }

    /**
     * Add credits to user account (for purchases, bonuses, etc.)
     * Uses anon key - for user-initiated operations
     */
    async addCredits(
        userId: string,
        amount: number,
        options: {
            type?: TransactionType
            description?: string
            metadata?: Record<string, unknown>
        } = {}
    ): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string; newBalance?: number }> {
        const { type = 'purchase', description, metadata = {} } = options
        const supabase = await getCreditsClient()

        // Get current balance
        const balance = await this.getBalance(userId)
        if (!balance) {
            return { success: false, error: 'Unable to fetch user balance' }
        }

        const newBalance = balance.balance + amount
        const isPurchase = type === 'purchase'

        // Update balance
        const updateData: Partial<UserCredits> = { balance: newBalance }
        if (isPurchase) {
            updateData.lifetime_purchased = balance.lifetime_purchased + amount
        }

        const { error: updateError } = await supabase
            .from('user_credits')
            .update(updateData)
            .eq('user_id', userId)

        if (updateError) {
            logger.credits.error('Error updating balance', { updateError: updateError })
            return { success: false, error: 'Failed to update balance' }
        }

        // Create transaction record
        const transactionData = {
            user_id: userId,
            type,
            amount,
            balance_after: newBalance,
            description: description || `${type} - ${amount} credits`,
            metadata
        }

        const { data: transaction, error: txError } = await supabase
            .from('credit_transactions')
            .insert(transactionData)
            .select()
            .single()

        if (txError) {
            logger.credits.error('Error creating transaction', { txError: txError })
        }

        return {
            success: true,
            transaction: transaction as CreditTransaction,
            newBalance
        }
    }

    /**
     * Add credits using admin/service role (bypasses RLS)
     * Used by webhooks and server-side operations
     */
    async addCreditsAdmin(
        userId: string,
        amount: number,
        options: {
            type?: TransactionType
            description?: string
            metadata?: Record<string, unknown>
        } = {}
    ): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string; newBalance?: number }> {
        const { type = 'purchase', description, metadata = {} } = options
        const supabase = await getAdminCreditsClient()

        // Get current balance (or create if doesn't exist)
        const { data: existingBalance, error: fetchError } = await supabase
            .from('user_credits')
            .select('*')
            .eq('user_id', userId)
            .single()

        let balance: UserCredits

        if (fetchError && fetchError.code === 'PGRST116') {
            // No record exists, create one
            const { data: newRecord, error: insertError } = await supabase
                .from('user_credits')
                .insert({
                    user_id: userId,
                    balance: 0,
                    lifetime_purchased: 0,
                    lifetime_used: 0
                })
                .select()
                .single()

            if (insertError) {
                logger.credits.error('Error creating user credits record (admin)', { insertError: insertError })
                return { success: false, error: 'Failed to create user credits record' }
            }

            balance = newRecord as UserCredits
            logger.credits.info('Created new credits record for user', { userId })
        } else if (fetchError) {
            logger.credits.error('Error fetching user credits (admin)', { fetchError: fetchError })
            return { success: false, error: 'Unable to fetch user balance' }
        } else {
            balance = existingBalance as UserCredits
        }

        const newBalance = balance.balance + amount
        const isPurchase = type === 'purchase'

        // Update balance
        const updateData: Partial<UserCredits> = { balance: newBalance }
        if (isPurchase) {
            updateData.lifetime_purchased = (balance.lifetime_purchased || 0) + amount
        }

        const { error: updateError } = await supabase
            .from('user_credits')
            .update(updateData)
            .eq('user_id', userId)

        if (updateError) {
            logger.credits.error('Error updating balance (admin)', { updateError: updateError })
            return { success: false, error: 'Failed to update balance' }
        }

        // Create transaction record
        const transactionData = {
            user_id: userId,
            type,
            amount,
            balance_after: newBalance,
            description: description || `${type} - ${amount} credits`,
            metadata
        }

        const { data: transaction, error: txError } = await supabase
            .from('credit_transactions')
            .insert(transactionData)
            .select()
            .single()

        if (txError) {
            logger.credits.error('Error creating transaction (admin)', { txError: txError })
            // Balance was already updated, so still return success
        }

        logger.credits.info('Admin added credits', { userId, amount, newBalance })

        return {
            success: true,
            transaction: transaction as CreditTransaction,
            newBalance
        }
    }

    /**
     * Get user's transaction history
     */
    async getTransactionHistory(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<CreditTransaction[]> {
        const { limit = 50, offset = 0 } = options
        const supabase = await getCreditsClient()

        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            logger.credits.error('Error fetching transactions', { error: error })
            return []
        }

        return data as CreditTransaction[]
    }

    /**
     * Get all available credit packages
     */
    async getCreditPackages(): Promise<CreditPackage[]> {
        const supabase = await getCreditsClient()

        const { data, error } = await supabase
            .from('credit_packages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })

        if (error) {
            logger.credits.error('Error fetching credit packages', { error: error })
            return []
        }

        return data as CreditPackage[]
    }

    /**
     * Get all model pricing
     */
    async getAllModelPricing(): Promise<ModelPricing[]> {
        const supabase = await getCreditsClient()

        const { data, error } = await supabase
            .from('model_pricing')
            .select('*')
            .eq('is_active', true)
            .order('generation_type', { ascending: true })

        if (error) {
            logger.credits.error('Error fetching model pricing', { error: error })
            return []
        }

        return data as ModelPricing[]
    }

    // ============================================================================
    // ABUSE PREVENTION METHODS
    // ============================================================================

    /**
     * Check if an IP address has already been used for free credits
     * Uses service role to bypass RLS on abuse tracking tables
     */
    async checkIPForAbuse(ipAddress: string): Promise<AbuseCheckResult> {
        const supabase = await getAdminCreditsClient()

        try {
            // Call the database function
            const { data, error } = await supabase.rpc('check_ip_abuse', {
                p_ip_address: ipAddress
            })

            if (error) {
                logger.credits.warn('Abuse check failed, allowing credits', { message: error.message })
                // If the function doesn't exist yet, allow full credits
                return {
                    isSuspicious: false,
                    existingUsers: 0,
                    recommendation: 'allow_full_credits',
                    creditsToGrant: INITIAL_CREDITS_FOR_NEW_USERS
                }
            }

            if (!data || data.length === 0) {
                return {
                    isSuspicious: false,
                    existingUsers: 0,
                    recommendation: 'allow_full_credits',
                    creditsToGrant: INITIAL_CREDITS_FOR_NEW_USERS
                }
            }

            const result = data[0]
            let creditsToGrant = INITIAL_CREDITS_FOR_NEW_USERS

            if (result.recommendation === 'deny_free_credits') {
                creditsToGrant = REDUCED_CREDITS_FOR_SUSPICIOUS
            } else if (result.recommendation === 'allow_reduced_credits') {
                // Second account from same IP - no free credits
                creditsToGrant = REDUCED_CREDITS_FOR_SUSPICIOUS
            }

            return {
                isSuspicious: result.is_suspicious,
                existingUsers: result.existing_users,
                recommendation: result.recommendation,
                creditsToGrant
            }
        } catch (err) {
            logger.credits.error('Error checking IP for abuse', { error: err instanceof Error ? err.message : String(err) })
            // On error, allow full credits (fail open)
            return {
                isSuspicious: false,
                existingUsers: 0,
                recommendation: 'allow_full_credits',
                creditsToGrant: INITIAL_CREDITS_FOR_NEW_USERS
            }
        }
    }

    /**
     * Record a signup IP and potentially flag for abuse
     * Called after granting free credits to a new user
     */
    async recordSignupIP(
        userId: string,
        ipAddress: string,
        userAgent?: string,
        creditsGranted: number = INITIAL_CREDITS_FOR_NEW_USERS
    ): Promise<{ success: boolean; flagged: boolean }> {
        const supabase = await getAdminCreditsClient()

        try {
            const { data, error } = await supabase.rpc('record_signup_ip', {
                p_user_id: userId,
                p_ip_address: ipAddress,
                p_user_agent: userAgent || null,
                p_credits_granted: creditsGranted
            })

            if (error) {
                logger.credits.warn('Failed to record signup IP', { message: error.message })
                return { success: false, flagged: false }
            }

            const result = data as { recorded: boolean; is_suspicious: boolean }
            logger.credits.info('Recorded signup IP', { userId, ipAddress, flagged: result?.is_suspicious || false })

            return {
                success: result?.recorded || true,
                flagged: result?.is_suspicious || false
            }
        } catch (err) {
            logger.credits.error('Error recording signup IP', { error: err instanceof Error ? err.message : String(err) })
            return { success: false, flagged: false }
        }
    }

    /**
     * Get user's credit balance with IP-based abuse prevention
     * Creates record if doesn't exist (new user), but checks IP first
     */
    async getBalanceWithAbuseCheck(
        userId: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<UserCredits | null> {
        const supabase = await getCreditsClient()

        // Try to get existing record
        const { data, error } = await supabase
            .from('user_credits')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') {
            logger.credits.error('Error fetching user credits', { error: error })
            return null
        }

        // If record exists, return it (no free credits check needed)
        if (data) {
            return data as UserCredits
        }

        // New user - check for abuse before granting credits
        let creditsToGrant = INITIAL_CREDITS_FOR_NEW_USERS
        let abuseCheck: AbuseCheckResult | null = null

        if (ipAddress) {
            abuseCheck = await this.checkIPForAbuse(ipAddress)
            creditsToGrant = abuseCheck.creditsToGrant

            if (abuseCheck.isSuspicious) {
                logger.credits.warn('Suspicious signup detected', { userId, ipAddress, existingUsers: abuseCheck.existingUsers, recommendation: abuseCheck.recommendation, creditsToGrant, normalCredits: INITIAL_CREDITS_FOR_NEW_USERS })
            }
        }

        // Create new user credits record
        const { data: newRecord, error: insertError } = await supabase
            .from('user_credits')
            .insert({
                user_id: userId,
                balance: creditsToGrant,
                lifetime_purchased: 0,
                lifetime_used: 0
            })
            .select()
            .single()

        if (insertError) {
            logger.credits.error('Error creating user credits record', { insertError: insertError })
            return null
        }

        // Record the signup IP for future abuse detection
        if (ipAddress) {
            await this.recordSignupIP(userId, ipAddress, userAgent, creditsToGrant)
        }

        if (creditsToGrant > 0) {
            logger.credits.info('New user received free credits', { userId, credits: creditsToGrant, generations: creditsToGrant / 20 })
        } else {
            logger.credits.info('New user received 0 credits due to abuse prevention', { userId })
        }

        return newRecord as UserCredits
    }

    /**
     * Get abuse summary for admin dashboard
     */
    async getAbuseSummary(): Promise<{
        totalFlags: number
        unresolvedFlags: number
        criticalFlags: number
        flaggedIPs: number
        recentFlags: unknown[]
    } | null> {
        const supabase = await getAdminCreditsClient()

        try {
            const { data, error } = await supabase.rpc('get_abuse_summary')

            if (error) {
                logger.credits.error('Error fetching abuse summary', { error: error })
                return null
            }

            if (!data || data.length === 0) {
                return {
                    totalFlags: 0,
                    unresolvedFlags: 0,
                    criticalFlags: 0,
                    flaggedIPs: 0,
                    recentFlags: []
                }
            }

            const result = data[0]
            return {
                totalFlags: result.total_flags || 0,
                unresolvedFlags: result.unresolved_flags || 0,
                criticalFlags: result.critical_flags || 0,
                flaggedIPs: result.flagged_ips || 0,
                recentFlags: result.recent_flags || []
            }
        } catch (err) {
            logger.credits.error('Error fetching abuse summary', { error: err instanceof Error ? err.message : String(err) })
            return null
        }
    }
}

// Export singleton instance
export const creditsService = new CreditsService()
