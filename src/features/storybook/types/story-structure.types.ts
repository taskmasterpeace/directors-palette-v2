/**
 * Story Structure Types
 * Type definitions for narrative frameworks used in storybook generation
 *
 * Story structures provide a template for how AI generates and organizes
 * the narrative beats of a children's story. Each structure produces
 * stories of varying lengths (4-12+ scenes).
 */

/**
 * A single beat/step in a story structure
 */
export interface StoryBeat {
  id: string
  order: number
  name: string // e.g., "Once upon a time"
  purpose: string // e.g., "Introduce character and world"
  promptGuidance: string // AI instruction for this beat
  canBeSpread: boolean // Can this beat span 2 pages?
  suggestedImageCount: number // 1 or 2 images for this beat
}

/**
 * A complete story structure/framework
 */
export interface StoryStructure {
  id: string
  name: string // e.g., "Story Spine"
  origin: string // e.g., "Pixar"
  icon: string // Emoji or icon identifier
  description: string // Brief explanation for users
  longDescription: string // Detailed explanation for AI
  beatCount: number // Total number of beats
  beats: StoryBeat[] // The actual structure
  suggestedPageCounts: number[] // e.g., [6, 8, 12] - works well with
  ageRanges: AgeRange[] // Target age ranges
  bestFor: string[] // e.g., ["adventure", "growth", "transformation"]
  aiSystemPrompt: string // System prompt addition for AI story generation
}

/**
 * Age range classification
 */
export type AgeRange = '2-4' | '3-5' | '5-7' | '6-8' | '8-10' | '9-12'

/**
 * Story structure selection in the wizard
 */
export interface SelectedStructure {
  structureId: string
  structure: StoryStructure
  pageCount: number // User-selected page count
}

/**
 * Generated story with beat markers
 */
export interface StructuredStory {
  structureId: string
  structureName: string
  pages: StructuredPage[]
}

/**
 * A page with its associated beat information
 */
export interface StructuredPage {
  pageNumber: number
  beatId: string
  beatName: string
  text: string
  isSpreadCandidate: boolean // Can be combined with next page
  sceneDescription?: string // AI-generated scene description for image
}

/**
 * Helper type for structure options in UI
 */
export interface StructureOption {
  id: string
  name: string
  icon: string
  origin: string
  description: string
  beatCount: number
  ageRanges: AgeRange[]
}

/**
 * Convert a full structure to a simpler option for UI display
 */
export function toStructureOption(structure: StoryStructure): StructureOption {
  return {
    id: structure.id,
    name: structure.name,
    icon: structure.icon,
    origin: structure.origin,
    description: structure.description,
    beatCount: structure.beatCount,
    ageRanges: structure.ageRanges,
  }
}

/**
 * Get the total suggested images for a structure
 */
export function getTotalSuggestedImages(structure: StoryStructure): number {
  return structure.beats.reduce((sum, beat) => sum + beat.suggestedImageCount, 0)
}

/**
 * Get beats that can be rendered as spreads
 */
export function getSpreadCandidates(structure: StoryStructure): StoryBeat[] {
  return structure.beats.filter(beat => beat.canBeSpread)
}
