'use client'

import { useState, useCallback, useMemo } from 'react'

/**
 * Multi-select state management for prompt library using Set
 */
export function usePromptSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const selectAll = useCallback((promptIds: string[]) => {
    setSelectedIds(new Set(promptIds))
  }, [])

  const selectNone = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((promptId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(promptId)) {
        next.delete(promptId)
      } else {
        next.add(promptId)
      }
      return next
    })
  }, [])

  const isSelected = useCallback((promptId: string) => {
    return selectedIds.has(promptId)
  }, [selectedIds])

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds])

  return { selectedIds, selectedCount, selectAll, selectNone, toggleSelect, isSelected }
}
