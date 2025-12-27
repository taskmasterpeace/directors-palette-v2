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

// Book format/aspect ratio
export type BookFormat = 'square' | 'landscape' | 'portrait' | 'wide'

// Page layout type
export type PageLayout =
  | 'image-with-text'      // Image fills page, text overlays
  | 'image-left-text-right' // Image on left page, text on right (spread)
  | 'text-left-image-right' // Text on left page, image on right (spread)
  | 'image-only'           // Full bleed image, no text
  | 'text-only'            // Text page with decorative border

// Book format configurations
export const BOOK_FORMATS: Record<BookFormat, {
  name: string
  description: string
  aspectRatio: string
  dimensions: string
  wordsPerPage: { min: number; max: number }
  bestFor: string
}> = {
  square: {
    name: 'Square',
    description: 'Classic picture book format',
    aspectRatio: '1:1',
    dimensions: '8.5" x 8.5"',
    wordsPerPage: { min: 20, max: 50 },
    bestFor: 'Bedtime stories, character-focused tales'
  },
  landscape: {
    name: 'Landscape',
    description: 'Wide format for scenic illustrations',
    aspectRatio: '4:3',
    dimensions: '10" x 8"',
    wordsPerPage: { min: 25, max: 60 },
    bestFor: 'Adventure stories, nature scenes'
  },
  portrait: {
    name: 'Portrait',
    description: 'Tall format for character illustrations',
    aspectRatio: '3:4',
    dimensions: '8" x 10"',
    wordsPerPage: { min: 30, max: 70 },
    bestFor: 'Character stories, fairy tales'
  },
  wide: {
    name: 'Wide Cinematic',
    description: 'Panoramic spreads for epic scenes',
    aspectRatio: '16:9',
    dimensions: '11" x 6.2"',
    wordsPerPage: { min: 15, max: 40 },
    bestFor: 'Action scenes, environmental storytelling'
  }
}

// Page layout configurations
export const PAGE_LAYOUTS: Record<PageLayout, {
  name: string
  description: string
  icon: string
}> = {
  'image-with-text': {
    name: 'Image + Text',
    description: 'Text overlaid on illustration',
    icon: 'ImageIcon'
  },
  'image-left-text-right': {
    name: 'Image | Text',
    description: 'Image on left, text on right',
    icon: 'LayoutPanelLeft'
  },
  'text-left-image-right': {
    name: 'Text | Image',
    description: 'Text on left, image on right',
    icon: 'LayoutPanelRight'
  },
  'image-only': {
    name: 'Full Image',
    description: 'Full bleed illustration',
    icon: 'Image'
  },
  'text-only': {
    name: 'Text Only',
    description: 'Decorative text page',
    icon: 'Type'
  }
}

// Wizard step - expanded for educational flow
// Original flow: story -> style -> characters -> pages -> preview
// New flow: character-setup -> category -> topic -> settings -> approach -> review -> style -> characters -> pages -> preview
export type WizardStep =
  | 'character-setup'  // NEW: Name, age, photo
  | 'category'         // NEW: Select educational category
  | 'topic'            // NEW: Select specific topic
  | 'settings'         // NEW: Page count, sentences per page
  | 'approach'         // NEW: Choose from 4 story ideas
  | 'review'           // NEW: Review generated story
  | 'story'            // EXISTING: For "paste your own" mode
  | 'style'            // EXISTING: Art style selection
  | 'characters'       // EXISTING: Character sheets
  | 'pages'            // EXISTING: Page generation
  | 'preview'          // EXISTING: Final preview

// Story creation mode
export type StoryMode = 'generate' | 'paste'

// Character role types for story characters added at setup
export type CharacterRole = 'sibling' | 'friend' | 'pet' | 'grandparent' | 'parent' | 'teacher' | 'other'

// Story character (added at setup, before story generation)
export interface StoryCharacter {
  id: string
  name: string
  role: CharacterRole
  relationship?: string  // e.g., "Emma's little brother", "Best friend"
  age?: number
  photoUrl?: string
  description?: string  // If no photo: "A fluffy golden retriever"
  characterSheetUrl?: string  // Generated character sheet (for consistency in page generation)
}

// API input type for story characters (without id)
export type StoryCharacterInput = Omit<StoryCharacter, 'id'>

// Role configurations for UI
export const CHARACTER_ROLES: Array<{
  id: CharacterRole
  name: string
  icon: string
  placeholder: string
}> = [
  { id: 'sibling', name: 'Sibling', icon: '👧', placeholder: "e.g., Emma's little brother" },
  { id: 'friend', name: 'Best Friend', icon: '🤝', placeholder: "e.g., School friend" },
  { id: 'pet', name: 'Pet', icon: '🐕', placeholder: "e.g., A fluffy golden retriever" },
  { id: 'grandparent', name: 'Grandparent', icon: '👴', placeholder: "e.g., Grandma who loves baking" },
  { id: 'parent', name: 'Parent', icon: '👨', placeholder: "e.g., Dad who works at the fire station" },
  { id: 'teacher', name: 'Teacher', icon: '👩‍🏫', placeholder: "e.g., Kind kindergarten teacher" },
  { id: 'other', name: 'Other', icon: '✨', placeholder: "Describe the character" },
]

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
  imageUrl?: string // Generated page image (single final image)
  // DEPRECATED: Grid-based variation system (removed in favor of recipe-based single image generation)
  // These fields are kept for backward compatibility with existing projects
  gridImageUrl?: string // DEPRECATED: The 3x3 grid image before frame extraction
  variationUrls?: string[] // DEPRECATED: All 9 variations (extracted from grid)
  selectedVariationIndex?: number // DEPRECATED: Which variation was selected (0-8)
  textPosition: TextPosition
  audioUrl?: string // Generated narration audio URL
  layout?: PageLayout // How text and image are arranged
  isSpread?: boolean // True if this page spans two physical pages
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
// Recipe configuration for storybook generation
export interface StorybookRecipeConfig {
  styleGuideRecipeId?: string      // Recipe for generating style guides
  characterSheetRecipeId?: string  // Recipe for generating character sheets
  pageFirstRecipeId?: string       // Recipe for first pages
  pageContinuationRecipeId?: string // Recipe for continuation pages
  bookCoverRecipeId?: string       // Recipe for book covers
}

export interface StorybookProject {
  id: string
  title: string
  author?: string // Author name for book cover
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
  // Book format settings
  bookFormat: BookFormat // square, landscape, portrait, wide
  defaultLayout: PageLayout // Default layout for new pages
  targetAge: number // Target reader age (3-12)
  // Recipe configuration (NEW)
  recipeConfig?: StorybookRecipeConfig

  // Education mode settings (NEW)
  storyMode: StoryMode // 'generate' or 'paste'
  // Main character (for generate mode)
  mainCharacterName?: string
  mainCharacterAge?: number
  mainCharacterPhotoUrl?: string // DEPRECATED: No longer used in UI, kept for backward compatibility
  // Additional story characters (siblings, friends, pets, etc.)
  storyCharacters?: StoryCharacter[]
  // Educational category and topic
  educationCategory?: string // e.g., 'math', 'narrative', 'reading'
  educationTopic?: string // e.g., 'counting-10', 'honesty'
  // Book configuration
  pageCount?: number // 4, 6, 8, 10, or 12
  sentencesPerPage?: number // 1-6
  // Customization options (NEW - Parent Power Features)
  storySetting?: string // e.g., 'park', 'beach', 'fantasy-castle'
  customSetting?: string // Free-text custom setting
  customElements?: string[] // e.g., ['dinosaurs', 'unicorns', 'magic']
  customNotes?: string // Free-text notes from parent
  // Story generation
  selectedApproach?: string // The approach ID selected by user
  selectedApproachTitle?: string
  selectedApproachSummary?: string
  generatedStory?: {
    title: string
    summary: string
    pages: Array<{
      pageNumber: number
      text: string
      sceneDescription: string
      learningNote?: string
    }>
  }
  // Extracted elements for reference images
  extractedCharacters?: Array<{
    name: string
    description: string
    appearances: number[]
    role: 'main' | 'supporting'
    photoUrl?: string
  }>
  extractedLocations?: Array<{
    name: string
    description: string
    appearances: number[]
  }>

  // Recipe references (system recipes used for generation)
  styleGuideRecipeId?: string // Recipe used for style guide generation
  characterSheetRecipeId?: string // Recipe used for character sheet generation
  pageRecipeId?: string // Recipe used for page illustration generation
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

// Step configuration for GENERATE mode (educational flow)
// Background images feature diverse children in whimsical watercolor illustrations
export const GENERATE_WIZARD_STEPS: StepInfo[] = [
  {
    id: 'character-setup',
    label: 'Character',
    description: 'Create your main character',
    backgroundImage: '/storybook/step-character.webp', // Black girl + Asian boy reading in treehouse
    icon: 'User',
  },
  {
    id: 'category',
    label: 'Category',
    description: 'What should they learn?',
    backgroundImage: '/storybook/step-category.webp', // Diverse kids exploring with telescope/magnifying glass
    icon: 'Grid3X3',
  },
  {
    id: 'topic',
    label: 'Topic',
    description: 'Pick a specific topic',
    backgroundImage: '/storybook/step-topic.webp', // Black girl with braids discovering forest animals
    icon: 'Target',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure your book',
    backgroundImage: '/storybook/step-settings.webp', // Mixed-race child at magical desk
    icon: 'Settings',
  },
  {
    id: 'approach',
    label: 'Approach',
    description: 'Choose your story idea',
    backgroundImage: '/storybook/step-approach.webp', // Asian girl + Black boy brainstorming ideas
    icon: 'Lightbulb',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Edit your story',
    backgroundImage: '/storybook/step-review.webp', // Black girl reading glowing book
    icon: 'FileText',
  },
  {
    id: 'style',
    label: 'Style',
    description: 'Choose your art style',
    backgroundImage: '/storybook/step-style.webp', // Diverse children painting at easels
    icon: 'Palette',
  },
  {
    id: 'characters',
    label: 'Characters',
    description: 'Create character sheets',
    backgroundImage: '/storybook/step-characters-new.webp', // Black boy designing character on tablet
    icon: 'Users',
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Generate page illustrations',
    backgroundImage: '/storybook/step-pages.webp', // Asian girl + mixed-race boy with flying pages
    icon: 'Images',
  },
  {
    id: 'preview',
    label: 'Preview',
    description: 'Review and export',
    backgroundImage: '/storybook/step-preview.webp', // Diverse group holding finished storybook
    icon: 'BookCheck',
  },
]

// Step configuration for PASTE mode (original flow)
// Background images feature diverse children in whimsical watercolor illustrations
export const PASTE_WIZARD_STEPS: StepInfo[] = [
  {
    id: 'story',
    label: 'Story',
    description: 'Write or paste your story',
    backgroundImage: '/storybook/step-review.webp', // Black girl reading glowing book
    icon: 'BookOpen',
  },
  {
    id: 'style',
    label: 'Style',
    description: 'Choose your art style',
    backgroundImage: '/storybook/step-style.webp', // Diverse children painting at easels
    icon: 'Palette',
  },
  {
    id: 'characters',
    label: 'Characters',
    description: 'Create character sheets',
    backgroundImage: '/storybook/step-characters-new.webp', // Black boy designing character on tablet
    icon: 'Users',
  },
  {
    id: 'pages',
    label: 'Pages',
    description: 'Generate page illustrations',
    backgroundImage: '/storybook/step-pages.webp', // Asian girl + mixed-race boy with flying pages
    icon: 'Images',
  },
  {
    id: 'preview',
    label: 'Preview',
    description: 'Review and export',
    backgroundImage: '/storybook/step-preview.webp', // Diverse group holding finished storybook
    icon: 'BookCheck',
  },
]

// Legacy alias for backwards compatibility
export const WIZARD_STEPS = PASTE_WIZARD_STEPS

// Get steps for a given mode
export function getWizardSteps(mode: StoryMode): StepInfo[] {
  return mode === 'generate' ? GENERATE_WIZARD_STEPS : PASTE_WIZARD_STEPS
}

// Get step index for a mode
export function getStepIndex(step: WizardStep, mode: StoryMode = 'paste'): number {
  const steps = getWizardSteps(mode)
  return steps.findIndex(s => s.id === step)
}

// Get next step for a mode
export function getNextStep(step: WizardStep, mode: StoryMode = 'paste'): WizardStep | null {
  const steps = getWizardSteps(mode)
  const index = steps.findIndex(s => s.id === step)
  if (index >= 0 && index < steps.length - 1) {
    return steps[index + 1].id
  }
  return null
}

// Get previous step for a mode
export function getPreviousStep(step: WizardStep, mode: StoryMode = 'paste'): WizardStep | null {
  const steps = getWizardSteps(mode)
  const index = steps.findIndex(s => s.id === step)
  if (index > 0) {
    return steps[index - 1].id
  }
  return null
}
