import { lognog } from './lognog'

interface ScopedLogger {
  debug: (msg: string, ctx?: Record<string, unknown>) => void
  info: (msg: string, ctx?: Record<string, unknown>) => void
  warn: (msg: string, ctx?: Record<string, unknown>) => void
  error: (msg: string, ctx?: Record<string, unknown>) => void
}

export function createLogger(scope: string): ScopedLogger {
  return {
    debug: (msg, ctx) => lognog.devDebug(`[${scope}] ${msg}`, ctx),
    info: (msg, ctx) => lognog.devInfo(`[${scope}] ${msg}`, ctx),
    warn: (msg, ctx) => lognog.devWarn(`[${scope}] ${msg}`, ctx),
    error: (msg, ctx) => lognog.devError(`[${scope}] ${msg}`, ctx),
  }
}

// Pre-built loggers for common modules
export const logger = {
  api: createLogger('API'),
  gallery: createLogger('Gallery'),
  generation: createLogger('Generation'),
  auth: createLogger('Auth'),
  credits: createLogger('Credits'),
  storyboard: createLogger('Storyboard'),
  storybook: createLogger('Storybook'),
  shotCreator: createLogger('ShotCreator'),
  musicLab: createLogger('MusicLab'),
  recipe: createLogger('Recipe'),
}
