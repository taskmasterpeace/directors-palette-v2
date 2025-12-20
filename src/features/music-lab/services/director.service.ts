/**
 * Director Service
 * Handles CRUD operations for user directors stored in Supabase
 */

import { getClient } from '@/lib/db/client'
import type { DirectorFingerprint } from '../types/director.types'

// Database director type (matches Supabase schema)
export interface DbUserDirector {
  id: string
  user_id: string
  community_item_id: string | null
  fingerprint: DirectorFingerprint
  name: string
  description: string | null
  is_modified: boolean
  avatar_url: string | null
  created_at: string
  modified_at: string
}

// App-facing user director type
export interface UserDirector {
  id: string
  userId: string
  communityItemId?: string
  fingerprint: DirectorFingerprint
  name: string
  description?: string
  isModified: boolean
  avatarUrl?: string
  createdAt: number
  modifiedAt: number
}

// Helper to get an untyped client for director tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDirectorClient(): Promise<any> {
  return await getClient()
}

// Convert database director to app format
function dbDirectorToUserDirector(db: DbUserDirector): UserDirector {
  return {
    id: db.id,
    userId: db.user_id,
    communityItemId: db.community_item_id || undefined,
    fingerprint: db.fingerprint,
    name: db.name,
    description: db.description || undefined,
    isModified: db.is_modified,
    avatarUrl: db.avatar_url || undefined,
    createdAt: new Date(db.created_at).getTime(),
    modifiedAt: new Date(db.modified_at).getTime(),
  }
}

class DirectorService {
  /**
   * Get all user directors
   */
  async getUserDirectors(userId: string): Promise<UserDirector[]> {
    const supabase = await getDirectorClient()
    if (!supabase) return []

    const { data, error } = await supabase
      .from('user_directors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user directors:', error)
      return []
    }

    return (data as DbUserDirector[]).map(dbDirectorToUserDirector)
  }

  /**
   * Get a single director by ID
   */
  async getDirector(directorId: string, userId: string): Promise<UserDirector | null> {
    const supabase = await getDirectorClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('user_directors')
      .select('*')
      .eq('id', directorId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching director:', error)
      return null
    }

    return dbDirectorToUserDirector(data as DbUserDirector)
  }

  /**
   * Add a new director (from community or custom)
   */
  async addDirector(
    userId: string,
    fingerprint: DirectorFingerprint,
    name: string,
    description?: string,
    communityItemId?: string
  ): Promise<UserDirector | null> {
    const supabase = await getDirectorClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('user_directors')
      .upsert({
        user_id: userId,
        fingerprint,
        name,
        description: description || null,
        community_item_id: communityItemId || null,
        is_modified: false,
      }, { onConflict: 'user_id,name' })
      .select()
      .single()

    if (error) {
      console.error('Error adding director:', error)
      return null
    }

    return dbDirectorToUserDirector(data as DbUserDirector)
  }

  /**
   * Update an existing director
   */
  async updateDirector(
    directorId: string,
    userId: string,
    updates: Partial<{
      fingerprint: DirectorFingerprint
      name: string
      description: string
      avatarUrl: string
    }>
  ): Promise<UserDirector | null> {
    const supabase = await getDirectorClient()
    if (!supabase) return null

    const updateData: Partial<DbUserDirector> = {
      modified_at: new Date().toISOString(),
      is_modified: true, // Mark as modified when user edits
    }

    if (updates.fingerprint) updateData.fingerprint = updates.fingerprint
    if (updates.name) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description || null
    if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl || null

    const { data, error } = await supabase
      .from('user_directors')
      .update(updateData)
      .eq('id', directorId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating director:', error)
      return null
    }

    return dbDirectorToUserDirector(data as DbUserDirector)
  }

  /**
   * Delete a director
   */
  async deleteDirector(directorId: string, userId: string): Promise<boolean> {
    const supabase = await getDirectorClient()
    if (!supabase) return false

    const { error } = await supabase
      .from('user_directors')
      .delete()
      .eq('id', directorId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting director:', error)
      return false
    }

    return true
  }
}

// Export singleton instance
export const directorService = new DirectorService()
