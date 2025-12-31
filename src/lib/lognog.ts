/**
 * LogNog Logging Service
 * Sends structured logs to LogNog analytics platform
 */

const LOGNOG_ENDPOINT = 'https://analytics.machinekinglabs.com/ingest/nextjs'
const LOGNOG_API_KEY = process.env.LOGNOG_API_KEY

// Event buffer for batching
let eventBuffer: LogEvent[] = []
let flushTimeout: NodeJS.Timeout | null = null
const BATCH_SIZE = 10
const FLUSH_INTERVAL_MS = 5000

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

async function flush(): Promise<void> {
  if (eventBuffer.length === 0) return
  if (!LOGNOG_API_KEY) {
    console.warn('[LogNog] API key not configured, skipping flush')
    eventBuffer = []
    return
  }

  const events = [...eventBuffer]
  eventBuffer = []

  try {
    const response = await fetch(LOGNOG_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': LOGNOG_API_KEY,
      },
      body: JSON.stringify(events),
    })

    if (!response.ok) {
      console.error(`[LogNog] Failed to send events: ${response.status}`)
    }
  } catch (error) {
    console.error('[LogNog] Network error:', error)
  }
}

function scheduleFlush(): void {
  if (flushTimeout) return
  flushTimeout = setTimeout(() => {
    flushTimeout = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

function queueEvent(event: LogEvent): void {
  eventBuffer.push(event)
  if (eventBuffer.length >= BATCH_SIZE) {
    if (flushTimeout) {
      clearTimeout(flushTimeout)
      flushTimeout = null
    }
    flush()
  } else {
    scheduleFlush()
  }
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
    queueEvent({
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
    queueEvent({
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
    queueEvent({
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
    queueEvent({
      timestamp: Date.now(),
      type: 'business',
      business: data,
    })
  },

  /**
   * Force flush all pending events (call on shutdown or before response ends)
   */
  async flush(): Promise<void> {
    if (flushTimeout) {
      clearTimeout(flushTimeout)
      flushTimeout = null
    }
    await flush()
  },
}

/**
 * Helper to wrap API route handlers with automatic logging
 */
export function withLognog<T>(
  route: string,
  method: string,
  handler: () => Promise<{ status: number; body: T; user_id?: string }>
): Promise<{ status: number; body: T }> {
  const start = Date.now()
  return handler()
    .then((result) => {
      lognog.api({
        route,
        method,
        status_code: result.status,
        duration_ms: Date.now() - start,
        user_id: result.user_id,
      })
      return { status: result.status, body: result.body }
    })
    .catch((error) => {
      const duration_ms = Date.now() - start
      lognog.api({
        route,
        method,
        status_code: 500,
        duration_ms,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      lognog.error({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        context: { route, method },
      })
      throw error
    })
}
