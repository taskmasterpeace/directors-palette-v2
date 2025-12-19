/**
 * Storybook Types
 * Types for the children's book creator feature
 */

// Expression keywords from character sheet
export type CharacterExpression =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'speaking'
  | 'smug'
  | 'confident'
  | 'sad'
  | 'surprised'
  | 'shouting'
  | 'whispering'

// Character position in scene
export type CharacterPosition = 'left' | 'center' | 'right' | 'background'

// Camera shot types
export type CameraShot = 'wide' | 'medium' | 'close-up' | 'extreme-close-up'
export type CameraAngle = 'eye-level' | 'low-angle' | 'high-angle' | 'birds-eye'

// Text overlay position
export type TextPosition = 'top' | 'bottom' | 'left' | 'right' | 'none'

// Wizard step
export type WizardStep = 'story' | 'style' | 'characters' | 'pages' | 'preview'

// Character in a scene
export interface SceneCharacter {
  name: string // @CharacterName format
  expression: CharacterExpression
  pose?: string
  target?: string // Another @CharacterName they're interacting with
  position: CharacterPosition
}

// Scene JSON format for image generation
export interface SceneJSON {
  scene: {
    location: string
    mood?: string
    lighting?: string
    timeOfDay?: string
  }
  characters: SceneCharacter[]
  camera: {
    shot: CameraShot
    angle: CameraAngle
  }
}

// A single page in the storybook
export interface StorybookPage {
  id: string
  pageNumber: number
  text: string // The story text for this page
  sceneJSON?: SceneJSON // Parsed scene (generated automatically)
  imageUrl?: string // Selected variation image
  gridImageUrl?: string // The 3x3 grid image before frame extraction
  variationUrls?: string[] // All 9 variations (extracted from grid)
  selectedVariationIndex?: number // Which variation was selected (0-8)
  textPosition: TextPosition
  audioUrl?: string // Generated narration audio URL
}

// A character in the storybook
export interface StorybookCharacter {
  id: string
  name: string // Display name
  tag: string // @name format for prompts
  sourcePhotoUrl?: string // Original photo (if created from photo)
  characterSheetUrl?: string // Generated character sheet
  artStyle?: string // The style used for this character
  isFromLibrary?: boolean // Whether loaded from saved library
}

// Style guide for the storybook
export interface StorybookStyle {
  id: string
  name: string
  description?: string // Style description
  styleGuideUrl?: string // Generated or uploaded style guide image
  previewUrl?: string // Preview thumbnail (same as styleGuideUrl usually)
  sourceImageUrl?: string // Source image used to create style
  isPreset?: boolean // Whether it's a preset style
  presetId?: string // ID of the preset if applicable
}

// Main storybook project
export interface StorybookProject {
  id: string
  title: string
  storyText: string // Full story text
  pages: StorybookPage[]
  characters: StorybookCharacter[]
  style?: StorybookStyle
  coverImageUrl?: string
  status: 'draft' | 'in-progress' | 'completed'
  creditsUsed: number
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date // 30 days from creation
}

// Wizard state
export interface WizardState {
  currentStep: WizardStep
  project: StorybookProject | null
  isGenerating: boolean
  error: string | null
}

// Step info for UI
export interface StepInfo {
  id: WizardStep
  label: string
  description: string
  backgroundImage: string
  icon: string
}

// Step configuration
export const WIZARD_STEPS: StepInfo[] = [
  {
    id: 'story',
    label: 'Story',
    description: 'Write or paste your story',
    backgroundImage: '/storybook/step-story.webp',
    icon: 'BookOpen',
  },
  {
    id: 'style',
    label: 'Style',
    description: 'Choose your art style',
    backgroundImage: '/storybook/step-style.webp',
    icon: 'Palette',
  },
  {
    id: 'characters',
    label: 'Characters',
    description: 'Create character sheets',
    backgroundImage: '/storybook/step-characters.webp',
    icon: 'Users',
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Generate page illustrations',
    backgroundImage: '/storybook/step-pages.webp',
    icon: 'Images',
  },
  {
    id: 'preview',
    label: 'Preview',
    description: 'Review and export',
    backgroundImage: '/storybook/step-preview.webp',
    icon: 'BookCheck',
  },
]

// Get step index
export function getStepIndex(step: WizardStep): number {
  return WIZARD_STEPS.findIndex(s => s.id === step)
}

// Get next step
export function getNextStep(step: WizardStep): WizardStep | null {
  const index = getStepIndex(step)
  if (index < WIZARD_STEPS.length - 1) {
    return WIZARD_STEPS[index + 1].id
  }
  return null
}

// Get previous step
export function getPreviousStep(step: WizardStep): WizardStep | null {
  const index = getStepIndex(step)
  if (index > 0) {
    return WIZARD_STEPS[index - 1].id
  }
  return null
}
