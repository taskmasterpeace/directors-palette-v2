/**
 * Folder type definitions for gallery organization
 */

/**
 * Core folder interface
 */
export interface Folder {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Folder with image count for UI display
 */
export interface FolderWithCount extends Folder {
  imageCount: number;
}

/**
 * Input type for creating a new folder
 */
export interface CreateFolderInput {
  name: string;
  color?: string;
}

/**
 * Input type for updating an existing folder
 */
export interface UpdateFolderInput {
  name?: string;
  color?: string;
}

/**
 * Database row type for folders table
 */
export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Predefined color options for folders
 */
export const FOLDER_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
] as const;

/**
 * Special folder IDs for system folders
 */
export const SPECIAL_FOLDERS = {
  ALL: 'all-images',
  UNCATEGORIZED: 'uncategorized',
} as const;

/**
 * Validation constants
 */
export const FOLDER_VALIDATION = {
  MAX_NAME_LENGTH: 50,
  MIN_NAME_LENGTH: 1,
  MAX_FOLDERS_PER_USER: 100,
  RESERVED_NAMES: ['all', 'uncategorized', 'all images'],
} as const;
