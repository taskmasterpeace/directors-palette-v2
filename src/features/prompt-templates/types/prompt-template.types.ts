/**
 * Prompt Template Types
 *
 * Defines the structure for tokens, templates, and prompt building rules.
 */

// Token categories - groups tokens by function
export type TokenCategory =
  | 'cinematography'  // shotSize, angle, framing
  | 'content'         // subject, action, foreground, background
  | 'visualLook'      // lensEffect, depthEffect, lighting, colorGrade, filmGrain
  | 'motion'          // cameraMovement, intensity, subjectMotion
  | 'audio'           // dialog, voiceover, ambient, music
  | 'style'           // prefix, stylePrompt, suffix
  | 'musicLab'        // performanceType, energyLevel, beatSync
  | 'storybook'       // textContent, textPlacement, pageType

// When a token appears in the final prompt
export type InclusionRule =
  | 'always'               // Always included in prompt
  | 'conditionalOnNoStyle' // Only when no style is selected
  | 'separate'             // Handled separately (style prefix/suffix)
  | 'additive'             // Appended for animation/audio layers
  | 'optional'             // User can toggle on/off

// Module types - different areas of the app
export type ModuleType = 'storyboard' | 'musicLab' | 'shotCreator' | 'storybook'

// Individual option within a token
export interface TokenOption {
  value: string
  label: string
  description?: string
}

// Token definition - a single configurable element
export interface Token {
  id: string
  name: string              // Internal name e.g., "shotSize"
  label: string             // Display label e.g., "Shot Size"
  category: TokenCategory
  inclusionRule: InclusionRule
  options: TokenOption[]    // Available choices
  placeholder: string       // Template placeholder e.g., "{shotSize}"
  defaultValue?: string     // Default selection
  allowCustom?: boolean     // Allow free-form input
  required?: boolean        // Must have a value
}

// Template slot - a token position in the template
export interface TemplateSlot {
  id: string
  tokenId: string
  prefix?: string           // Text before token value e.g., ", " or " of "
  suffix?: string           // Text after token value
  conditionalPrefix?: string // Only if token has value
}

// Complete prompt template for a module
export interface PromptTemplate {
  id: string
  moduleId: ModuleType
  name: string
  description?: string
  slots: TemplateSlot[]     // Ordered token slots
  formatString: string      // Human-readable format e.g., "{shotSize}, {angle} of {subject}..."
  bannedTerms: string[]     // Terms to filter out
  createdAt: string
  updatedAt: string
}

// Category metadata for UI display
export interface TokenCategoryMeta {
  id: TokenCategory
  label: string
  icon: string              // Lucide icon name
  color: string             // Tailwind color class
  description: string
}

// Template configuration for storage
export interface TemplateConfig {
  version: string
  tokens: Token[]
  templates: PromptTemplate[]
  categories: TokenCategoryMeta[]
}

// Selection state for building prompts
export interface TokenSelection {
  tokenId: string
  value: string
  customValue?: string      // If allowCustom is true
}

// Built prompt result
export interface BuiltPrompt {
  full: string              // Complete assembled prompt
  base: string              // Without style elements
  style: {
    prefix: string
    suffix: string
    stylePrompt: string
  }
  motion?: {
    cameraMovement: string
    subjectMotion?: string
  }
  audio?: {
    dialog?: string
    voiceover?: string
    ambient?: string
    music?: string
  }
  warnings: string[]        // Any banned terms found and removed
}

// Shot purpose types
export type ShotPurpose =
  | 'moment'        // Key story moment
  | 'establishing'  // Setting the scene
  | 'transition'    // Scene transition
  | 'broll'         // Supplementary footage
  | 'reaction'      // Character reaction
  | 'insert'        // Detail/cutaway shot

// Editor state for the admin UI
export interface TemplateEditorState {
  selectedModule: ModuleType
  selectedTemplateId: string | null
  editingToken: Token | null
  isDragging: boolean
  hasUnsavedChanges: boolean
}

// API response types
export interface SaveTemplateResponse {
  success: boolean
  template?: PromptTemplate
  error?: string
}

export interface LoadTemplatesResponse {
  success: boolean
  config?: TemplateConfig
  error?: string
}
