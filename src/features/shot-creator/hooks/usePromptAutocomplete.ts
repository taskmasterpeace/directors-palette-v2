/**
 * Hook for @reference autocomplete functionality
 * Handles trigger detection, filtering, keyboard navigation, and insertion
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import type {
  AutocompleteState,
  AutocompleteOption,
  ReferenceAutocompleteItem,
  CategoryAutocompleteItem,
  TriggerResult,
  ReferenceCategory
} from '../types/autocomplete.types'

const CATEGORY_OPTIONS: ReferenceCategory[] = ['people', 'places', 'props', 'layouts']

export function usePromptAutocomplete() {
  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    query: '',
    filteredItems: [],
    selectedIndex: 0,
    triggerPosition: 0
  })

  // Get all images from store
  const { images, getAllReferences, getImagesByReferences } = useUnifiedGalleryStore()

  /**
   * Detect if autocomplete should be triggered
   * Looks for @ followed by alphanumeric characters
   */
  const detectTrigger = useCallback((text: string, cursorPosition: number): TriggerResult => {
    // Get text before cursor
    const textBeforeCursor = text.slice(0, cursorPosition)

    // Find last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    // No @ found or @ is not right before cursor position
    if (lastAtIndex === -1) {
      return { shouldShow: false, query: '', triggerPosition: 0 }
    }

    // Get text between @ and cursor
    const queryText = textBeforeCursor.slice(lastAtIndex + 1)

    // Check if query contains invalid characters (space, newline, etc.)
    // Only allow letters, numbers, underscores, hyphens
    if (!/^[a-zA-Z0-9_-]*$/.test(queryText)) {
      return { shouldShow: false, query: '', triggerPosition: 0 }
    }

    return {
      shouldShow: true,
      query: queryText.toLowerCase(),
      triggerPosition: lastAtIndex
    }
  }, [])

  /**
   * Filter and build autocomplete options
   */
  const buildOptions = useCallback((query: string): AutocompleteOption[] => {
    const options: AutocompleteOption[] = []

    // 1. Add category options (@people, @places, etc.)
    CATEGORY_OPTIONS.forEach(category => {
      const categoryName = `@${category}`

      // Filter by query
      if (categoryName.toLowerCase().includes(query)) {
        // Count images in this category (would need to query reference library)
        // For now, we'll show all categories
        options.push({
          type: 'category',
          category,
          value: categoryName,
          label: `${categoryName} (random ${category})`,
          count: 0 // TODO: Get actual count from reference library
        } as CategoryAutocompleteItem)
      }
    })

    // 2. Add specific image references
    const allRefs = getAllReferences()

    allRefs.forEach(ref => {
      const refLower = ref.toLowerCase()

      // Filter by query
      if (refLower.includes(query)) {
        // Find the image with this reference
        const matchingImages = getImagesByReferences([ref])

        if (matchingImages.length > 0) {
          const image = matchingImages[0] // Use first match

          options.push({
            type: 'reference',
            value: ref,
            label: ref,
            image,
            thumbnailUrl: image.url
          } as ReferenceAutocompleteItem)
        }
      }
    })

    // Sort: categories first, then references alphabetically
    options.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'category' ? -1 : 1
      }
      return a.value.localeCompare(b.value)
    })

    return options
  }, [getAllReferences, getImagesByReferences])

  /**
   * Open autocomplete with query
   */
  const open = useCallback((query: string, triggerPosition: number) => {
    const filteredItems = buildOptions(query)

    setState({
      isOpen: true,
      query,
      filteredItems,
      selectedIndex: 0,
      triggerPosition
    })
  }, [buildOptions])

  /**
   * Close autocomplete
   */
  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      filteredItems: [],
      selectedIndex: 0
    }))
  }, [])

  /**
   * Update query and filter items
   */
  const updateQuery = useCallback((query: string) => {
    const filteredItems = buildOptions(query)

    setState(prev => ({
      ...prev,
      query,
      filteredItems,
      selectedIndex: 0 // Reset selection when filtering
    }))
  }, [buildOptions])

  /**
   * Navigate selection up
   */
  const selectPrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.max(0, prev.selectedIndex - 1)
    }))
  }, [])

  /**
   * Navigate selection down
   */
  const selectNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.min(prev.filteredItems.length - 1, prev.selectedIndex + 1)
    }))
  }, [])

  /**
   * Select specific index
   */
  const selectIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedIndex: index
    }))
  }, [])

  /**
   * Get currently selected item
   */
  const getSelectedItem = useCallback((): AutocompleteOption | null => {
    if (!state.isOpen || state.filteredItems.length === 0) {
      return null
    }
    return state.filteredItems[state.selectedIndex] || null
  }, [state])

  /**
   * Handle text input change
   */
  const handleTextChange = useCallback((text: string, cursorPosition: number) => {
    const trigger = detectTrigger(text, cursorPosition)

    if (trigger.shouldShow) {
      if (state.isOpen) {
        // Update existing autocomplete
        updateQuery(trigger.query)
      } else {
        // Open new autocomplete
        open(trigger.query, trigger.triggerPosition)
      }
    } else if (state.isOpen) {
      // Close if no longer valid
      close()
    }
  }, [state.isOpen, detectTrigger, open, updateQuery, close])

  /**
   * Insert selected item into text
   */
  const insertItem = useCallback((
    item: AutocompleteOption,
    text: string,
    cursorPosition: number
  ): { newText: string; newCursorPosition: number } => {
    // Calculate insertion point (start of @query)
    const insertStart = state.triggerPosition
    const insertEnd = cursorPosition

    // Build new text
    const before = text.slice(0, insertStart)
    const after = text.slice(insertEnd)
    const newText = before + item.value + ' ' + after // Add space after

    // Calculate new cursor position (after inserted text + space)
    const newCursorPosition = insertStart + item.value.length + 1

    return { newText, newCursorPosition }
  }, [state.triggerPosition])

  return {
    // State
    isOpen: state.isOpen,
    query: state.query,
    items: state.filteredItems,
    selectedIndex: state.selectedIndex,
    selectedItem: getSelectedItem(),

    // Actions
    open,
    close,
    updateQuery,
    selectPrevious,
    selectNext,
    selectIndex,
    handleTextChange,
    insertItem,
    detectTrigger
  }
}
