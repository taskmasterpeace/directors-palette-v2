/**
 * Ad Lab Feature
 * Video ad prompt matrix generator with 5-phase workflow
 */

// Components
export { AdLabWorkspace } from './components/AdLabWorkspace'

// Store
export { useAdLabStore } from './store/ad-lab.store'

// Types
export type {
  AdLabPhase,
  CreativeMandate,
  AdPrompt,
  GradeScore,
  GradedPrompt,
  RefinementAttempt,
  GenerationJob,
  MatrixCellKey,
  FormatInsights,
} from './types/ad-lab.types'
