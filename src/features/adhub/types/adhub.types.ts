/**
 * Adhub Types
 * Types for the generic static ad image generator feature
 */

// =============================================================================
// MODEL TYPES
// =============================================================================

export type AdhubModel = 'nano-banana-pro' | 'riverflow-2-pro'

export interface RiverflowInputs {
  sourceImages: string[]        // init_images (product photos)
  detailRefs: string[]          // super_resolution_refs (clean labels/logos)
  fontUrls: string[]            // uploaded font URLs
  fontTexts: string[]           // text to render (max 300 chars each)
}

export interface RiverflowSettings {
  resolution: '1K' | '2K' | '4K'
  transparency: boolean
  enhancePrompt: boolean
  maxIterations: 1 | 2 | 3
}

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
// STYLE TYPES (Admin-only creation)
// =============================================================================

export interface AdhubStyle {
  id: string
  name: string
  displayName: string
  iconUrl?: string
  promptModifiers: string
  isActive: boolean
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export type AdhubStyleInput = Omit<AdhubStyle, 'id' | 'createdAt' | 'updatedAt'>

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

export type TemplateFieldType = 'image' | 'text'

export interface AdhubTemplateField {
  id: string
  templateId: string
  fieldType: TemplateFieldType
  fieldName: string
  fieldLabel: string
  isRequired: boolean
  placeholder?: string
  fieldOrder: number
}

export interface AdhubTemplate {
  id: string
  userId: string
  name: string
  iconUrl?: string
  goalPrompt: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  fields?: AdhubTemplateField[]
}

export type AdhubTemplateInput = Omit<AdhubTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'fields'>

export interface AdhubTemplateFieldInput {
  fieldType: TemplateFieldType
  fieldName: string
  fieldLabel: string
  isRequired?: boolean
  placeholder?: string
  fieldOrder?: number
}

// =============================================================================
// AD TYPES
// =============================================================================

export type AdStatus = 'pending' | 'generating' | 'completed' | 'failed'

export interface AdhubAd {
  id: string
  userId: string
  brandId?: string
  styleId?: string
  templateId?: string
  fieldValues: Record<string, string>
  generatedPrompt?: string
  galleryId?: string
  status: AdStatus
  createdAt: Date
  // Populated relations
  brand?: AdhubBrand
  style?: AdhubStyle
  template?: AdhubTemplate
}

export interface AdhubAdInput {
  brandId: string
  styleId: string
  templateId: string
  fieldValues: Record<string, string>
}

// =============================================================================
// GENERATION TYPES
// =============================================================================

export interface AdhubGenerationRequest {
  brandId: string
  styleId: string
  templateId: string
  fieldValues: Record<string, string>
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
// UI STATE TYPES
// =============================================================================

export type AdhubStep = 'brand' | 'template' | 'style' | 'fill' | 'result'

export interface AdhubWizardState {
  currentStep: AdhubStep
  selectedBrand?: AdhubBrand
  selectedTemplate?: AdhubTemplate
  selectedStyle?: AdhubStyle
  fieldValues: Record<string, string>
  selectedReferenceImages: string[]
  isGenerating: boolean
  generationResult?: AdhubGenerationResult
  error?: string
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

export interface AdhubStyleRow {
  id: string
  name: string
  display_name: string
  icon_url: string | null
  prompt_modifiers: string
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AdhubTemplateRow {
  id: string
  user_id: string
  name: string
  icon_url: string | null
  goal_prompt: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface AdhubTemplateFieldRow {
  id: string
  template_id: string
  field_type: string
  field_name: string
  field_label: string
  is_required: boolean
  placeholder: string | null
  field_order: number
}

export interface AdhubAdRow {
  id: string
  user_id: string
  brand_id: string | null
  style_id: string | null
  template_id: string | null
  field_values: Record<string, string>
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

export function styleFromRow(row: AdhubStyleRow): AdhubStyle {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    iconUrl: row.icon_url ?? undefined,
    promptModifiers: row.prompt_modifiers,
    isActive: row.is_active,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function templateFromRow(row: AdhubTemplateRow): AdhubTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    iconUrl: row.icon_url ?? undefined,
    goalPrompt: row.goal_prompt,
    isPublic: row.is_public,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export function templateFieldFromRow(row: AdhubTemplateFieldRow): AdhubTemplateField {
  return {
    id: row.id,
    templateId: row.template_id,
    fieldType: row.field_type as TemplateFieldType,
    fieldName: row.field_name,
    fieldLabel: row.field_label,
    isRequired: row.is_required,
    placeholder: row.placeholder ?? undefined,
    fieldOrder: row.field_order,
  }
}

export function adFromRow(row: AdhubAdRow): AdhubAd {
  return {
    id: row.id,
    userId: row.user_id,
    brandId: row.brand_id ?? undefined,
    styleId: row.style_id ?? undefined,
    templateId: row.template_id ?? undefined,
    fieldValues: row.field_values,
    generatedPrompt: row.generated_prompt ?? undefined,
    galleryId: row.gallery_id ?? undefined,
    status: row.status as AdStatus,
    createdAt: new Date(row.created_at),
  }
}
