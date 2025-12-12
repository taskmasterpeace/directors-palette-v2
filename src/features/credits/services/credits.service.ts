/**
 * Credits Service
 * Handles all credit-related operations: balance checks, deductions, additions
 */

import { getClient } from '@/lib/db/client'
import type {
    UserCredits,
    CreditTransaction,
    ModelPricing,
    CreditPackage,
    TransactionType,
    GenerationType
} from '../types/credits.types'

// Helper to get an untyped client for credits tables (not in main DB types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCreditsClient(): Promise<any> {
    return await getClient()
}

// Re-export DEFAULT_PRICING for use in this service
const FALLBACK_PRICING: Record<GenerationType, { cost_cents: number; price_cents: number }> = {
    image: { cost_cents: 15, price_cents: 20 },
    video: { cost_cents: 30, price_cents: 40 },
    audio: { cost_cents: 10, price_cents: 15 },
    text: { cost_cents: 2, price_cents: 3 },
}

// Initial credits for new users (3 image generations = 3 x 20 cents = 60 cents)
const INITIAL_CREDITS_FOR_NEW_USERS = 60

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
            console.error('Error fetching user credits:', error)
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
                console.error('Error creating user credits record:', insertError)
                return null
            }

            console.log(`🎁 New user ${userId} received ${INITIAL_CREDITS_FOR_NEW_USERS} free credits (5 generations)`)
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
            console.warn(`No pricing found for model ${modelId}, using fallback`)
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
        } = {}
    ): Promise<{ success: boolean; transaction?: CreditTransaction; error?: string; newBalance?: number }> {
        const { generationType = 'image', predictionId, description } = options
        const supabase = await getCreditsClient()

        // Get pricing for this model
        const pricing = await this.getModelPricing(modelId)
        const priceToDeduct = pricing?.price_cents ?? FALLBACK_PRICING[generationType].price_cents
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
                return {
                    success: true,
                    newBalance: atomicResult.new_balance
                }
            } else {
                return {
                    success: false,
                    error: atomicResult.error_message || 'Deduction failed'
                }
            }
        }

        // Fallback to non-atomic method if RPC fails (e.g., function doesn't exist yet)
        if (rpcError) {
            console.warn('Atomic deduction unavailable, falling back to standard method:', rpcError.message)
        }

        // FALLBACK: Standard non-atomic deduction (for backwards compatibility)
        const balance = await this.getBalance(userId)
        if (!balance) {
            return { success: false, error: 'Unable to fetch user balance' }
        }

        // Check sufficient funds
        if (balance.balance < priceToDeduct) {
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
            console.error('Error updating balance:', updateError)
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
            console.error('Error creating transaction:', txError)
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
            console.error('Error updating balance:', updateError)
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
            console.error('Error creating transaction:', txError)
        }

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
            console.error('Error fetching transactions:', error)
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
            console.error('Error fetching credit packages:', error)
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
            console.error('Error fetching model pricing:', error)
            return []
        }

        return data as ModelPricing[]
    }
}

// Export singleton instance
export const creditsService = new CreditsService()
