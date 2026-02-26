/**
 * Generation Events Service
 * Handles logging and querying generation events for admin analytics
 */

import { getAPIClient } from '@/lib/db/client'
import type { Json } from '../../../../supabase/database.types'
import type {
    GenerationEvent,
    GenerationEventInput,
    GenerationEventUpdate,
    GenerationEventsListResponse,
    GenerationStatsResponse,
    LeaderboardEntry,
    LogNogEvent,
    GenerationEventsFilters
} from '../types/generation-events.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('Admin')
class GenerationEventsService {
    /**
     * Log a new generation event
     * Called when a generation is initiated
     */
    async logGeneration(input: GenerationEventInput): Promise<{ id: string } | null> {
        try {
            const supabase = await getAPIClient()

            const { data, error } = await supabase
                .from('generation_events')
                .insert({
                    user_id: input.user_id,
                    user_email: input.user_email,
                    gallery_id: input.gallery_id,
                    prediction_id: input.prediction_id,
                    generation_type: input.generation_type,
                    model_id: input.model_id,
                    model_name: input.model_name,
                    status: 'pending',
                    credits_cost: input.credits_cost || 0,
                    is_admin_generation: input.is_admin_generation || false,
                    prompt: input.prompt,
                    settings: input.settings as Json | undefined
                })
                .select('id')
                .single()

            if (error) {
                log.error('[GenerationEvents] Failed to log generation', { error: error })
                return null
            }

            return data
        } catch (error) {
            log.error('[GenerationEvents] Error logging generation', { error: error instanceof Error ? error.message : String(error) })
            return null
        }
    }

    /**
     * Update generation event status (e.g., on completion or failure)
     * Called by webhook handler
     */
    async updateStatus(
        predictionId: string,
        update: GenerationEventUpdate
    ): Promise<boolean> {
        try {
            const supabase = await getAPIClient()

            const updateData: {
                status: string
                completed_at?: string
                error_message?: string
            } = {
                status: update.status
            }

            if (update.completed_at) {
                updateData.completed_at = update.completed_at
            }

            if (update.error_message) {
                updateData.error_message = update.error_message
            }

            const { error } = await supabase
                .from('generation_events')
                .update(updateData)
                .eq('prediction_id', predictionId)

            if (error) {
                log.error('[GenerationEvents] Failed to update status', { error: error })
                return false
            }

            return true
        } catch (error) {
            log.error('[GenerationEvents] Error updating status', { error: error instanceof Error ? error.message : String(error) })
            return false
        }
    }

    /**
     * Get all generation events with optional filters
     * Admin only
     */
    async getAll(
        filters: GenerationEventsFilters = {},
        page: number = 1,
        pageSize: number = 50
    ): Promise<GenerationEventsListResponse> {
        try {
            const supabase = await getAPIClient()

            let query = supabase
                .from('generation_events')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })

            // Apply filters
            if (filters.user_id) {
                query = query.eq('user_id', filters.user_id)
            }
            if (filters.user_email) {
                query = query.ilike('user_email', `%${filters.user_email}%`)
            }
            if (filters.model_id) {
                query = query.eq('model_id', filters.model_id)
            }
            if (filters.status) {
                query = query.eq('status', filters.status)
            }
            if (filters.from_date) {
                query = query.gte('created_at', filters.from_date)
            }
            if (filters.to_date) {
                query = query.lte('created_at', filters.to_date)
            }

            // Pagination
            const offset = (page - 1) * pageSize
            query = query.range(offset, offset + pageSize - 1)

            const { data, count, error } = await query

            if (error) {
                log.error('[GenerationEvents] Failed to get events', { error: error })
                return {
                    generations: [],
                    total: 0,
                    page,
                    pageSize,
                    hasMore: false
                }
            }

            const total = count || 0

            return {
                generations: (data || []) as GenerationEvent[],
                total,
                page,
                pageSize,
                hasMore: offset + pageSize < total
            }
        } catch (error) {
            log.error('[GenerationEvents] Error getting events', { error: error instanceof Error ? error.message : String(error) })
            return {
                generations: [],
                total: 0,
                page,
                pageSize,
                hasMore: false
            }
        }
    }

    /**
     * Get generation statistics
     */
    async getStats(fromDate?: string, toDate?: string): Promise<GenerationStatsResponse> {
        try {
            const supabase = await getAPIClient()

            // Get all events for the date range to calculate stats
            let allEventsQuery = supabase
                .from('generation_events')
                .select('model_id, model_name, status, user_id, user_email, credits_cost, created_at')

            if (fromDate) allEventsQuery = allEventsQuery.gte('created_at', fromDate)
            if (toDate) allEventsQuery = allEventsQuery.lte('created_at', toDate)

            const { data: allEvents } = await allEventsQuery

            if (!allEvents || allEvents.length === 0) {
                return {
                    total: 0,
                    today: 0,
                    thisWeek: 0,
                    totalCreditsUsed: 0,
                    uniqueUsers: 0,
                    byModel: [],
                    byStatus: [],
                    topUsers: []
                }
            }

            // Calculate date boundaries
            const now = new Date()
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

            // Calculate basic stats
            let total = 0
            let today = 0
            let thisWeek = 0
            let totalCreditsUsed = 0
            const uniqueUsersSet = new Set<string>()

            // Aggregate model, status, user stats
            const modelMap = new Map<string, { model_name: string | null; count: number; credits_total: number }>()
            const statusMap = new Map<string, number>()
            const userMap = new Map<string, { user_email: string | null; count: number; credits_used: number }>()

            for (const row of allEvents) {
                total++
                totalCreditsUsed += row.credits_cost || 0
                uniqueUsersSet.add(row.user_id)

                // Check if today
                if (row.created_at >= todayStart) {
                    today++
                }

                // Check if this week
                if (row.created_at >= weekAgo) {
                    thisWeek++
                }

                // Model stats
                const modelStats = modelMap.get(row.model_id) || { model_name: row.model_name, count: 0, credits_total: 0 }
                modelStats.count++
                modelStats.credits_total += row.credits_cost || 0
                modelMap.set(row.model_id, modelStats)

                // Status stats
                statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1)

                // User stats
                const userStats = userMap.get(row.user_id) || { user_email: row.user_email, count: 0, credits_used: 0 }
                userStats.count++
                userStats.credits_used += row.credits_cost || 0
                userMap.set(row.user_id, userStats)
            }

            const byModel = Array.from(modelMap.entries()).map(([model_id, stats]) => ({
                model_id,
                model_name: stats.model_name,
                count: stats.count,
                credits_total: stats.credits_total
            })).sort((a, b) => b.count - a.count)

            const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
                status,
                count
            }))

            const topUsers = Array.from(userMap.entries())
                .map(([user_id, stats]) => ({
                    user_id,
                    user_email: stats.user_email,
                    count: stats.count,
                    credits_used: stats.credits_used
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)

            return {
                total,
                today,
                thisWeek,
                totalCreditsUsed,
                uniqueUsers: uniqueUsersSet.size,
                byModel,
                byStatus,
                topUsers
            }
        } catch (error) {
            log.error('[GenerationEvents] Error getting stats', { error: error instanceof Error ? error.message : String(error) })
            return {
                total: 0,
                today: 0,
                thisWeek: 0,
                totalCreditsUsed: 0,
                uniqueUsers: 0,
                byModel: [],
                byStatus: [],
                topUsers: []
            }
        }
    }

    /**
     * Get leaderboard (top users by generation count)
     */
    async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
        try {
            const supabase = await getAPIClient()

            const { data } = await supabase
                .from('generation_events')
                .select('user_id, user_email, credits_cost, created_at')
                .order('created_at', { ascending: false })

            if (!data) return []

            // Aggregate by user
            const userMap = new Map<string, {
                user_email: string | null
                generation_count: number
                credits_used: number
                last_generation_at: string | null
            }>()

            for (const row of data) {
                const existing = userMap.get(row.user_id) || {
                    user_email: row.user_email,
                    generation_count: 0,
                    credits_used: 0,
                    last_generation_at: null
                }
                existing.generation_count++
                existing.credits_used += row.credits_cost || 0
                if (!existing.last_generation_at || row.created_at > existing.last_generation_at) {
                    existing.last_generation_at = row.created_at
                }
                userMap.set(row.user_id, existing)
            }

            return Array.from(userMap.entries())
                .map(([user_id, stats]) => ({
                    user_id,
                    ...stats
                }))
                .sort((a, b) => b.generation_count - a.generation_count)
                .slice(0, limit)
        } catch (error) {
            log.error('[GenerationEvents] Error getting leaderboard', { error: error instanceof Error ? error.message : String(error) })
            return []
        }
    }

    /**
     * Export events in LogNog format
     */
    async exportForLogNog(fromDate: string, toDate: string): Promise<LogNogEvent[]> {
        try {
            const supabase = await getAPIClient()

            const { data, error } = await supabase
                .from('generation_events')
                .select('*')
                .gte('created_at', fromDate)
                .lte('created_at', toDate)
                .order('created_at', { ascending: true })

            if (error || !data) {
                log.error('[GenerationEvents] Failed to export', { error: error })
                return []
            }

            return data.map((row) => ({
                timestamp: row.created_at,
                event_type: 'generation' as const,
                app: 'directors-palette' as const,
                user_id: row.user_id,
                user_email: row.user_email,
                model_id: row.model_id,
                model_name: row.model_name,
                generation_type: row.generation_type as 'image' | 'video',
                cost_cents: row.credits_cost,
                is_admin: row.is_admin_generation,
                status: row.status,
                prediction_id: row.prediction_id,
                prompt_preview: row.prompt?.slice(0, 100) || null
            }))
        } catch (error) {
            log.error('[GenerationEvents] Error exporting', { error: error instanceof Error ? error.message : String(error) })
            return []
        }
    }
}

export const generationEventsService = new GenerationEventsService()
