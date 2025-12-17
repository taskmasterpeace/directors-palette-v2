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
} from '../types/community.types'

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
        console.error('Error fetching community items:', JSON.stringify(error, null, 2))
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
      console.error('Error fetching community item:', error)
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
      console.error('Error submitting community item:', error)
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
      console.error('Error fetching user submissions:', error)
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

    // Upsert - overwrite if exists with same name
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
      console.error('Error adding to library:', error)
      throw error
    }

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
      console.error('Error checking library:', error)
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
      console.error('Error fetching library items:', error)
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
        console.error('Error fetching library item IDs:', error)
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
      console.error('Error removing from library:', error)
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
      console.error('Error rating item:', error)
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
      console.error('Error fetching user rating:', error)
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
        console.error('Error fetching user ratings:', error)
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
      console.error('Error deleting rating:', error)
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
      console.error('Error fetching pending submissions:', error)
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
      console.error('Error approving submission:', error)
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
      console.error('Error rejecting submission:', error)
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
      console.error('Error editing submission:', error)
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
      console.error('Error deleting item:', error)
      throw error
    }
  }
}

export const communityService = new CommunityService()
