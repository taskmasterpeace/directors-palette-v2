'use client'

import { useState, useCallback, useMemo, useRef } from 'react'

/**
 * Extracts the ID from an item. Supports objects with 'id' property or string IDs directly.
 */
function getItemId(item: { id: string } | string): string {
  return typeof item === 'string' ? item : item.id
}

/**
 * Multi-select state management for gallery images using Set
 * Extends the usePromptSelection pattern with additional features:
 * - Set-based selectedIds tracking
 * - lastSelectedId ref for range selection support
 * - selectAll/selectNone/toggleSelect callbacks
 * - isSelected helper
 * - handleSelectWithModifiers for modifier-key selection:
 *   - Ctrl+click (Windows) or Cmd+click (Mac): Toggle individual item
 *   - Shift+click: Range selection between last selected and current item
 */
export function useGallerySelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Track last selected item for range selection (Shift+click)
  const lastSelectedIdRef = useRef<string | null>(null)

  const selectAll = useCallback((imageIds: string[]) => {
    setSelectedIds(new Set(imageIds))
    // Update last selected to the last item in the list
    if (imageIds.length > 0) {
      lastSelectedIdRef.current = imageIds[imageIds.length - 1]
    }
  }, [])

  const selectNone = useCallback(() => {
    setSelectedIds(new Set())
    lastSelectedIdRef.current = null
  }, [])

  const toggleSelect = useCallback((imageId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(imageId)) {
        next.delete(imageId)
      } else {
        next.add(imageId)
      }
      return next
    })
    // Update last selected for subsequent range selections
    lastSelectedIdRef.current = imageId
  }, [])

  const isSelected = useCallback((imageId: string) => {
    return selectedIds.has(imageId)
  }, [selectedIds])

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])

  // Getter for last selected ID (for range selection logic)
  const getLastSelectedId = useCallback(() => {
    return lastSelectedIdRef.current
  }, [])

  // Setter for last selected ID (used after range selection)
  const setLastSelectedId = useCallback((id: string | null) => {
    lastSelectedIdRef.current = id
  }, [])

  // Add multiple items to selection (used by range selection)
  const addToSelection = useCallback((imageIds: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      imageIds.forEach(id => next.add(id))
      return next
    })
  }, [])

  /**
   * Handle selection with modifier keys.
   * - Ctrl+click (Windows) or Cmd+click (Mac): Toggle individual item selection
   * - Shift+click: Range selection between last selected and current item
   * - Regular click: Toggle selection (fallback if no modifiers or no previous selection)
   *
   * @param itemId - The ID of the clicked item
   * @param orderedItems - The full ordered list of items (can be objects with 'id' or strings)
   * @param event - The mouse event to detect modifier keys
   */
  const handleSelectWithModifiers = useCallback((
    itemId: string,
    orderedItems: ({ id: string } | string)[],
    event: React.MouseEvent
  ) => {
    const lastSelectedId = lastSelectedIdRef.current

    // Check for Ctrl (Windows) or Cmd (Mac) key for explicit toggle
    // metaKey is Cmd on Mac, ctrlKey is Ctrl on Windows/Linux
    const isToggleModifier = event.ctrlKey || event.metaKey

    // Handle Ctrl/Cmd+click for explicit toggle selection
    // This takes priority over Shift+click (works independently of Shift key)
    if (isToggleModifier) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(itemId)) {
          next.delete(itemId)
        } else {
          next.add(itemId)
        }
        return next
      })
      // Update last selected for subsequent range selections
      lastSelectedIdRef.current = itemId
      return
    }

    // Handle Shift+click for range selection
    if (event.shiftKey && lastSelectedId !== null) {
      // Find indices of last selected and current item
      const orderedIds = orderedItems.map(getItemId)
      const lastIndex = orderedIds.indexOf(lastSelectedId)
      const currentIndex = orderedIds.indexOf(itemId)

      // If both items are found in the list, select the range
      if (lastIndex !== -1 && currentIndex !== -1) {
        // Determine start and end indices (works in both directions)
        const startIndex = Math.min(lastIndex, currentIndex)
        const endIndex = Math.max(lastIndex, currentIndex)

        // Get all IDs in the range
        const rangeIds = orderedIds.slice(startIndex, endIndex + 1)

        // Add all items in range to selection (doesn't replace existing selection)
        setSelectedIds(prev => {
          const next = new Set(prev)
          rangeIds.forEach(id => next.add(id))
          return next
        })

        // Update last selected to the clicked item for subsequent range selections
        lastSelectedIdRef.current = itemId
        return
      }
    }

    // Fallback: If no modifier keys, no previous selection, or items not found,
    // behave like regular toggle selection
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
    lastSelectedIdRef.current = itemId
  }, [])

  return {
    selectedIds,
    selectedCount,
    selectAll,
    selectNone,
    toggleSelect,
    isSelected,
    getLastSelectedId,
    setLastSelectedId,
    addToSelection,
    handleSelectWithModifiers
  }
}
