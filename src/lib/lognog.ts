/**
 * LogNog Logging Service
 * Sends structured logs to LogNog analytics platform
 *
 * Uses flat format with message string and rich context fields
 * for powerful querying in LogNog's Splunk-like DSL
 */

const LOGNOG_ENDPOINT = 'https://analytics.machinekinglabs.com/ingest/nextjs'
const LOGNOG_API_KEY = process.env.LOGNOG_API_KEY

/**
 * Send event to LogNog with flat fields + message string
 */
function sendEvent(type: string, message: string, fields: Record<string, unknown>): void {
  if (!LOGNOG_API_KEY) {
    return
  }

  const event = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    type,
    message,
    ...fields,
  }

  fetch(LOGNOG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': LOGNOG_API_KEY,
    },
    body: JSON.stringify([event]),
  }).catch(() => {
    // Silent fail - don't break the app for logging
  })
}

export const lognog = {
  /**
   * Log API route performance with full context
   * Message: "POST /api/generation/image 200 (1523ms)"
   *
   * Query examples:
   *   search index=nextjs type=api status_code>=400
   *   search index=nextjs route="/api/generation/image" | stats avg(duration_ms)
   */
  api(data: {
    route: string
    method: string
    status_code: number
    duration_ms: number
    // User context
    user_id?: string
    user_email?: string
    // Integration details (if API uses external service)
    integration?: 'replicate' | 'openrouter' | 'elevenlabs' | 'stripe' | 'supabase'
    integration_latency_ms?: number
    model?: string
    // Request tracking
    request_id?: string
    // Business context
    credits_used?: number
    // Error details
    error?: string
    error_code?: string
  }): void {
    const message = `${data.method} ${data.route} ${data.status_code} (${data.duration_ms}ms)`
    sendEvent('api', message, data)
  },

  /**
   * Log external integration calls (Replicate, OpenRouter, ElevenLabs, Stripe)
   * Message: "replicate OK 3500ms flux-schnell"
   *
   * Query examples:
   *   search index=nextjs type=integration success=false
   *   search index=nextjs integration=replicate | stats avg(latency_ms) by model
   */
  integration(data: {
    integration: 'replicate' | 'openrouter' | 'elevenlabs' | 'stripe' | 'supabase'
    success: boolean
    latency_ms: number
    // HTTP status from integration
    http_status?: number
    // Model/service specifics
    model?: string
    prompt_length?: number
    prompt_preview?: string // First 100 chars for debugging
    // Replicate specific
    prediction_id?: string
    output_url?: string
    // Cost tracking
    estimated_cost?: number
    // User context
    user_id?: string
    user_email?: string
    // Error details
    error?: string
    error_code?: string
  }): void {
    const status = data.success ? 'OK' : 'FAIL'
    const modelInfo = data.model ? ` ${data.model}` : ''
    const message = `${data.integration} ${status} ${data.latency_ms}ms${modelInfo}`
    sendEvent('integration', message, data)
  },

  /**
   * Log errors with full context for debugging
   * Message: The error message itself
   *
   * Query examples:
   *   search index=nextjs type=error | stats count by route
   *   search index=nextjs type=error user_email="john@example.com"
   */
  error(data: {
    message: string
    // Error details
    stack?: string
    error_code?: string
    // Location
    route?: string
    component?: string
    // User context
    user_id?: string
    user_email?: string
    // Request tracking
    request_id?: string
    // Additional context
    model?: string
    retry_count?: number
    context?: Record<string, unknown>
  }): void {
    sendEvent('error', data.message, {
      error_message: data.message,
      stack: data.stack,
      error_code: data.error_code,
      route: data.route,
      component: data.component,
      user_id: data.user_id,
      user_email: data.user_email,
      request_id: data.request_id,
      model: data.model,
      retry_count: data.retry_count,
      ...data.context,
    })
  },

  /**
   * Log business events with full context for analytics
   * Message: The event name (e.g., "credit_deduction")
   *
   * Query examples:
   *   search index=nextjs type=business event=credit_deduction | stats sum(credits_deducted) by user_email
   *   search index=nextjs event=generation_completed | stats count by model
   */
  business(data: {
    event: 'credit_deduction' | 'generation_completed' | 'generation_failed' |
           'payment_completed' | 'webhook_received' | 'user_signup' |
           'recipe_executed' | 'story_generated' | 'storybook_project_created' |
           'storybook_project_updated' | 'prompt_expanded' | string
    // User context (strongly recommended)
    user_id?: string
    user_email?: string
    // Credit tracking
    credits_deducted?: number
    credits_before?: number
    credits_after?: number
    // Generation context
    reason?: string
    model?: string
    generation_id?: string
    prediction_id?: string
    // Payment context
    amount_cents?: number
    stripe_session_id?: string
    // Recipe context
    recipe_id?: string
    recipe_name?: string
    stage_count?: number
    prompt_preview?: string // First 100 chars
    prompt_length?: number
    // Storybook context
    project_id?: string
    title?: string
    category?: string
    topic?: string
    character_name?: string
    character_age?: number
    page_count?: number
    sentences_per_page?: number
    generated_title?: string
    // Prompt expander context
    detail_level?: string
    director_style?: string
    original_prompt_length?: number
    expanded_prompt_length?: number
    // Additional metadata
    metadata?: Record<string, unknown>
  }): void {
    sendEvent('business', data.event, {
      event: data.event,
      user_id: data.user_id,
      user_email: data.user_email,
      credits_deducted: data.credits_deducted,
      credits_before: data.credits_before,
      credits_after: data.credits_after,
      reason: data.reason,
      model: data.model,
      generation_id: data.generation_id,
      prediction_id: data.prediction_id,
      amount_cents: data.amount_cents,
      stripe_session_id: data.stripe_session_id,
      // Recipe fields
      recipe_id: data.recipe_id,
      recipe_name: data.recipe_name,
      stage_count: data.stage_count,
      prompt_preview: data.prompt_preview,
      prompt_length: data.prompt_length,
      // Storybook fields
      project_id: data.project_id,
      title: data.title,
      category: data.category,
      topic: data.topic,
      character_name: data.character_name,
      character_age: data.character_age,
      page_count: data.page_count,
      sentences_per_page: data.sentences_per_page,
      generated_title: data.generated_title,
      // Prompt expander fields
      detail_level: data.detail_level,
      director_style: data.director_style,
      original_prompt_length: data.original_prompt_length,
      expanded_prompt_length: data.expanded_prompt_length,
      ...data.metadata,
    })
  },

  /**
   * Log user actions (for client-side tracking if needed)
   * Message: "button_click GenerateButton"
   */
  action(data: {
    name: string
    component: string
    page?: string
    user_id?: string
    user_email?: string
    metadata?: Record<string, unknown>
  }): void {
    const message = `${data.name} ${data.component}`
    sendEvent('action', message, {
      action: data.name,
      component: data.component,
      page: data.page,
      user_id: data.user_id,
      user_email: data.user_email,
      ...data.metadata,
    })
  },
}
