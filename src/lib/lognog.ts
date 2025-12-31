/**
 * LogNog Logging Service
 * Sends structured logs to LogNog analytics platform
 *
 * Uses flat format with message string (LogNog requirement)
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
   * Log API route performance
   * Message: "POST /api/generation/image 200 (1523ms) [replicate]"
   */
  api(data: {
    route: string
    method: string
    status_code: number
    duration_ms: number
    user_id?: string
    error?: string
  }): void {
    const message = `${data.method} ${data.route} ${data.status_code} (${data.duration_ms}ms)`
    sendEvent('api', message, data)
  },

  /**
   * Log external integration calls (Replicate, OpenRouter, ElevenLabs, Stripe)
   * Message: "replicate OK 3500ms" or "replicate FAIL 1200ms"
   */
  integration(data: {
    name: string
    latency_ms: number
    status?: number
    success: boolean
    error?: string
    metadata?: Record<string, unknown>
  }): void {
    const status = data.success ? 'OK' : 'FAIL'
    const message = `${data.name} ${status} ${data.latency_ms}ms`
    sendEvent('integration', message, {
      integration: data.name,
      latency_ms: data.latency_ms,
      success: data.success,
      http_status: data.status,
      error: data.error,
      ...data.metadata,
    })
  },

  /**
   * Log errors with context
   * Message: The error message itself
   */
  error(data: {
    message: string
    stack?: string
    context?: Record<string, unknown>
    user_id?: string
  }): void {
    sendEvent('error', data.message, {
      user_id: data.user_id,
      ...data.context,
    })
  },

  /**
   * Log business events (generation completed, payment, credits)
   * Message: The event name itself (e.g., "generation_completed")
   */
  business(data: {
    event: string
    user_id?: string
    metadata?: Record<string, unknown>
  }): void {
    sendEvent('business', data.event, {
      event: data.event,
      user_id: data.user_id,
      ...data.metadata,
    })
  },
}
