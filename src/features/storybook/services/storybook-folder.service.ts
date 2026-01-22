/**
 * Storybook Folder Service
 * Manages gallery folder organization for storybook projects
 *
 * Auto-creates and assigns folders for storybook assets:
 * - Style guides
 * - Character sheets
 * - Story pages
 * - Book covers
 */

import { getClient } from '@/lib/db/client'

export type StorybookAssetType =
  | 'style-guide'
  | 'character-sheet'
  | 'page'
  | 'cover'
  | 'cover-variation'
  | 'title-page'
  | 'back-cover'

export interface StorybookFolderMetadata {
  source: 'storybook'
  projectId: string
  projectTitle: string
  assetType: StorybookAssetType
  pageNumber?: number
  characterName?: string
}

/**
 * Get or create a folder for a storybook project
 * Folder name format: 📖 {Book Title}
 */
export async function getOrCreateStorybookFolder(
  userId: string,
  _projectId: string, // Reserved for future use with per-project folder metadata
  projectTitle: string
): Promise<string | null> {
  const supabase = await getClient()

  // Sanitize title for folder name
  const sanitizedTitle = projectTitle
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .trim()
    .substring(0, 50) // Limit length

  const folderName = `📖 ${sanitizedTitle || 'Untitled Book'}`

  // Check if folder already exists for this project
  // We use metadata to track project association
  const { data: existingFolders } = await supabase
    .from('folders')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', folderName)
    .limit(1)

  if (existingFolders && existingFolders.length > 0) {
    return existingFolders[0].id
  }

  // Create new folder for this project
  const { data: newFolder, error } = await supabase
    .from('folders')
    .insert({
      user_id: userId,
      name: folderName,
      color: '#F59E0B', // Amber color for storybook folders
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create storybook folder:', error)
    return null
  }

  return newFolder.id
}

/**
 * Build metadata object for a storybook gallery item
 */
export function buildStorybookMetadata(
  projectId: string,
  projectTitle: string,
  assetType: StorybookAssetType,
  options?: {
    pageNumber?: number
    characterName?: string
  }
): StorybookFolderMetadata {
  return {
    source: 'storybook',
    projectId,
    projectTitle,
    assetType,
    ...(options?.pageNumber !== undefined && { pageNumber: options.pageNumber }),
    ...(options?.characterName && { characterName: options.characterName }),
  }
}

/**
 * Update a gallery item to assign it to a storybook folder
 * Used when images are created without folder assignment
 */
export async function assignToStorybookFolder(
  galleryItemId: string,
  folderId: string,
  metadata: StorybookFolderMetadata
): Promise<boolean> {
  const supabase = await getClient()

  // Cast metadata to JSON-compatible type for Supabase
  const metadataJson = JSON.parse(JSON.stringify(metadata))

  const { error } = await supabase
    .from('gallery')
    .update({
      folder_id: folderId,
      metadata: metadataJson,
    })
    .eq('id', galleryItemId)

  if (error) {
    console.error('Failed to assign gallery item to storybook folder:', error)
    return false
  }

  return true
}

/**
 * Get all gallery items for a storybook project
 */
export async function getStorybookGalleryItems(
  userId: string,
  projectId: string
): Promise<Array<{ id: string; public_url: string | null; metadata: StorybookFolderMetadata }>> {
  const supabase = await getClient()

  const { data, error } = await supabase
    .from('gallery')
    .select('id, public_url, metadata')
    .eq('user_id', userId)
    .contains('metadata', { source: 'storybook', projectId })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to get storybook gallery items:', error)
    return []
  }

  // Cast through unknown since Supabase returns Json type for metadata
  return (data as unknown) as Array<{ id: string; public_url: string | null; metadata: StorybookFolderMetadata }>
}
