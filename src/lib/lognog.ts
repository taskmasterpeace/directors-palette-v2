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
