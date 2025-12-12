/**
 * Credits System Types
 * Defines types for user credits, transactions, and pricing
 */

export interface UserCredits {
    id: string
    user_id: string
    balance: number  // Credits in cents (100 = $1.00)
    lifetime_purchased: number
    lifetime_used: number
    created_at: string
    updated_at: string
}

export type TransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'adjustment'

export interface CreditTransaction {
    id: string
    user_id: string
    type: TransactionType
    amount: number  // Positive for additions, negative for deductions
    balance_after: number
    description?: string
    metadata: Record<string, unknown>
    created_at: string
}

export interface CreditPackage {
    id: string
    name: string
    credits: number  // Amount of credits
    price_cents: number  // Price in USD cents
    bonus_credits: number
    is_active: boolean
    sort_order: number
    created_at: string
    updated_at: string
}

export type GenerationType = 'image' | 'video' | 'audio' | 'text'

export interface ModelPricing {
    id: string
    model_id: string
    model_name: string
    provider: string
    generation_type: GenerationType
    cost_cents: number  // Our cost per generation
    price_cents: number  // What we charge user
    is_active: boolean
    metadata: Record<string, unknown>
    created_at: string
    updated_at: string
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface GetBalanceResponse {
    balance: number
    lifetime_purchased: number
    lifetime_used: number
}

export interface DeductCreditsRequest {
    model_id: string
    prediction_id?: string
    description?: string
}

export interface DeductCreditsResponse {
    success: boolean
    credits_deducted: number
    new_balance: number
    error?: string
}

export interface AddCreditsRequest {
    amount: number
    type: TransactionType
    description?: string
    metadata?: Record<string, unknown>
}

export interface AddCreditsResponse {
    success: boolean
    credits_added: number
    new_balance: number
    error?: string
}

export interface CheckBalanceRequest {
    model_id: string
}

export interface CheckBalanceResponse {
    has_sufficient_credits: boolean
    current_balance: number
    required_credits: number
    model_name: string
}

// ============================================================================
// Pricing Helpers
// ============================================================================

/**
 * Default fallback pricing if model not in database
 * Conservative pricing to avoid undercharging
 */
export const DEFAULT_PRICING: Record<GenerationType, { cost_cents: number; price_cents: number }> = {
    image: { cost_cents: 15, price_cents: 20 },
    video: { cost_cents: 30, price_cents: 40 },
    audio: { cost_cents: 10, price_cents: 15 },
    text: { cost_cents: 2, price_cents: 3 },
}

/**
 * Calculate profit margin
 */
export function calculateMargin(cost_cents: number, price_cents: number): number {
    return price_cents - cost_cents
}

/**
 * Calculate profit percentage
 */
export function calculateMarginPercent(cost_cents: number, price_cents: number): number {
    if (cost_cents === 0) return 100
    return ((price_cents - cost_cents) / cost_cents) * 100
}

/**
 * Format credits as currency string
 */
export function formatCredits(credits: number): string {
    return `$${(credits / 100).toFixed(2)}`
}
