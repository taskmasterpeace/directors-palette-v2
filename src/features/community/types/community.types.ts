/**
 * Community Feature Types
 * Types for community sharing, ratings, and library management
 */

import type { RecipeStage } from '@/features/shot-creator/types/recipe.types'
import type { DirectorFingerprint } from '@/features/music-lab/types/director.types'

// =============================================================================
// CONTENT TYPES
// =============================================================================

export type CommunityItemType = 'wildcard' | 'recipe' | 'prompt' | 'director'

export type CommunityItemStatus = 'pending' | 'approved' | 'rejected'

export type PromptUseCase =
  | 'character'
  | 'environment'
  | 'action'
  | 'lighting'
  | 'camera'
  | 'style'
  | 'complete'

export type ModuleType = 'storyboard' | 'musicLab' | 'shotCreator' | 'storybook' | 'any'

// =============================================================================
// CONTENT INTERFACES
// =============================================================================

export interface WildcardContent {
  entries: string[]
}

export interface RecipeContent {
  stages: RecipeStage[]
  suggestedAspectRatio?: string
  recipeNote?: string
  referenceImages: {
    url: string
    name: string
  }[]
  templateUrl?: string  // Visual layout guide showing expected output
}

export interface PromptContent {
  promptText: string
  useCase: PromptUseCase
  module: ModuleType
  exampleOutput?: string
  variables?: string[]
}

export interface DirectorContent {
  fingerprint: DirectorFingerprint
  avatarUrl?: string
  sampleImages?: string[]
}

export type CommunityContent =
  | WildcardContent
  | RecipeContent
  | PromptContent
  | DirectorContent

// =============================================================================
// COMMUNITY ITEM
// =============================================================================

export interface CommunityItem {
  id: string
  type: CommunityItemType
  name: string
  description: string | null
  category: string
  tags: string[]

  // Submission info
  submittedBy: string | null
  submittedByName: string
  submittedAt: string

  // Approval status
  status: CommunityItemStatus
  approvedBy?: string | null
  approvedAt?: string | null
  rejectedReason?: string | null

  // Stats
  addCount: number
  ratingSum: number
  ratingCount: number

  // Featured
  isFeatured: boolean

  // Computed
  averageRating: number

  // Content
  content: CommunityContent

  // Timestamps
  createdAt: string
  updatedAt: string
}

// Database row type (snake_case)
export interface CommunityItemRow {
  id: string
  type: CommunityItemType
  name: string
  description: string | null
  category: string
  tags: string[]
  content: CommunityContent
  submitted_by: string | null
  submitted_by_name: string
  submitted_at: string
  status: CommunityItemStatus
  approved_by: string | null
  approved_at: string | null
  rejected_reason: string | null
  add_count: number
  rating_sum: number
  rating_count: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

// =============================================================================
// RATINGS
// =============================================================================

export interface CommunityRating {
  id: string
  userId: string
  communityItemId: string
  rating: number
  createdAt: string
  updatedAt: string
}

export interface CommunityRatingRow {
  id: string
  user_id: string
  community_item_id: string
  rating: number
  created_at: string
  updated_at: string
}

export interface RatingDistribution {
  1: number
  2: number
  3: number
  4: number
  5: number
}

// =============================================================================
// USER LIBRARY
// =============================================================================

export interface UserLibraryItem {
  id: string
  userId: string
  communityItemId: string | null
  type: CommunityItemType
  name: string
  content: CommunityContent
  isModified: boolean
  submittedToCommunity: boolean
  communityStatus: CommunityItemStatus | null
  addedAt: string
  modifiedAt: string
}

export interface UserLibraryItemRow {
  id: string
  user_id: string
  community_item_id: string | null
  type: CommunityItemType
  name: string
  content: CommunityContent
  is_modified: boolean
  submitted_to_community: boolean
  community_status: CommunityItemStatus | null
  added_at: string
  modified_at: string
}

// =============================================================================
// API TYPES
// =============================================================================

export interface CommunityFilters {
  type?: CommunityItemType | 'all'
  category?: string
  search?: string
  sortBy?: 'popular' | 'rating' | 'newest' | 'alphabetical'
}

export interface SubmitItemRequest {
  type: CommunityItemType
  name: string
  description?: string
  category: string
  tags?: string[]
  content: CommunityContent
}

export interface RateItemRequest {
  rating: number // 1-5
}

// =============================================================================
// CATEGORIES
// =============================================================================

export const WILDCARD_CATEGORIES = [
  { value: 'characters', label: 'Characters' },
  { value: 'environments', label: 'Environments' },
  { value: 'cinematography', label: 'Cinematography' },
  { value: 'styles', label: 'Styles' },
  { value: 'props', label: 'Props & Objects' },
  { value: 'actions', label: 'Actions & Poses' },
] as const

export const RECIPE_CATEGORIES = [
  { value: 'character-sheets', label: 'Character Sheets' },
  { value: 'style-guides', label: 'Style Guides' },
  { value: 'storyboards', label: 'Storyboards' },
  { value: 'product', label: 'Product Photography' },
  { value: 'portraits', label: 'Portraits' },
  { value: 'action', label: 'Action Scenes' },
  { value: 'time-based', label: 'Time-Based' },
] as const

export const PROMPT_CATEGORIES = [
  { value: 'character', label: 'Character Descriptions' },
  { value: 'environment', label: 'Environment/Location' },
  { value: 'lighting', label: 'Lighting Setups' },
  { value: 'camera', label: 'Camera Work' },
  { value: 'action', label: 'Action Sequences' },
  { value: 'style', label: 'Style Modifiers' },
  { value: 'complete', label: 'Complete Prompts' },
] as const

export const DIRECTOR_CATEGORIES = [
  { value: 'classic', label: 'Classic Hollywood' },
  { value: 'indie', label: 'Independent/Arthouse' },
  { value: 'music-video', label: 'Music Video' },
  { value: 'commercial', label: 'Commercial/Fashion' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'horror', label: 'Horror/Thriller' },
  { value: 'action', label: 'Action/Blockbuster' },
  { value: 'animation', label: 'Animation/Stylized' },
] as const

export function getCategoriesForType(type: CommunityItemType) {
  switch (type) {
    case 'wildcard':
      return WILDCARD_CATEGORIES
    case 'recipe':
      return RECIPE_CATEGORIES
    case 'prompt':
      return PROMPT_CATEGORIES
    case 'director':
      return DIRECTOR_CATEGORIES
  }
}

// =============================================================================
// HELPERS
// =============================================================================

export function rowToCommunityItem(row: CommunityItemRow): CommunityItem {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    category: row.category,
    tags: row.tags,
    submittedBy: row.submitted_by,
    submittedByName: row.submitted_by_name,
    submittedAt: row.submitted_at,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedReason: row.rejected_reason,
    addCount: row.add_count,
    ratingSum: row.rating_sum,
    ratingCount: row.rating_count,
    isFeatured: row.is_featured,
    averageRating: row.rating_count > 0 ? row.rating_sum / row.rating_count : 0,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function rowToUserLibraryItem(row: UserLibraryItemRow): UserLibraryItem {
  return {
    id: row.id,
    userId: row.user_id,
    communityItemId: row.community_item_id,
    type: row.type,
    name: row.name,
    content: row.content,
    isModified: row.is_modified,
    submittedToCommunity: row.submitted_to_community,
    communityStatus: row.community_status,
    addedAt: row.added_at,
    modifiedAt: row.modified_at,
  }
}

export function rowToRating(row: CommunityRatingRow): CommunityRating {
  return {
    id: row.id,
    userId: row.user_id,
    communityItemId: row.community_item_id,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
