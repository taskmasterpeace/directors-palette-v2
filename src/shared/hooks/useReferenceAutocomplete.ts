'use client'

/**
 * Shared hook for @reference autocomplete functionality.
 * Decoupled from shot-creator stores — accepts reference sources as parameters.
 */

import { useState, useCallback } from 'react'

export interface ReferenceAutocompleteImage {
  url: string
  id?: string
}

export interface ReferenceAutocompleteOption {
  type: 'reference' | 'category'
  value: string   // e.g. "@hero", "@people"
  label: string
  imageUrl?: string
  category?: string
}

interface AutocompleteState {
  isOpen: boolean
  query: string
  filteredItems: ReferenceAutocompleteOption[]
  selectedIndex: number
  triggerPosition: number
}

const CATEGORY_OPTIONS = ['people', 'places', 'props', 'layouts'] as const

interface UseReferenceAutocompleteOptions {
  /** Return all available reference tag names (e.g. ['@hero', '@villain']) */
  getAllReferences: () => string[]
  /** Return image URL for a given reference tag */
  getImageUrl: (ref: string) => string | undefined
}

export function useReferenceAutocomplete({
  getAllReferences,
  getImageUrl,
}: UseReferenceAutocompleteOptions) {
  const [state, setState] = useState<AutocompleteState>({
    isOpen: false,
    query: '',
    filteredItems: [],
    selectedIndex: 0,
    triggerPosition: 0,
  })

  const detectTrigger = useCallback((text: string, cursorPosition: number) => {
    const textBeforeCursor = text.slice(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) {
      return { shouldShow: false, query: '', triggerPosition: 0 }
    }

    const queryText = textBeforeCursor.slice(lastAtIndex + 1)
    if (!/^[a-zA-Z0-9_-]*$/.test(queryText)) {
      return { shouldShow: false, query: '', triggerPosition: 0 }
    }

    return { shouldShow: true, query: queryText.toLowerCase(), triggerPosition: lastAtIndex }
  }, [])

  const buildOptions = useCallback((query: string): ReferenceAutocompleteOption[] => {
    const options: ReferenceAutocompleteOption[] = []

    // Category options
    for (const cat of CATEGORY_OPTIONS) {
      if (`@${cat}`.includes(query) || cat.includes(query)) {
        options.push({
          type: 'category',
          value: `@${cat}`,
          label: `@${cat} (random ${cat})`,
          category: cat,
        })
      }
    }

    // Specific references
    const allRefs = getAllReferences()
    for (const ref of allRefs) {
      if (ref.toLowerCase().includes(query)) {
        const imageUrl = getImageUrl(ref)
        options.push({
          type: 'reference',
          value: ref,
          label: ref,
          imageUrl,
        })
      }
    }

    // Sort: categories first, then references alphabetically
    options.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'category' ? -1 : 1
      return a.value.localeCompare(b.value)
    })

    return options
  }, [getAllReferences, getImageUrl])

  const open = useCallback((query: string, triggerPosition: number) => {
    setState({
      isOpen: true,
      query,
      filteredItems: buildOptions(query),
      selectedIndex: 0,
      triggerPosition,
    })
  }, [buildOptions])

  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, filteredItems: [], selectedIndex: 0 }))
  }, [])

  const updateQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      query,
      filteredItems: buildOptions(query),
      selectedIndex: 0,
    }))
  }, [buildOptions])

  const selectPrevious = useCallback(() => {
    setState(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }))
  }, [])

  const selectNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.min(prev.filteredItems.length - 1, prev.selectedIndex + 1),
    }))
  }, [])

  const handleTextChange = useCallback((text: string, cursorPosition: number) => {
    const trigger = detectTrigger(text, cursorPosition)
    if (trigger.shouldShow) {
      if (state.isOpen) updateQuery(trigger.query)
      else open(trigger.query, trigger.triggerPosition)
    } else if (state.isOpen) {
      close()
    }
  }, [state.isOpen, detectTrigger, open, updateQuery, close])

  const insertItem = useCallback((
    item: ReferenceAutocompleteOption,
    text: string,
    cursorPosition: number,
  ): { newText: string; newCursorPosition: number } => {
    const insertStart = state.triggerPosition
    const insertEnd = cursorPosition
    const before = text.slice(0, insertStart)
    const after = text.slice(insertEnd)
    const newText = before + item.value + ' ' + after
    const newCursorPosition = insertStart + item.value.length + 1
    return { newText, newCursorPosition }
  }, [state.triggerPosition])

  return {
    isOpen: state.isOpen,
    query: state.query,
    items: state.filteredItems,
    selectedIndex: state.selectedIndex,
    open,
    close,
    updateQuery,
    selectPrevious,
    selectNext,
    handleTextChange,
    insertItem,
    detectTrigger,
  }
}
