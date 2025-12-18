/**
 * Financial Analytics Service
 * Calculates revenue, costs, and user economics metrics
 */

import { getAPIClient } from '@/lib/db/client'
import type {
    FinancialStatsResponse,
    RevenueMetrics,
    UserEconomicsMetrics,
    TokenMetrics,
    ModelRevenueItem,
    GenerationTypeBreakdown,
    DateRange,
    TimePeriod,
    FinancialExportRow
} from '../types/financials.types'

// Fallback costs if model not in pricing table
const FALLBACK_COSTS: Record<string, number> = {
    image: 15,
    video: 30
}

class FinancialsService {
    /**
     * Calculate date range from period
     */
    private getDateRange(period: TimePeriod, customRange?: DateRange): DateRange {
        const now = new Date()
        const to = now.toISOString()

        switch (period) {
            case 'today': {
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                return { from: todayStart.toISOString(), to }
            }
            case 'week': {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                return { from: weekAgo.toISOString(), to }
            }
            case 'month': {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                return { from: monthAgo.toISOString(), to }
            }
            case 'custom':
                return customRange || { from: '1970-01-01', to }
            case 'all_time':
            default:
                return { from: '1970-01-01', to }
        }
    }

    /**
     * Get revenue metrics for a date range
     */
    async getRevenueMetrics(dateRange: DateRange): Promise<RevenueMetrics> {
        const supabase = await getAPIClient()

        // Get total revenue from credit_transactions (purchase type)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: purchases } = await (supabase as any)
            .from('credit_transactions')
            .select('amount')
            .eq('type', 'purchase')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to)

        const totalRevenue = purchases?.reduce((sum: number, tx: { amount: number }) => sum + (tx.amount || 0), 0) || 0

        // Get all completed generations in date range
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: generations } = await (supabase as any)
            .from('generation_events')
            .select('model_id, credits_cost, generation_type')
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to)

        // Get model pricing for cost calculation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pricing } = await (supabase as any)
            .from('model_pricing')
            .select('model_id, cost_cents')

        const pricingMap = new Map<string, number>(pricing?.map((p: { model_id: string; cost_cents: number }) => [p.model_id, p.cost_cents]) || [])

        // Calculate total API cost
        let totalApiCost = 0
        const totalGenerations = generations?.length || 0

        for (const gen of (generations || [])) {
            const modelCost = pricingMap.get(gen.model_id)
                ?? FALLBACK_COSTS[gen.generation_type as string]
                ?? 15
            totalApiCost += modelCost
        }

        const grossProfit = totalRevenue - totalApiCost
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
        const avgCostPerGen = totalGenerations > 0 ? totalApiCost / totalGenerations : 0

        return {
            total_revenue_cents: totalRevenue,
            total_api_cost_cents: totalApiCost,
            gross_profit_cents: grossProfit,
            gross_margin_percent: Math.round(grossMargin * 100) / 100,
            average_cost_per_generation: Math.round(avgCostPerGen * 100) / 100,
            total_generations: totalGenerations
        }
    }

    /**
     * Get user economics metrics
     */
    async getUserEconomicsMetrics(): Promise<UserEconomicsMetrics> {
        const supabase = await getAPIClient()

        // Get all user credits
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: users } = await (supabase as any)
            .from('user_credits')
            .select('user_id, lifetime_purchased, lifetime_used, balance, created_at')

        if (!users || users.length === 0) {
            return {
                total_users: 0,
                paying_users: 0,
                free_users: 0,
                average_revenue_per_user: 0,
                average_revenue_per_paying_user: 0,
                lifetime_value: 0,
                conversion_rate_percent: 0
            }
        }

        const totalUsers = users.length
        const payingUsers = users.filter((u: { lifetime_purchased: number }) => u.lifetime_purchased > 0)
        const payingCount = payingUsers.length
        const freeCount = totalUsers - payingCount

        const totalRevenue = users.reduce((sum: number, u: { lifetime_purchased: number }) => sum + (u.lifetime_purchased || 0), 0)

        const arpu = totalRevenue / totalUsers
        const arppu = payingCount > 0 ? totalRevenue / payingCount : 0
        const ltv = payingCount > 0
            ? payingUsers.reduce((sum: number, u: { lifetime_purchased: number }) => sum + u.lifetime_purchased, 0) / payingCount
            : 0
        const conversionRate = (payingCount / totalUsers) * 100

        return {
            total_users: totalUsers,
            paying_users: payingCount,
            free_users: freeCount,
            average_revenue_per_user: Math.round(arpu),
            average_revenue_per_paying_user: Math.round(arppu),
            lifetime_value: Math.round(ltv),
            conversion_rate_percent: Math.round(conversionRate * 100) / 100
        }
    }

    /**
     * Get token/credit metrics
     */
    async getTokenMetrics(): Promise<TokenMetrics> {
        const supabase = await getAPIClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: users } = await (supabase as any)
            .from('user_credits')
            .select('lifetime_purchased, lifetime_used, balance')

        if (!users || users.length === 0) {
            return {
                tokens_sold: 0,
                tokens_used: 0,
                tokens_unused: 0,
                usage_rate_percent: 0
            }
        }

        const tokensSold = users.reduce((sum: number, u: { lifetime_purchased: number }) => sum + (u.lifetime_purchased || 0), 0)
        const tokensUsed = users.reduce((sum: number, u: { lifetime_used: number }) => sum + (u.lifetime_used || 0), 0)
        const tokensUnused = users.reduce((sum: number, u: { balance: number }) => sum + (u.balance || 0), 0)
        const usageRate = tokensSold > 0 ? (tokensUsed / tokensSold) * 100 : 0

        return {
            tokens_sold: tokensSold,
            tokens_used: tokensUsed,
            tokens_unused: tokensUnused,
            usage_rate_percent: Math.round(usageRate * 100) / 100
        }
    }

    /**
     * Get revenue breakdown by model
     */
    async getModelBreakdown(dateRange: DateRange): Promise<ModelRevenueItem[]> {
        const supabase = await getAPIClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: generations } = await (supabase as any)
            .from('generation_events')
            .select('model_id, model_name, generation_type, credits_cost')
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pricing } = await (supabase as any)
            .from('model_pricing')
            .select('model_id, cost_cents')

        const pricingMap = new Map<string, number>(pricing?.map((p: { model_id: string; cost_cents: number }) => [p.model_id, p.cost_cents]) || [])

        // Aggregate by model
        const modelMap = new Map<string, {
            model_name: string
            generation_type: 'image' | 'video'
            count: number
            revenue: number
            cost: number
        }>()

        for (const gen of (generations || [])) {
            const existing = modelMap.get(gen.model_id) || {
                model_name: gen.model_name || gen.model_id,
                generation_type: (gen.generation_type || 'image') as 'image' | 'video',
                count: 0,
                revenue: 0,
                cost: 0
            }

            const modelCost = pricingMap.get(gen.model_id)
                ?? FALLBACK_COSTS[gen.generation_type as string]
                ?? 15

            existing.count++
            existing.revenue += gen.credits_cost || 0
            existing.cost += modelCost
            modelMap.set(gen.model_id, existing)
        }

        return Array.from(modelMap.entries())
            .map(([model_id, stats]) => ({
                model_id,
                model_name: stats.model_name,
                generation_type: stats.generation_type,
                generation_count: stats.count,
                revenue_cents: stats.revenue,
                cost_cents: stats.cost,
                profit_cents: stats.revenue - stats.cost,
                margin_percent: stats.revenue > 0
                    ? Math.round(((stats.revenue - stats.cost) / stats.revenue) * 10000) / 100
                    : 0
            }))
            .sort((a, b) => b.revenue_cents - a.revenue_cents)
    }

    /**
     * Get breakdown by generation type
     */
    async getTypeBreakdown(dateRange: DateRange): Promise<GenerationTypeBreakdown> {
        const supabase = await getAPIClient()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: generations } = await (supabase as any)
            .from('generation_events')
            .select('model_id, generation_type, credits_cost')
            .eq('status', 'completed')
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pricing } = await (supabase as any)
            .from('model_pricing')
            .select('model_id, cost_cents')

        const pricingMap = new Map<string, number>(pricing?.map((p: { model_id: string; cost_cents: number }) => [p.model_id, p.cost_cents]) || [])

        const result: GenerationTypeBreakdown = {
            image: { count: 0, revenue_cents: 0, cost_cents: 0 },
            video: { count: 0, revenue_cents: 0, cost_cents: 0 }
        }

        for (const gen of (generations || [])) {
            const type = (gen.generation_type || 'image') as 'image' | 'video'
            const modelCost = pricingMap.get(gen.model_id) ?? FALLBACK_COSTS[type] ?? 15

            if (result[type]) {
                result[type].count++
                result[type].revenue_cents += gen.credits_cost || 0
                result[type].cost_cents += modelCost
            }
        }

        return result
    }

    /**
     * Get all financial stats combined
     */
    async getFinancialStats(
        period: TimePeriod = 'all_time',
        customRange?: DateRange
    ): Promise<FinancialStatsResponse> {
        const dateRange = this.getDateRange(period, customRange)

        const [revenue, users, tokens, byModel, byType] = await Promise.all([
            this.getRevenueMetrics(dateRange),
            this.getUserEconomicsMetrics(),
            this.getTokenMetrics(),
            this.getModelBreakdown(dateRange),
            this.getTypeBreakdown(dateRange)
        ])

        return {
            period,
            dateRange,
            revenue,
            users,
            tokens,
            byModel,
            byType,
            formatted: {
                total_revenue: `$${(revenue.total_revenue_cents / 100).toFixed(2)}`,
                total_cost: `$${(revenue.total_api_cost_cents / 100).toFixed(2)}`,
                gross_profit: `$${(revenue.gross_profit_cents / 100).toFixed(2)}`,
                avg_revenue_per_user: `$${(users.average_revenue_per_user / 100).toFixed(2)}`,
                tokens_unused: `$${(tokens.tokens_unused / 100).toFixed(2)}`
            }
        }
    }

    /**
     * Export financial data for accounting (CSV format)
     */
    async exportFinancialData(dateRange: DateRange): Promise<FinancialExportRow[]> {
        const stats = await this.getFinancialStats('custom', dateRange)

        return [{
            date: dateRange.from.split('T')[0],
            revenue_cents: stats.revenue.total_revenue_cents,
            cost_cents: stats.revenue.total_api_cost_cents,
            profit_cents: stats.revenue.gross_profit_cents,
            generations_count: stats.revenue.total_generations,
            new_users: stats.users.total_users,
            paying_users: stats.users.paying_users
        }]
    }
}

export const financialsService = new FinancialsService()
