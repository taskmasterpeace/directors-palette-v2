/**
 * Ad Lab Types
 * Video ad prompt matrix generator - 5-phase workflow
 */

// =============================================================================
// PHASE & WORKFLOW TYPES
// =============================================================================

export type AdLabPhase = 'strategy' | 'execution' | 'quality' | 'refine' | 'generate'

export interface BriefAsset {
  id: string
  file: File
  preview: string
  label: string
}

// =============================================================================
// PHASE 1: STRATEGY
// =============================================================================

export interface CreativeMandate {
  audienceDemographics: string
  primaryPainPoint: string
  brandVoice: string
  forbiddenWords: string[]
  durationStrategy: {
    '5s': string
    '15s': string
    '30s': string
  }
  platformConstraints: {
    '16:9': string
    '9:16': string
  }
}

// =============================================================================
// PHASE 2: EXECUTION
// =============================================================================

export type AdAspectRatio = '16:9' | '9:16'
export type AdDuration = '5s' | '15s' | '30s'
export type AdVariant = 'A' | 'B'

export interface MatrixCellKey {
  aspectRatio: AdAspectRatio
  duration: AdDuration
  variant: AdVariant
}

export interface AdPrompt {
  id: string
  aspectRatio: AdAspectRatio
  duration: AdDuration
  variant: AdVariant
  openingFrame: string
  fullPrompt: string
  beatTimings: string[]
  cameraWork: string
  textOverlays: Array<{ text: string; timestamp: string }>
  ctaPlacement: string
}

// =============================================================================
// PHASE 3: QUALITY
// =============================================================================

export interface GradeScore {
  promptId: string
  hook: number        // 0-20
  voice: number       // 0-20
  native: number      // 0-20
  cta: number         // 0-20
  abDiff: number      // 0-20
  total: number       // 0-100
  letterGrade: string // A+ / A / B+ / B / C / D / F
  status: 'pass' | 'refine'
  feedback: {
    hook: string
    voice: string
    native: string
    cta: string
    abDiff: string
  }
}

export interface GradedPrompt {
  prompt: AdPrompt
  grade: GradeScore
}

// =============================================================================
// PHASE 4: REFINE
// =============================================================================

export interface RefinementAttempt {
  promptId: string
  attemptNumber: number
  previousScore: number
  newScore: number
  targetDimension: string
  changes: string
  revisedPrompt: AdPrompt
  revisedGrade: GradeScore
}

// =============================================================================
// PHASE 5: GENERATE
// =============================================================================

export type GenerationJobStatus = 'queued' | 'generating_image' | 'image_done' | 'generating_video' | 'completed' | 'failed'

export interface GenerationJob {
  promptId: string
  status: GenerationJobStatus
  imageUrl?: string
  videoUrl?: string
  error?: string
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export type RatioFilter = '16:9' | '9:16' | 'all'
export type DurationFilter = '5s' | '15s' | '30s' | 'all'
export type StatusFilter = 'pass' | 'refine' | 'all'

// =============================================================================
// FORMAT INSIGHTS
// =============================================================================

export interface FormatInsights {
  bestFormat: string
  bestScore: number
  worstFormat: string
  worstScore: number
  recommendation: string
}
