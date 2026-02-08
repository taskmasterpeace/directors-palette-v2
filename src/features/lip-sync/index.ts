/**
 * Lip Sync Feature Module
 *
 * Exports for Kling Avatar V2 lip-sync video generation.
 */

// Types
export * from './types/lip-sync.types'

// Config
export * from './config/lip-sync-models.config'

// Services
export {
  LipSyncGenerationService,
  getAudioDuration,
  formatDuration,
  formatCost,
} from './services/lip-sync-generation.service'

// Components
export * from './components'
