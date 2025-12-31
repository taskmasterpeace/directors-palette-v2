/**
 * LogNog Logging Service
 * Sends structured logs to LogNog analytics platform
 *
 * Note: Sends immediately (no batching) for serverless compatibility
 */

const LOGNOG_ENDPOINT = 'https://analytics.machinekinglabs.com/ingest/nextjs'
const LOGNOG_API_KEY = process.env.LOGNOG_API_KEY

type LogEvent = {
  timestamp: number
  type: 'api' | 'integration' | 'error' | 'business'
  // API event fields
  api?: {
    route: string
    method: string
    status_code: number
    duration_ms: number
    user_id?: string
    error?: string
  }
  // Integration event fields (Replicate, OpenRouter, ElevenLabs, Stripe)
  integration?: {
    integration_name: string
    integration_latency_ms: number
    http_status?: number
    success: boolean
    error?: string
    metadata?: Record<string, unknown>
  }
  // Error event fields
  error?: {
    message: string
    stack?: string
    context?: Record<string, unknown>
    user_id?: string
  }
  // Business event fields
  business?: {
    event: string
    user_id?: string
    metadata?: Record<string, unknown>
  }
}

/**
 * Send event to LogNog immediately (fire-and-forget for serverless)
 */
function sendEvent(event: LogEvent): void {
  if (!LOGNOG_API_KEY) {
    console.warn('[LogNog] API key not configured, skipping')
    return
  }

  // Fire and forget - don't await to avoid blocking the response
  fetch(LOGNOG_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': LOGNOG_API_KEY,
    },
    body: JSON.stringify([event]),
  }).catch((error) => {
    console.error('[LogNog] Failed to send event:', error)
  })
}

export const lognog = {
  /**
   * Log API route performance
   */
  api(data: {
    route: string
    method: string
    status_code: number
    duration_ms: number
    user_id?: string
    error?: string
  }): void {
    sendEvent({
      timestamp: Date.now(),
      type: 'api',
      api: data,
    })
  },

  /**
   * Log external integration calls (Replicate, OpenRouter, ElevenLabs, Stripe)
   */
  integration(data: {
    name: string
    latency_ms: number
    status?: number
    success: boolean
    error?: string
    metadata?: Record<string, unknown>
  }): void {
    sendEvent({
      timestamp: Date.now(),
      type: 'integration',
      integration: {
        integration_name: data.name,
        integration_latency_ms: data.latency_ms,
        http_status: data.status,
        success: data.success,
        error: data.error,
        metadata: data.metadata,
      },
    })
  },

  /**
   * Log errors with context
   */
  error(data: {
    message: string
    stack?: string
    context?: Record<string, unknown>
    user_id?: string
  }): void {
    sendEvent({
      timestamp: Date.now(),
      type: 'error',
      error: data,
    })
  },

  /**
   * Log business events (generation completed, payment, credits)
   */
  business(data: {
    event: string
    user_id?: string
    metadata?: Record<string, unknown>
  }): void {
    sendEvent({
      timestamp: Date.now(),
      type: 'business',
      business: data,
    })
  },
}
