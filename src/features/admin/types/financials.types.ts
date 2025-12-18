/**
 * Financial Dashboard Types
 * Types for revenue, costs, and user economics metrics
 */

export type TimePeriod = 'today' | 'week' | 'month' | 'all_time' | 'custom'

export interface DateRange {
    from: string  // ISO date string
    to: string    // ISO date string
}

// ============================================================================
// Revenue & Costs Metrics
// ============================================================================

export interface RevenueMetrics {
    total_revenue_cents: number         // Sum of all credit purchases
    total_api_cost_cents: number        // Sum of model_pricing.cost_cents for all generations
    gross_profit_cents: number          // revenue - api_cost
    gross_margin_percent: number        // (profit / revenue) * 100
    average_cost_per_generation: number // total_api_cost / total_generations
    total_generations: number           // Count of completed generation_events
}

// ============================================================================
// User Economics Metrics
// ============================================================================

export interface UserEconomicsMetrics {
    total_users: number
    paying_users: number                // Users with lifetime_purchased > 0
    free_users: number                  // Users with lifetime_purchased = 0
    average_revenue_per_user: number    // total_revenue / total_users (ARPU)
    average_revenue_per_paying_user: number // total_revenue / paying_users (ARPPU)
    lifetime_value: number              // Average total spent per paying user
    conversion_rate_percent: number     // (paying_users / total_users) * 100
}

// ============================================================================
// Token/Credit Metrics
// ============================================================================

export interface TokenMetrics {
    tokens_sold: number                 // Sum of lifetime_purchased
    tokens_used: number                 // Sum of lifetime_used
    tokens_unused: number               // Sum of current balances (liability)
    usage_rate_percent: number          // (tokens_used / tokens_sold) * 100
}

// ============================================================================
// Model & Type Breakdowns
// ============================================================================

export interface ModelRevenueItem {
    model_id: string
    model_name: string
    generation_type: 'image' | 'video'
    generation_count: number
    revenue_cents: number               // credits_cost from generation_events
    cost_cents: number                  // Aggregated from model_pricing
    profit_cents: number
    margin_percent: number
}

export interface GenerationTypeBreakdown {
    image: {
        count: number
        revenue_cents: number
        cost_cents: number
    }
    video: {
        count: number
        revenue_cents: number
        cost_cents: number
    }
}

// ============================================================================
// Combined Response
// ============================================================================

export interface FinancialStatsResponse {
    period: TimePeriod
    dateRange: DateRange
    revenue: RevenueMetrics
    users: UserEconomicsMetrics
    tokens: TokenMetrics
    byModel: ModelRevenueItem[]
    byType: GenerationTypeBreakdown
    formatted: {
        total_revenue: string
        total_cost: string
        gross_profit: string
        avg_revenue_per_user: string
        tokens_unused: string
    }
}

// ============================================================================
// Export Types
// ============================================================================

export interface FinancialExportRow {
    date: string
    revenue_cents: number
    cost_cents: number
    profit_cents: number
    generations_count: number
    new_users: number
    paying_users: number
}
