/**
 * Generation Events Types
 * Defines types for tracking and displaying generation analytics
 */

export interface GenerationEvent {
    id: string
    user_id: string
    user_email: string | null
    gallery_id: string | null
    prediction_id: string | null
    generation_type: 'image' | 'video'
    model_id: string
    model_name: string | null
    status: 'pending' | 'completed' | 'failed'
    credits_cost: number
    is_admin_generation: boolean
    prompt: string | null
    settings: Record<string, unknown> | null
    error_message: string | null
    created_at: string
    completed_at: string | null
}

export interface GenerationEventInput {
    user_id: string
    user_email?: string
    gallery_id?: string
    prediction_id?: string
    generation_type: 'image' | 'video'
    model_id: string
    model_name?: string
    credits_cost?: number
    is_admin_generation?: boolean
    prompt?: string
    settings?: Record<string, unknown>
}

export interface GenerationEventUpdate {
    status: 'pending' | 'completed' | 'failed'
    completed_at?: string
    error_message?: string
}

export interface GenerationEventsListResponse {
    generations: GenerationEvent[]
    total: number
    page: number
    pageSize: number
    hasMore: boolean
}

export interface GenerationStatsResponse {
    total: number
    today: number
    thisWeek: number
    totalCreditsUsed: number
    uniqueUsers: number
    byModel: ModelStats[]
    byStatus: StatusStats[]
    topUsers: TopUserStats[]
}

export interface ModelStats {
    model_id: string
    model_name: string | null
    count: number
    credits_total: number
}

export interface StatusStats {
    status: string
    count: number
}

export interface TopUserStats {
    user_id: string
    user_email: string | null
    count: number
    credits_used: number
}

export interface LeaderboardEntry {
    user_id: string
    user_email: string | null
    generation_count: number
    credits_used: number
    last_generation_at: string | null
}

export interface GenerationEventsFilters {
    user_id?: string
    user_email?: string
    model_id?: string
    status?: string
    from_date?: string
    to_date?: string
}

/**
 * LogNog export format
 * Follows LogNog's expected JSON structure for batch imports
 */
export interface LogNogEvent {
    timestamp: string              // ISO 8601 format required
    event_type: 'generation'
    app: 'directors-palette'
    user_id: string
    user_email: string | null
    model_id: string
    model_name: string | null
    generation_type: 'image' | 'video'
    cost_cents: number
    is_admin: boolean
    status: string
    prediction_id: string | null
    prompt_preview: string | null  // First 100 chars
}
