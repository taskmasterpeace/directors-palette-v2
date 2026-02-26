/**
 * Adhub Types
 * Types for the generic static ad image generator feature
 */

// =============================================================================
// MODEL TYPES
// =============================================================================

export type AdhubModel = 'nano-banana-2' | 'nano-banana-pro'

// =============================================================================
// ASPECT RATIO (moved from store for shared access)
// =============================================================================

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '4:3'

export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; description: string }[] = [
  { value: '1:1', label: 'Square', description: 'Instagram post' },
  { value: '4:5', label: 'Portrait', description: 'Instagram feed' },
  { value: '9:16', label: 'Story', description: 'Reels, TikTok' },
  { value: '16:9', label: 'Landscape', description: 'YouTube, Twitter' },
  { value: '4:3', label: 'Classic', description: 'Traditional' },
]

// =============================================================================
// BRAND TYPES
// =============================================================================

export interface AdhubBrand {
  id: string
  userId: string
  name: string
  logoUrl?: string
  contextText?: string
  createdAt: Date
  updatedAt: Date
}

export interface AdhubBrandImage {
  id: string
  brandId: string
  imageUrl: string
  description?: string
  createdAt: Date
}

export type AdhubBrandInput = Omit<AdhubBrand, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

export interface AdhubBrandImageInput {
  imageUrl: string
  description?: string
}

// =============================================================================
// PRODUCT TYPES (v2)
// =============================================================================

export interface AdhubExtractedCopy {
  headline: string
  tagline: string
  valueProp: string
  features: string[]
  audience: string
}

export interface AdhubProduct {
  id: string
  brandId: string
  userId: string
  name: string
  rawText: string
  extractedCopy: AdhubExtractedCopy
  createdAt: Date
  updatedAt: Date
}

export type AdhubProductInput = Omit<AdhubProduct, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

// =============================================================================
// PRESET TYPES (v2 - hardcoded, not DB)
// =============================================================================

export interface AdhubPreset {
  slug: string
  name: string
  description: string
  icon: string
  promptTemplate: string
  styleModifiers: string
  tags: string[]
}

// =============================================================================
// AD TYPES
// =============================================================================

export type AdStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface AdhubAd {
  id: string
  userId: string
  brandId?: string
  productId?: string
  presetSlug?: string
  generatedPrompt?: string
  galleryId?: string
  status: AdStatus
  createdAt: Date
  // Populated relations
  brand?: AdhubBrand
  product?: AdhubProduct
}

export interface AdhubAdInput {
  brandId: string
  productId: string
  presetSlug: string
}

// =============================================================================
// GENERATION TYPES
// =============================================================================

export interface AdhubGenerationRequest {
  brandId: string
  productId: string
  presetSlug: string
  selectedReferenceImages?: string[]
  aspectRatio?: string
  model?: string
}

export interface AdhubGenerationResult {
  adId: string
  galleryId: string
  imageUrl: string
  prompt: string
}

// =============================================================================
// UI STATE TYPES (v2)
// =============================================================================

export type AdhubStep = 'brand' | 'product' | 'preset-generate' | 'result'

export interface AdhubWizardState {
  currentStep: AdhubStep
  selectedBrand?: AdhubBrand
  selectedProduct?: AdhubProduct
  selectedPreset?: AdhubPreset
  selectedReferenceImages: string[]
  isGenerating: boolean
  isExtracting: boolean
  generationResult?: AdhubGenerationResult
  error?: string
  // Lip-sync video ad configuration
  videoAdConfig?: AdhubVideoAdConfig
}

// =============================================================================
// VIDEO AD (LIP-SYNC) TYPES
// =============================================================================

export type AdhubVideoAudioSource = 'upload' | 'tts'

export type AdhubLipSyncModel = 'kling-avatar-v2-standard' | 'kling-avatar-v2-pro'

export type AdhubLipSyncResolution = '720p' | '1080p'

export interface AdhubVideoAdConfig {
  enabled: boolean
  spokespersonImageUrl: string | null
  spokespersonImageFile?: File | null
  audioSource: AdhubVideoAudioSource
  uploadedAudioUrl: string | null
  uploadedAudioFile?: File | null
  ttsScript: string
  ttsVoiceId: string
  generatedTtsAudioUrl: string | null
  audioDurationSeconds: number | null
  modelSettings: {
    model: AdhubLipSyncModel
    resolution: AdhubLipSyncResolution
  }
  // Generation state
  isGenerating: boolean
  lipSyncPredictionId: string | null
  lipSyncGalleryId: string | null
  lipSyncVideoUrl: string | null
  lipSyncError: string | null
}

// =============================================================================
// DATABASE RESPONSE TYPES (snake_case from Supabase)
// =============================================================================

export interface AdhubBrandRow {
  id: string
  user_id: string
  name: string
  logo_url: string | null
  context_text: string | null
  created_at: string
  updated_at: string
}

export interface AdhubBrandImageRow {
  id: string
  brand_id: string
  image_url: string
  description: string | null
  created_at: string
}

export interface AdhubProductRow {
  id: string
  brand_id: string
  user_id: string
  name: string
  raw_text: string
  extracted_copy: AdhubExtractedCopy
  created_at: string
  updated_at: string
}

export interface AdhubAdRow {
  id: string
  user_id: string
  brand_id: string | null
  product_id: string | null
  preset_slug: string | null
  generated_prompt: string | null
  gallery_id: string | null
  status: string
  created_at: string
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

export function brandFromRow(row: AdhubBrandRow): AdhubBrand {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    contextText: row.context_text ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function brandImageFromRow(row: AdhubBrandImageRow): AdhubBrandImage {
  return {
    id: row.id,
    brandId: row.brand_id,
    imageUrl: row.image_url,
    description: row.description ?? undefined,
    createdAt: new Date(row.created_at),
  }
}

export function productFromRow(row: AdhubProductRow): AdhubProduct {
  return {
    id: row.id,
    brandId: row.brand_id,
    userId: row.user_id,
    name: row.name,
    rawText: row.raw_text,
    extractedCopy: row.extracted_copy,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function adFromRow(row: AdhubAdRow): AdhubAd {
  return {
    id: row.id,
    userId: row.user_id,
    brandId: row.brand_id ?? undefined,
    productId: row.product_id ?? undefined,
    presetSlug: row.preset_slug ?? undefined,
    generatedPrompt: row.generated_prompt ?? undefined,
    galleryId: row.gallery_id ?? undefined,
    status: row.status as AdStatus,
    createdAt: new Date(row.created_at),
  }
}
