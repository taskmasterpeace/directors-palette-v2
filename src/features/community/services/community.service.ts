/**
 * Community Service
 * Handles all community-related database operations
 */

import { createBrowserClient } from '@supabase/ssr'
import type {
  CommunityItem,
  CommunityItemRow,
  CommunityItemType,
  CommunityFilters,
  SubmitItemRequest,
  UserLibraryItem,
  UserLibraryItemRow,
  RecipeContent,
  WildcardContent,
  DirectorContent,
} from '../types/community.types'
import { createLogger } from '@/lib/logger'


const log = createLogger('Community')
function getSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

class CommunityService {
  private get supabase() {
    return getSupabaseClient()
  }

  // ==========================================================================
  // COMMUNITY ITEMS
  // ==========================================================================

  /**
   * Get approved community items with optional filters
   */
  async getApprovedItems(filters?: CommunityFilters): Promise<CommunityItem[]> {
    let query = this.supabase
      .from('community_items')
      .select('*')
      .eq('status', 'approved')

    // Filter by type
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }

    // Filter by category
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    // Search by name or description
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Sort
    switch (filters?.sortBy) {
      case 'popular':
        query = query.order('add_count', { ascending: false })
        break
      case 'rating':
        // Sort by average rating (rating_sum / rating_count), handle division by zero
        query = query.order('rating_count', { ascending: false })
        break
      case 'newest':
        query = query.order('approved_at', { ascending: false })
        break
      case 'alphabetical':
        query = query.order('name', { ascending: true })
        break
      default:
        query = query.order('add_count', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      // Schema cache errors are expected when tables haven't been loaded yet
      const isSchemaError = error.code === 'PGRST205' || error.message?.includes('schema cache')
      if (!isSchemaError) {
        log.error('Error fetching community items', { detail: JSON.stringify(error, null, 2) })
      }
      const errorMessage = error.message || error.code || 'Unknown database error'
      throw new Error(errorMessage)
    }

    return (data as CommunityItemRow[]).map(row => ({
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
    }))
  }

  /**
   * Get a single community item by ID
   */
  async getItemById(id: string): Promise<CommunityItem | null> {
    const { data, error } = await this.supabase
      .from('community_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      log.error('Error fetching community item', { error: error })
      throw error
    }

    const row = data as CommunityItemRow
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

  /**
   * Submit a new item to community (pending review)
   */
  async submitItem(request: SubmitItemRequest, userId: string, userName: string): Promise<CommunityItem> {
    const { data, error } = await this.supabase
      .from('community_items')
      .insert({
        type: request.type,
        name: request.name,
        description: request.description || null,
        category: request.category,
        tags: request.tags || [],
        content: request.content,
        submitted_by: userId,
        submitted_by_name: userName,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      log.error('Error submitting community item', { error: error })
      throw error
    }

    const row = data as CommunityItemRow
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
      isFeatured: row.is_featured || false,
      averageRating: 0,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  /**
   * Get user's pending submissions
   */
  async getUserSubmissions(userId: string): Promise<CommunityItem[]> {
    const { data, error } = await this.supabase
      .from('community_items')
      .select('*')
      .eq('submitted_by', userId)
      .order('submitted_at', { ascending: false })

    if (error) {
      log.error('Error fetching user submissions', { error: error })
      throw error
    }

    return (data as CommunityItemRow[]).map(row => ({
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
    }))
  }

  // ==========================================================================
  // USER LIBRARY
  // ==========================================================================

  /**
   * Add a community item to user's library
   */
  async addToLibrary(communityItemId: string, userId: string): Promise<UserLibraryItem> {
    // Get the community item first
    const item = await this.getItemById(communityItemId)
    if (!item) {
      throw new Error('Community item not found')
    }

    // Upsert to user_library_items - overwrite if exists with same name
    const { data, error } = await this.supabase
      .from('user_library_items')
      .upsert({
        user_id: userId,
        community_item_id: communityItemId,
        type: item.type,
        name: item.name,
        content: item.content,
        is_modified: false,
        submitted_to_community: false,
        community_status: null,
      }, {
        onConflict: 'user_id,type,name',
      })
      .select()
      .single()

    if (error) {
      log.error('Error adding to library', { error: error })
      throw error
    }

    // =========================================================================
    // TYPE-SPECIFIC TABLE WRITES
    // Each type needs to be written to its specific table so it appears in UI
    // =========================================================================

    // RECIPES: Also add to user_recipes table so they appear in Shot Creator
    if (item.type === 'recipe') {
      const recipeContent = item.content as RecipeContent

      const recipeData = {
        user_id: userId,
        name: item.name,
        description: item.description || null,
        recipe_note: recipeContent.recipeNote || null,
        stages: recipeContent.stages.map((stage, index) => ({
          id: stage.id || `stage_${index}_${Date.now()}`,
          order: stage.order ?? index,
          template: stage.template,
          fields: [], // Fields are parsed on read, not stored
          referenceImages: stage.referenceImages || [],
        })),
        suggested_aspect_ratio: recipeContent.suggestedAspectRatio || null,
        suggested_resolution: null,
        quick_access_label: null,
        is_quick_access: false,
        category_id: item.category || null,
        is_system: false,
      }

      const { error: recipeError } = await this.supabase
        .from('user_recipes')
        .upsert(recipeData, {
          onConflict: 'user_id,name',
          ignoreDuplicates: false,
        })

      if (recipeError) {
        log.error('Error adding recipe to user_recipes', { recipeError: recipeError })
      }
    }

    // WILDCARDS: Also add to wildcards table so they appear in Wildcard Manager
    if (item.type === 'wildcard') {
      const wildcardContent = item.content as WildcardContent

      const wildcardData = {
        user_id: userId,
        name: item.name,
        entries: wildcardContent.entries,
        is_shared: false,
      }

      const { error: wildcardError } = await this.supabase
        .from('wildcards')
        .upsert(wildcardData, {
          onConflict: 'user_id,name',
          ignoreDuplicates: false,
        })

      if (wildcardError) {
        log.error('Error adding wildcard to wildcards table', { wildcardError: wildcardError })
      }
    }

    // DIRECTORS: Also add to user_directors table so they appear in Music Lab
    if (item.type === 'director') {
      const directorContent = item.content as DirectorContent

      const directorData = {
        user_id: userId,
        name: item.name,
        description: item.description || null,
        fingerprint: directorContent.fingerprint,
        community_item_id: communityItemId,
        is_modified: false,
        avatar_url: directorContent.avatarUrl || null,
      }

      const { error: directorError } = await this.supabase
        .from('user_directors')
        .upsert(directorData, {
          onConflict: 'user_id,name',
          ignoreDuplicates: false,
        })

      if (directorError) {
        log.error('Error adding director to user_directors table', { directorError: directorError })
      }
    }

    // PROMPTS: For prompts, we don't have a separate table yet
    // They use user_settings.config.prompt_library (JSON settings)
    // TODO: Consider creating a user_prompts table for consistency

    const row = data as UserLibraryItemRow
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

  /**
   * Check if user has item in library
   */
  async isInLibrary(communityItemId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_library_items')
      .select('id')
      .eq('community_item_id', communityItemId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      log.error('Error checking library', { error: error })
      return false
    }

    return !!data
  }

  /**
   * Get items in user's library by type
   */
  async getLibraryItems(userId: string, type?: CommunityItemType): Promise<UserLibraryItem[]> {
    let query = this.supabase
      .from('user_library_items')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      log.error('Error fetching library items', { error: error })
      throw error
    }

    return (data as UserLibraryItemRow[]).map(row => ({
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
    }))
  }

  /**
   * Get all community item IDs that user has in library
   */
  async getLibraryItemIds(userId: string): Promise<Set<string>> {
    const { data, error } = await this.supabase
      .from('user_library_items')
      .select('community_item_id')
      .eq('user_id', userId)
      .not('community_item_id', 'is', null)

    if (error) {
      // Silent fail for schema cache errors - these are expected when tables aren't loaded
      const isSchemaError = error.code === 'PGRST205' || error.message?.includes('schema cache')
      if (!isSchemaError) {
        log.error('Error fetching library item IDs', { error: error })
      }
      return new Set()
    }

    return new Set(data.map(row => row.community_item_id as string))
  }

  /**
   * Remove item from user's library
   */
  async removeFromLibrary(itemId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_library_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)

    if (error) {
      log.error('Error removing from library', { error: error })
      throw error
    }
  }

  // ==========================================================================
  // RATINGS
  // ==========================================================================

  /**
   * Rate a community item
   */
  async rateItem(communityItemId: string, userId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    const { error } = await this.supabase
      .from('community_ratings')
      .upsert({
        user_id: userId,
        community_item_id: communityItemId,
        rating,
      }, {
        onConflict: 'user_id,community_item_id',
      })

    if (error) {
      log.error('Error rating item', { error: error })
      throw error
    }
  }

  /**
   * Get user's rating for an item
   */
  async getUserRating(communityItemId: string, userId: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('community_ratings')
      .select('rating')
      .eq('community_item_id', communityItemId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      log.error('Error fetching user rating', { error: error })
      return null
    }

    return data?.rating || null
  }

  /**
   * Get all user's ratings
   */
  async getUserRatings(userId: string): Promise<Map<string, number>> {
    const { data, error } = await this.supabase
      .from('community_ratings')
      .select('community_item_id, rating')
      .eq('user_id', userId)

    if (error) {
      // Silent fail for schema cache errors
      const isSchemaError = error.code === 'PGRST205' || error.message?.includes('schema cache')
      if (!isSchemaError) {
        log.error('Error fetching user ratings', { error: error })
      }
      return new Map()
    }

    const ratings = new Map<string, number>()
    data.forEach(row => {
      ratings.set(row.community_item_id, row.rating)
    })
    return ratings
  }

  /**
   * Delete user's rating for an item
   */
  async deleteRating(communityItemId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('community_ratings')
      .delete()
      .eq('community_item_id', communityItemId)
      .eq('user_id', userId)

    if (error) {
      log.error('Error deleting rating', { error: error })
      throw error
    }
  }

  // ==========================================================================
  // ADMIN FUNCTIONS
  // ==========================================================================

  /**
   * Get pending submissions (admin only)
   */
  async getPendingSubmissions(): Promise<CommunityItem[]> {
    const { data, error } = await this.supabase
      .from('community_items')
      .select('*')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })

    if (error) {
      log.error('Error fetching pending submissions', { error: error })
      throw error
    }

    return (data as CommunityItemRow[]).map(row => ({
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
      isFeatured: row.is_featured || false,
      averageRating: 0,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  }

  /**
   * Approve a submission (admin only)
   */
  async approveSubmission(itemId: string, adminUserId: string): Promise<void> {
    const { error } = await this.supabase
      .from('community_items')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', itemId)

    if (error) {
      log.error('Error approving submission', { error: error })
      throw error
    }
  }

  /**
   * Reject a submission (admin only)
   */
  async rejectSubmission(itemId: string, adminUserId: string, reason?: string): Promise<void> {
    const { error } = await this.supabase
      .from('community_items')
      .update({
        status: 'rejected',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        rejected_reason: reason || null,
      })
      .eq('id', itemId)

    if (error) {
      log.error('Error rejecting submission', { error: error })
      throw error
    }
  }

  /**
   * Edit a submission (admin only)
   */
  async editSubmission(
    itemId: string,
    updates: Partial<Pick<CommunityItem, 'name' | 'description' | 'category' | 'tags' | 'content'>>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('community_items')
      .update({
        name: updates.name,
        description: updates.description,
        category: updates.category,
        tags: updates.tags,
        content: updates.content,
      })
      .eq('id', itemId)

    if (error) {
      log.error('Error editing submission', { error: error })
      throw error
    }
  }

  /**
   * Delete a community item (admin only)
   */
  async deleteItem(itemId: string): Promise<void> {
    const { error } = await this.supabase
      .from('community_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      log.error('Error deleting item', { error: error })
      throw error
    }
  }
}

export const communityService = new CommunityService()
