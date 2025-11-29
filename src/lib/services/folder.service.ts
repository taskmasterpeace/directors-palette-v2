/**
 * Folder Service
 * Handles folder CRUD operations with business logic and validation
 */

import { getClient } from '@/lib/db/client';
import { FolderRepository } from '@/lib/db/repositories/folder.repository';
import type {
  Folder,
  FolderWithCount,
  CreateFolderInput,
  UpdateFolderInput,
  FolderRow,
} from '@/features/shot-creator/types/folder.types';

interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Transform database folder row to app folder type
 */
function transformFolderRow(row: FolderRow): Folder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FolderService {
  /**
   * Get all folders for the current user with image counts
   */
  static async getUserFolders(): Promise<FolderWithCount[]> {
    try {
      const supabase = await getClient();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('User not authenticated, cannot load folders');
        return [];
      }

      const repository = new FolderRepository(supabase);
      const result = await repository.getFoldersByUser(user.id);

      if (result.error) {
        console.error('Error fetching folders:', result.error);
        return [];
      }

      // Transform to app types
      return result.data.map((folder) => ({
        id: folder.id,
        userId: folder.user_id,
        name: folder.name,
        color: folder.color || undefined,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at,
        imageCount: folder.image_count,
      }));
    } catch (error) {
      console.error('Failed to load folders:', error);
      return [];
    }
  }

  /**
   * Create a new folder with validation
   */
  static async createFolder(input: CreateFolderInput): Promise<ServiceResult<Folder>> {
    try {
      const supabase = await getClient();
      if (!supabase) {
        return { data: null, error: 'Supabase client not available' };
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Validate folder name
      const validation = this.validateFolderName(input.name);
      if (!validation.valid) {
        return { data: null, error: validation.error || 'Invalid folder name' };
      }

      const repository = new FolderRepository(supabase);

      // Check if name already exists
      const nameExists = await repository.existsByName(user.id, input.name.trim());
      if (nameExists) {
        return { data: null, error: 'A folder with this name already exists' };
      }

      // Check folder limit
      const folderCount = await repository.countByUser(user.id);
      if (folderCount >= 100) {
        return { data: null, error: 'Maximum folder limit (100) reached' };
      }

      // Create folder
      const result = await repository.create({
        user_id: user.id,
        name: input.name.trim(),
        color: input.color || null,
      });

      if (result.error || !result.data) {
        return { data: null, error: result.error || 'Failed to create folder' };
      }

      return {
        data: transformFolderRow(result.data),
        error: null,
      };
    } catch (error) {
      console.error('Failed to create folder:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update a folder
   */
  static async updateFolder(id: string, input: UpdateFolderInput): Promise<ServiceResult<Folder>> {
    try {
      const supabase = await getClient();
      if (!supabase) {
        return { data: null, error: 'Supabase client not available' };
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'User not authenticated' };
      }

      // Validate folder name if provided
      if (input.name !== undefined) {
        const validation = this.validateFolderName(input.name);
        if (!validation.valid) {
          return { data: null, error: validation.error || 'Invalid folder name' };
        }
      }

      const repository = new FolderRepository(supabase);

      // Check if new name already exists (excluding current folder)
      if (input.name) {
        const nameExists = await repository.existsByName(user.id, input.name.trim(), id);
        if (nameExists) {
          return { data: null, error: 'A folder with this name already exists' };
        }
      }

      // Prepare update data
      const updateData: { name?: string; color?: string | null } = {};
      if (input.name !== undefined) {
        updateData.name = input.name.trim();
      }
      if (input.color !== undefined) {
        updateData.color = input.color || null;
      }

      // Update folder
      const result = await repository.update(id, updateData);

      if (result.error || !result.data) {
        return { data: null, error: result.error || 'Failed to update folder' };
      }

      return {
        data: transformFolderRow(result.data),
        error: null,
      };
    } catch (error) {
      console.error('Failed to update folder:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete a folder
   * Images in this folder will become uncategorized
   */
  static async deleteFolder(id: string): Promise<ServiceResult<boolean>> {
    try {
      const supabase = await getClient();
      if (!supabase) {
        return { data: null, error: 'Supabase client not available' };
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: 'User not authenticated' };
      }

      const repository = new FolderRepository(supabase);
      const result = await repository.delete(id);

      if (result.error) {
        return { data: null, error: result.error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Failed to delete folder:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Move an image to a folder
   */
  static async moveImageToFolder(imageId: string, folderId: string | null): Promise<ServiceResult<boolean>> {
    try {
      const supabase = await getClient();
      if (!supabase) {
        return { data: null, error: 'Supabase client not available' };
      }

      const repository = new FolderRepository(supabase);
      const result = await repository.moveImageToFolder(imageId, folderId);

      if (result.error) {
        return { data: null, error: result.error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Failed to move image:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Bulk move images to a folder
   */
  static async bulkMoveToFolder(imageIds: string[], folderId: string | null): Promise<ServiceResult<boolean>> {
    try {
      const supabase = await getClient();
      if (!supabase) {
        return { data: null, error: 'Supabase client not available' };
      }

      if (imageIds.length === 0) {
        return { data: null, error: 'No images selected' };
      }

      const repository = new FolderRepository(supabase);
      const result = await repository.bulkMoveToFolder(imageIds, folderId);

      if (result.error) {
        return { data: null, error: result.error };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Failed to bulk move images:', error);
      return { data: null, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Validate folder name
   */
  private static validateFolderName(name: string): { valid: boolean; error?: string } {
    // Check if empty after trimming
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Folder name cannot be empty' };
    }

    // Check minimum length
    if (trimmed.length < 1) {
      return { valid: false, error: 'Folder name is too short' };
    }

    // Check maximum length
    if (trimmed.length > 50) {
      return { valid: false, error: 'Folder name is too long (max 50 characters)' };
    }

    // Check for reserved names
    const reservedNames = ['all', 'uncategorized', 'all images'];
    if (reservedNames.includes(trimmed.toLowerCase())) {
      return { valid: false, error: 'This folder name is reserved' };
    }

    return { valid: true };
  }
}
