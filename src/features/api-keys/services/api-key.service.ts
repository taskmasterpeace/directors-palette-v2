/**
 * API Key Service
 * Manages API key creation, validation, and usage tracking
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import {
  ApiKey,
  ApiKeyRow,
  ApiKeyWithRawKey,
  ApiScope,
  ApiUsage,
  ApiUsageRow,
  ApiUsageStats,
  ValidatedApiKey,
  rowToApiKey,
  rowToApiUsage,
} from '../types/api-key.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('ApiKeys')
class ApiKeyService {
  private getServiceClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex')
  }

  /**
   * Generate a new API key
   * Returns the raw key (only shown once) and the stored key info
   */
  async generateApiKey(
    userId: string,
    name: string = 'API Key',
    scopes: ApiScope[] = ['images:generate', 'recipes:execute']
  ): Promise<ApiKeyWithRawKey | null> {
    const supabase = this.getServiceClient()

    // Generate random key: dp_ + 32 hex chars
    const randomBytes = crypto.randomBytes(16)
    const rawKey = 'dp_' + randomBytes.toString('hex')
    const keyHash = this.hashKey(rawKey)
    const keyPrefix = rawKey.substring(0, 11) // dp_xxxxxxxx

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name,
        scopes,
      })
      .select()
      .single()

    if (error) {
      log.error('Error generating API key', { error: error })
      return null
    }

    const apiKey = rowToApiKey(data as ApiKeyRow)
    return {
      ...apiKey,
      rawKey, // Only returned once!
    }
  }

  /**
   * Validate an API key from request header
   * Returns the validated key info or null if invalid
   */
  async validateApiKey(rawKey: string): Promise<ValidatedApiKey | null> {
    if (!rawKey || !rawKey.startsWith('dp_')) {
      return null
    }

    const supabase = this.getServiceClient()
    const keyHash = this.hashKey(rawKey)

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    const row = data as ApiKeyRow

    // Check expiration
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return null
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', row.id)

    return {
      apiKey: rowToApiKey(row),
      userId: row.user_id,
      scopes: row.scopes as ApiScope[],
    }
  }

  /**
   * Extract API key from Authorization header
   * Supports: "Bearer dp_xxx" or just "dp_xxx"
   */
  extractKeyFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    if (authHeader.startsWith('dp_')) {
      return authHeader
    }

    return null
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const supabase = this.getServiceClient()

    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('Error fetching API keys', { error: error })
      return []
    }

    return (data as ApiKeyRow[]).map(rowToApiKey)
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    const supabase = this.getServiceClient()

    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .eq('user_id', userId)

    if (error) {
      log.error('Error revoking API key', { error: error })
      return false
    }

    return true
  }

  /**
   * Regenerate an API key (creates new key, deactivates old)
   */
  async regenerateApiKey(
    keyId: string,
    userId: string
  ): Promise<ApiKeyWithRawKey | null> {
    const supabase = this.getServiceClient()

    // Get existing key info
    const { data: existing } = await supabase
      .from('api_keys')
      .select('name, scopes')
      .eq('id', keyId)
      .eq('user_id', userId)
      .single()

    if (!existing) {
      return null
    }

    // Deactivate old key
    await this.revokeApiKey(keyId, userId)

    // Generate new key with same name and scopes
    return this.generateApiKey(
      userId,
      existing.name,
      existing.scopes as ApiScope[]
    )
  }

  /**
   * Log API usage
   */
  async logUsage(params: {
    apiKeyId: string
    userId: string
    endpoint: string
    method: string
    statusCode: number
    creditsUsed?: number
    requestMetadata?: Record<string, unknown>
    responseTimeMs?: number
    ipAddress?: string
    userAgent?: string
  }): Promise<void> {
    const supabase = this.getServiceClient()

    await supabase.from('api_usage').insert({
      api_key_id: params.apiKeyId,
      user_id: params.userId,
      endpoint: params.endpoint,
      method: params.method,
      status_code: params.statusCode,
      credits_used: params.creditsUsed || 0,
      request_metadata: params.requestMetadata || null,
      response_time_ms: params.responseTimeMs || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })
  }

  /**
   * Get API usage for a user
   */
  async getUserUsage(
    userId: string,
    limit: number = 100
  ): Promise<ApiUsage[]> {
    const supabase = this.getServiceClient()

    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      log.error('Error fetching API usage', { error: error })
      return []
    }

    return (data as ApiUsageRow[]).map(rowToApiUsage)
  }

  /**
   * Get API usage stats for admin dashboard
   */
  async getUsageStats(days: number = 30): Promise<ApiUsageStats> {
    const supabase = this.getServiceClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error || !data) {
      return {
        totalRequests: 0,
        totalCreditsUsed: 0,
        requestsByEndpoint: {},
        requestsByDay: [],
        averageResponseTime: 0,
      }
    }

    const rows = data as ApiUsageRow[]

    // Calculate stats
    const requestsByEndpoint: Record<string, number> = {}
    const requestsByDayMap: Record<string, { count: number; credits: number }> = {}
    let totalResponseTime = 0
    let responseTimeCount = 0

    for (const row of rows) {
      // By endpoint
      requestsByEndpoint[row.endpoint] = (requestsByEndpoint[row.endpoint] || 0) + 1

      // By day
      const day = row.created_at.split('T')[0]
      if (!requestsByDayMap[day]) {
        requestsByDayMap[day] = { count: 0, credits: 0 }
      }
      requestsByDayMap[day].count++
      requestsByDayMap[day].credits += row.credits_used

      // Response time
      if (row.response_time_ms) {
        totalResponseTime += row.response_time_ms
        responseTimeCount++
      }
    }

    const requestsByDay = Object.entries(requestsByDayMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalRequests: rows.length,
      totalCreditsUsed: rows.reduce((sum, r) => sum + r.credits_used, 0),
      requestsByEndpoint,
      requestsByDay,
      averageResponseTime: responseTimeCount > 0
        ? Math.round(totalResponseTime / responseTimeCount)
        : 0,
    }
  }

  /**
   * Get all API keys (admin only)
   */
  async getAllApiKeys(): Promise<(ApiKey & { userEmail?: string })[]> {
    const supabase = this.getServiceClient()

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !keys) {
      return []
    }

    // Get user emails
    const _userIds = [...new Set(keys.map(k => k.user_id))]
    const { data: users } = await supabase.auth.admin.listUsers()
    const userMap = new Map(
      users?.users?.map(u => [u.id, u.email]) || []
    )

    return (keys as ApiKeyRow[]).map(row => ({
      ...rowToApiKey(row),
      userEmail: userMap.get(row.user_id),
    }))
  }
}

export const apiKeyService = new ApiKeyService()
