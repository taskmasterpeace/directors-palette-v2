/**
 * Story Structure Types
 * Type definitions for narrative frameworks used in storybook generation
 *
 * Story structures provide a template for how AI generates and organizes
 * the narrative beats of a children's story. Each structure produces
 * stories of varying lengths (4-12+ scenes).
 *
 * NOTE: This file defines the TEMPLATE structures (e.g., Story Spine, Hero's Journey).
 * The actual generated story beats are defined as `StoryBeat` in storybook.types.ts.
 */

/**
 * A single beat/step in a story structure TEMPLATE
 * (Renamed from StoryBeat to avoid conflict with generated StoryBeat in storybook.types.ts)
 */
export interface StoryStructureBeat {
  id: string
  order: number
  name: string // e.g., "Once upon a time"
  purpose: string // e.g., "Introduce character and world"
  promptGuidance: string // AI instruction for this beat
  canBeSpread: boolean // Can this beat span 2 pages?
  suggestedImageCount: number // 1 or 2 images for this beat
  emotionalTone?: string // Expected emotional state (e.g., "curious", "triumphant")
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
  beats: StoryStructureBeat[] // The structural template beats
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
export function getSpreadCandidates(structure: StoryStructure): StoryStructureBeat[] {
  return structure.beats.filter(beat => beat.canBeSpread)
}

/**
 * Convert numeric age to age range
 */
export function getAgeRangeFromAge(age: number): AgeRange {
  if (age <= 4) return '2-4'
  if (age <= 5) return '3-5'
  if (age <= 7) return '5-7'
  if (age <= 8) return '6-8'
  if (age <= 10) return '8-10'
  return '9-12'
}

/**
 * Check if a story structure is appropriate for a given age
 */
export function isStructureAppropriateForAge(
  structure: StoryStructure,
  age: number
): boolean {
  const ageRange = getAgeRangeFromAge(age)
  return structure.ageRanges.includes(ageRange)
}

/**
 * Get recommended structures for a given page count
 */
export function getRecommendedStructures(
  structures: StoryStructure[],
  pageCount: number
): StoryStructure[] {
  return structures.filter(s => s.suggestedPageCounts.includes(pageCount))
}

/**
 * Get structures appropriate for a given age
 */
export function getStructuresForAge(
  structures: StoryStructure[],
  age: number
): StoryStructure[] {
  return structures.filter(s => isStructureAppropriateForAge(s, age))
}
