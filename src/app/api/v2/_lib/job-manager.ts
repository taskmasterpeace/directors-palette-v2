import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiV2')

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type JobType = 'image' | 'video' | 'character' | 'recipe'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ApiJob {
  id: string
  user_id: string
  api_key_id: string
  type: JobType
  status: JobStatus
  prediction_id: string | null
  gallery_id: string | null
  batch_id: string | null
  cost: number
  input: Record<string, unknown> | null
  result: Record<string, unknown> | null
  error_message: string | null
  webhook_url: string | null
  created_at: string
  completed_at: string | null
}

/**
 * Create a new API job record
 */
export async function createJob(params: {
  userId: string
  apiKeyId: string
  type: JobType
  predictionId?: string
  galleryId?: string
  batchId?: string
  cost: number
  input?: Record<string, unknown>
  webhookUrl?: string
}): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('api_jobs')
    .insert({
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      type: params.type,
      status: 'pending' as const,
      prediction_id: params.predictionId || null,
      gallery_id: params.galleryId || null,
      batch_id: params.batchId || null,
      cost: params.cost,
      input: params.input || null,
      webhook_url: params.webhookUrl || null,
    })
    .select()
    .single()

  if (error) {
    log.error('Failed to create API job', { error: error.message })
    return null
  }

  return data as ApiJob
}

/**
 * Get a single job by ID (scoped to user)
 */
export async function getJob(jobId: string, userId: string): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('api_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as ApiJob
}

/**
 * List jobs for a user with optional filters
 */
export async function listJobs(params: {
  userId: string
  status?: string
  type?: string
  limit?: number
  offset?: number
}): Promise<{ jobs: ApiJob[]; total: number }> {
  const supabase = getSupabase()
  const limit = Math.min(params.limit || 20, 100)
  const offset = params.offset || 0

  let query = supabase
    .from('api_jobs')
    .select('*', { count: 'exact' })
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.type) query = query.eq('type', params.type)

  const { data, error, count } = await query

  if (error) {
    log.error('Failed to list API jobs', { error: error.message })
    return { jobs: [], total: 0 }
  }

  return { jobs: (data || []) as ApiJob[], total: count || 0 }
}

/**
 * Update job status by prediction_id (called from webhook handler)
 */
export async function updateJob(
  predictionId: string,
  updates: {
    status?: JobStatus
    result?: Record<string, unknown>
    errorMessage?: string
    completedAt?: string
  }
): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {}
  if (updates.status) updateData.status = updates.status
  if (updates.result) updateData.result = updates.result
  if (updates.errorMessage) updateData.error_message = updates.errorMessage
  if (updates.completedAt) updateData.completed_at = updates.completedAt

  const { data, error } = await supabase
    .from('api_jobs')
    .update(updateData)
    .eq('prediction_id', predictionId)
    .select()
    .single()

  if (error) {
    log.error('Failed to update API job', { error: error.message, predictionId })
    return null
  }

  return data as ApiJob
}

/**
 * Update job by job ID directly (for recipes that don't use Replicate predictions)
 */
export async function updateJobById(
  jobId: string,
  updates: {
    status?: JobStatus
    result?: Record<string, unknown>
    errorMessage?: string
    completedAt?: string
  }
): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const updateData: Record<string, unknown> = {}
  if (updates.status) updateData.status = updates.status
  if (updates.result) updateData.result = updates.result
  if (updates.errorMessage) updateData.error_message = updates.errorMessage
  if (updates.completedAt) updateData.completed_at = updates.completedAt

  const { data, error } = await supabase
    .from('api_jobs')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    log.error('Failed to update API job by ID', { error: error.message, jobId })
    return null
  }

  return data as ApiJob
}

/**
 * Get job by prediction ID (for webhook handler)
 */
export async function getJobByPredictionId(predictionId: string): Promise<ApiJob | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('api_jobs')
    .select('*')
    .eq('prediction_id', predictionId)
    .single()

  if (error) return null
  return data as ApiJob
}

/**
 * Fire webhook to caller's URL (best-effort, single attempt)
 */
export async function fireWebhook(webhookUrl: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, data: payload }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    log.error('Webhook delivery failed', {
      url: webhookUrl,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Format a job for API response
 */
export function formatJobResponse(job: ApiJob) {
  return {
    job_id: job.id,
    status: job.status,
    type: job.type,
    cost: job.cost,
    created_at: job.created_at,
    completed_at: job.completed_at,
    result: job.result,
    error_message: job.error_message,
  }
}
