import { useState } from 'react'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import type { Folder, CreateFolderInput, UpdateFolderInput } from '../types/folder.types'
import { toast } from '@/hooks/use-toast'

export type FolderModalMode = 'create' | 'edit' | 'delete' | null

interface UseFolderManagerReturn {
  // Modal state
  modalMode: FolderModalMode
  selectedFolder: Folder | undefined

  // Modal actions
  openCreateModal: () => void
  openEditModal: (folder: Folder) => void
  openDeleteModal: (folder: Folder) => void
  closeModal: () => void

  // CRUD operations
  handleCreateFolder: (name: string, color?: string) => Promise<{ success: boolean; error?: string }>
  handleUpdateFolder: (id: string, name: string, color?: string) => Promise<{ success: boolean; error?: string }>
  handleDeleteFolder: (id: string) => Promise<{ success: boolean; error?: string }>
  handleMoveImages: (imageIds: string[], folderId: string | null) => Promise<{ success: boolean; error?: string }>
}

/**
 * Hook for managing folder operations and modal state
 */
export function useFolderManager(): UseFolderManagerReturn {
  const [modalMode, setModalMode] = useState<FolderModalMode>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | undefined>()

  const { createFolder, updateFolder, deleteFolder, moveImagesToFolder } = useUnifiedGalleryStore()

  // Modal actions
  const openCreateModal = () => {
    setSelectedFolder(undefined)
    setModalMode('create')
  }

  const openEditModal = (folder: Folder) => {
    setSelectedFolder(folder)
    setModalMode('edit')
  }

  const openDeleteModal = (folder: Folder) => {
    setSelectedFolder(folder)
    setModalMode('delete')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedFolder(undefined)
  }

  // CRUD operations with error handling and user feedback
  const handleCreateFolder = async (name: string, color?: string): Promise<{ success: boolean; error?: string }> => {
    const input: CreateFolderInput = { name, color }
    const result = await createFolder(input)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to create folder',
        variant: 'destructive',
      })
    }

    return result
  }

  const handleUpdateFolder = async (id: string, name: string, color?: string): Promise<{ success: boolean; error?: string }> => {
    const input: UpdateFolderInput = { name, color }
    const result = await updateFolder(id, input)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to update folder',
        variant: 'destructive',
      })
    }

    return result
  }

  const handleDeleteFolder = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await deleteFolder(id)

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete folder',
        variant: 'destructive',
      })
    }

    return result
  }

  const handleMoveImages = async (imageIds: string[], folderId: string | null): Promise<{ success: boolean; error?: string }> => {
    const result = await moveImagesToFolder(imageIds, folderId)

    if (result.success) {
      const folderName = folderId
        ? useUnifiedGalleryStore.getState().folders.find(f => f.id === folderId)?.name
        : 'Uncategorized'

      toast({
        title: 'Success',
        description: `Moved ${imageIds.length} image${imageIds.length > 1 ? 's' : ''} to ${folderName}`,
      })
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to move images',
        variant: 'destructive',
      })
    }

    return result
  }

  return {
    // Modal state
    modalMode,
    selectedFolder,

    // Modal actions
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModal,

    // CRUD operations
    handleCreateFolder,
    handleUpdateFolder,
    handleDeleteFolder,
    handleMoveImages,
  }
}
