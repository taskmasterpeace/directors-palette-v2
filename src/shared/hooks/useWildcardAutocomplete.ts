'use client'

import { useState, useCallback, useEffect, useMemo, type RefObject } from 'react'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import type { WildCard } from '@/features/shot-creator/helpers/wildcard/parser'

interface WildcardGroup {
  category: string
  wildcards: WildCard[]
}

interface UseWildcardAutocompleteOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (value: string) => void
}

export function useWildcardAutocomplete({ textareaRef, value, onChange }: UseWildcardAutocompleteOptions) {
  const { wildcards, isLoading, loadWildCards } = useWildCardStore()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [triggerPos, setTriggerPos] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Load wildcards on mount if empty
  useEffect(() => {
    if (wildcards.length === 0 && !isLoading) {
      void loadWildCards()
    }
  }, [wildcards.length, isLoading, loadWildCards])

  // Filter and group wildcards by category
  const filteredGroups: WildcardGroup[] = useMemo(() => {
    const lowerQuery = query.toLowerCase()
    const filtered = wildcards.filter((wc) =>
      wc.name.toLowerCase().includes(lowerQuery)
    )

    // Group by category
    const groups: Record<string, WildCard[]> = {}
    for (const wc of filtered) {
      const cat = wc.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(wc)
    }

    // Sort categories alphabetically, sort wildcards within each
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, wcs]) => ({
        category,
        wildcards: wcs.sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [wildcards, query])

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    return filteredGroups.flatMap((g) => g.wildcards)
  }, [filteredGroups])

  // Detect trigger: _ preceded by whitespace or at position 0
  const detectTrigger = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const text = value.substring(0, cursorPos)

    // Scan backwards to find the trigger _
    let underscorePos = -1
    for (let i = text.length - 1; i >= 0; i--) {
      const ch = text[i]
      // Stop scanning if we hit whitespace — check if char before it was the trigger
      if (ch === ' ' || ch === '\n' || ch === '\t') {
        break
      }
      if (ch === '_' && (i === 0 || /\s/.test(text[i - 1]))) {
        underscorePos = i
        break
      }
    }

    if (underscorePos === -1) {
      if (isOpen) {
        setIsOpen(false)
        setQuery('')
        setTriggerPos(-1)
      }
      return
    }

    const q = text.substring(underscorePos + 1)
    // Don't open if the query contains spaces (user moved past the wildcard)
    if (q.includes(' ')) {
      if (isOpen) {
        setIsOpen(false)
        setQuery('')
        setTriggerPos(-1)
      }
      return
    }

    setTriggerPos(underscorePos)
    setQuery(q)
    setIsOpen(true)
    setSelectedIndex(0)
  }, [value, textareaRef, isOpen])

  // Select a wildcard and insert into prompt
  const selectWildcard = useCallback((name: string) => {
    const textarea = textareaRef.current
    if (!textarea || triggerPos === -1) return

    const cursorPos = textarea.selectionStart
    const before = value.substring(0, triggerPos)
    const after = value.substring(cursorPos)
    const insertion = `_${name}_ `
    const newValue = before + insertion + after

    onChange(newValue)
    setIsOpen(false)
    setQuery('')
    setTriggerPos(-1)

    // Set cursor after insertion
    const newPos = triggerPos + insertion.length
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }, [value, onChange, textareaRef, triggerPos])

  // Close the dropdown
  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setTriggerPos(-1)
  }, [])

  // Keyboard handler — call this from onKeyDown
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || flatItems.length === 0) return false

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0))
      return true
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
      return true
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (flatItems[selectedIndex]) {
        e.preventDefault()
        selectWildcard(flatItems[selectedIndex].name)
        return true
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return true
    }
    return false
  }, [isOpen, flatItems, selectedIndex, selectWildcard, close])

  // Close on blur
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleBlur = () => {
      // Delay to allow click events on dropdown to fire first
      setTimeout(() => close(), 150)
    }
    textarea.addEventListener('blur', handleBlur)
    return () => textarea.removeEventListener('blur', handleBlur)
  }, [textareaRef, close])

  // Auto-close when no matches
  useEffect(() => {
    if (isOpen && query.length > 0 && flatItems.length === 0) {
      close()
    }
  }, [isOpen, query, flatItems.length, close])

  return {
    isOpen,
    query,
    filteredGroups,
    flatItems,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    detectTrigger,
    selectWildcard,
    close,
  }
}
