/**
 * LogNog Logging Service
 * Sends structured logs to LogNog analytics platform
 *
 * Uses batched sending with 50 event threshold or 5s timer
 * Compatible with LogNog universal HTTP endpoint
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

// Sensitive field patterns to redact
const SENSITIVE_PATTERNS = ['password', 'secret', 'token', 'key', 'auth', 'credential'];

/**
 * Sanitize context for logging - truncates long strings and redacts sensitive data
 */
function sanitize(context: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    // Check for sensitive field names
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_PATTERNS.some(pattern => lowerKey.includes(pattern))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'string') {
      // Truncate long strings (prompts, descriptions, etc.)
      if (value.length > 500) {
        sanitized[key] = value.slice(0, 500) + '...[truncated]';
      } else {
        sanitized[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Summarize large arrays
      if (value.length > 10) {
        sanitized[key] = `[Array(${value.length})]`;
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects (1 level deep)
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

class LogNogClient {
  private buffer: LogEntry[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;
  private isFlushing = false;

  // Lazy getters - read env vars only when needed
  private get url() {
    return process.env.LOGNOG_URL || 'https://logs.machinekinglabs.com';
  }

  private get apiKey() {
    return process.env.LOGNOG_API_KEY || '';
  }

  private get appName() {
    return process.env.LOGNOG_APP_NAME || 'directors-palette';
  }

  private get index() {
    return process.env.LOGNOG_INDEX || this.appName;
  }

  /**
   * Log a message with context (batched automatically)
   */
  log(level: LogLevel, message: string, context: Record<string, unknown> = {}) {
    if (!this.apiKey) {
      return;
    }

    this.buffer.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: process.env.NODE_ENV || 'development',
      ...context,
    });

    // Flush when buffer is full OR schedule flush
    if (this.buffer.length >= 50) {
      this.flush();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 5000);
    }
  }

  // Convenience methods
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
  }

  /**
   * Development-aware logging - outputs to console in dev mode AND sends to LogNog
   * Use this as a drop-in replacement for console.log during migration
   */
  devLog(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const sanitizedContext = context ? sanitize(context) : undefined;

    // In development, also output to console for immediate feedback
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

      switch (level) {
        case 'error':
          console.error(prefix, message, sanitizedContext || '');
          break;
        case 'warn':
          console.warn(prefix, message, sanitizedContext || '');
          break;
        case 'debug':
          console.debug(prefix, message, sanitizedContext || '');
          break;
        default:
          console.log(prefix, message, sanitizedContext || '');
      }
    }

    // Always send to LogNog (if configured)
    this.log(level, message, sanitizedContext);
  }

  // Convenience methods for devLog
  devDebug(message: string, context?: Record<string, unknown>) {
    this.devLog('debug', message, context);
  }

  devInfo(message: string, context?: Record<string, unknown>) {
    this.devLog('info', message, context);
  }

  devWarn(message: string, context?: Record<string, unknown>) {
    this.devLog('warn', message, context);
  }

  devError(message: string, context?: Record<string, unknown>) {
    this.devLog('error', message, context);
  }

  /**
   * Force flush - call before script exit or when immediate send is needed
   */
  async forceFlush(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.buffer.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(`${this.url}/api/ingest/http`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'X-App-Name': this.appName,
          'X-Index': this.index,
        },
        body: JSON.stringify(logs),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[LogNog] Error ${response.status}: ${text}`);
        // Put logs back in buffer for retry
        this.buffer.unshift(...logs);
      }
    } catch (error) {
      console.error('[LogNog] Connection error:', error);
      // Put logs back in buffer for retry
      this.buffer.unshift(...logs);
    } finally {
      this.isFlushing = false;
    }
  }
}

// Singleton instance
export const lognog = new LogNogClient();

// Export flush for scripts
export const flushLogs = () => lognog.forceFlush();
