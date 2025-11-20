'use client'

import { useMemo } from 'react'
import { usePromptLibraryStore } from '../store/prompt-library-store'
import { promptLibraryService } from '../services/prompt-library.service'

/**
 * Filtering logic for prompt library using promptLibraryService
 */
export function usePromptFilters() {
  const { prompts, searchQuery, selectedCategory } = usePromptLibraryStore()

  const filteredPrompts = useMemo(() => {
    let filtered = prompts

    if (selectedCategory) {
      filtered = promptLibraryService.filterByCategory(filtered, selectedCategory)
    }

    if (searchQuery) {
      filtered = promptLibraryService.filterByQuery(filtered, searchQuery)
    }

    return filtered
  }, [prompts, searchQuery, selectedCategory])

  const quickAccessPrompts = useMemo(() => {
    return promptLibraryService.getQuickAccessPrompts(filteredPrompts)
  }, [filteredPrompts])

  return {
    filteredPrompts,
    quickAccessPrompts,
    searchQuery,
    selectedCategory
  }
}
