'use client'

import { useMemo } from 'react'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { useWildcardsBrowserStore } from '../store/wildcards-browser.store'
import { wildcardFilterService } from '../services/wildcard-filter.service'

/**
 * Filtering logic for wildcards in the sidebar using wildcardFilterService
 */
export function useWildcardFilters() {
  const { wildcards } = useWildCardStore()
  const { searchQuery } = useWildcardsBrowserStore()

  const filteredWildcards = useMemo(() => {
    let filtered = wildcards

    if (searchQuery) {
      filtered = wildcardFilterService.filterByQuery(filtered, searchQuery)
    }

    return filtered
  }, [wildcards, searchQuery])

  return {
    filteredWildcards,
    searchQuery
  }
}
