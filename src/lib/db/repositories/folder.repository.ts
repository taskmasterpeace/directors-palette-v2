import { SupabaseClient } from '@supabase/supabase-js';
import type { Database, RepositoryResult, RepositoryListResult } from '../types';
import { DatabaseErrorHandler } from '../error-handler';
import type { FolderRow } from '@/features/shot-creator/types/folder.types';

/**
 * Input type for creating a folder
 */
export interface FolderInsert {
  user_id: string;
  name: string;
  color?: string | null;
}

/**
 * Input type for updating a folder
 */
export interface FolderUpdate {
  name?: string;
  color?: string | null;
}

/**
 * Folder with image count for UI display
 */
export interface FolderWithImageCount extends FolderRow {
  image_count: number;
}

/**
 * Repository for folder database operations
 */
export class FolderRepository {
  constructor(private client: SupabaseClient<Database>) {}

  /**
   * Create a new folder
   */
  async create(data: FolderInsert): Promise<RepositoryResult<FolderRow>> {
    try {
      const { data: folder, error } = await this.client
        .from('folders')
        .insert(data)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: folder,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  /**
   * Get all folders for a user with image counts
   */
  async getFoldersByUser(userId: string): Promise<RepositoryListResult<FolderWithImageCount>> {
    try {
      // Get folders with image counts using a join
      const { data: folders, error } = await this.client
        .from('folders')
        .select(`
          *,
          image_count:gallery(count)
        `)
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) {
        return {
          data: [],
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      // Transform the data to include image count
      const foldersWithCount = (folders || []).map((folder) => ({
        id: folder.id,
        user_id: folder.user_id,
        name: folder.name,
        color: folder.color,
        created_at: folder.created_at,
        updated_at: folder.updated_at,
        image_count: (folder.image_count as unknown as Array<{ count: number }>)?.[0]?.count || 0,
      }));

      return {
        data: foldersWithCount,
        error: null,
      };
    } catch (error) {
      return {
        data: [],
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  /**
   * Get a single folder by ID
   */
  async getById(id: string): Promise<RepositoryResult<FolderRow>> {
    try {
      const { data: folder, error } = await this.client
        .from('folders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: folder,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  /**
   * Update a folder
   */
  async update(id: string, data: FolderUpdate): Promise<RepositoryResult<FolderRow>> {
    try {
      const { data: folder, error } = await this.client
        .from('folders')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: folder,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  /**
   * Delete a folder
   * Note: Images in this folder will have their folder_id set to NULL (ON DELETE SET NULL)
   */
  async delete(id: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: true,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  /**
   * Check if a folder name already exists for a user
   */
  async existsByName(userId: string, name: string, excludeId?: string): Promise<boolean> {
    try {
      let query = this.client
        .from('folders')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (which is what we want)
        console.error('Error checking folder name:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking folder name:', error);
      return false;
    }
  }

  /**
   * Count total folders for a user
   */
  async countByUser(userId: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error counting folders:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting folders:', error);
      return 0;
    }
  }

  /**
   * Move an image to a folder
   */
  async moveImageToFolder(imageId: string, folderId: string | null): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from('gallery')
        .update({ folder_id: folderId })
        .eq('id', imageId);

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: true,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }

  /**
   * Bulk move images to a folder
   */
  async bulkMoveToFolder(imageIds: string[], folderId: string | null): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from('gallery')
        .update({ folder_id: folderId })
        .in('id', imageIds);

      if (error) {
        return {
          data: null,
          error: DatabaseErrorHandler.handle(error).message,
        };
      }

      return {
        data: true,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: DatabaseErrorHandler.handle(error).message,
      };
    }
  }
}
