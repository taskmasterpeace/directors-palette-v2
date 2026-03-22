'use client'

import { useRef, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/utils'
import { useReferenceAutocomplete, type ReferenceAutocompleteOption } from '@/shared/hooks/useReferenceAutocomplete'
import { ReferenceAutocomplete } from '@/shared/components/ReferenceAutocomplete'
import { useUnifiedGalleryStore } from '../../store/unified-gallery-store'
import { useRecipeStore } from '../../store/recipe.store'

interface RecipeTextFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  isMissing: boolean
}

export function RecipeTextField({
  value,
  onChange,
  placeholder,
  isMissing,
}: RecipeTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { setRecipeReferenceImage } = useRecipeStore()
  const { getAllReferences, getImagesByReferences } = useUnifiedGalleryStore()

  const getImageUrl = useCallback((ref: string) => {
    const images = getImagesByReferences([ref])
    return images[0]?.url
  }, [getImagesByReferences])

  const autocomplete = useReferenceAutocomplete({
    getAllReferences,
    getImageUrl,
  })

  const handleSelect = (item: ReferenceAutocompleteOption) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { newText, newCursorPosition } = autocomplete.insertItem(
      item,
      value,
      textarea.selectionStart || 0,
    )
    onChange(newText)
    autocomplete.close()

    // Store reference image URL for @tags
    if (item.type === 'reference' && item.imageUrl) {
      setRecipeReferenceImage(item.value, item.imageUrl)
    }

    // Restore cursor position
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPosition, newCursorPosition)
      textarea.focus()
    }, 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    autocomplete.handleTextChange(newValue, e.target.selectionStart || 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!autocomplete.isOpen) return

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      autocomplete.selectPrevious()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      autocomplete.selectNext()
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (autocomplete.items.length > 0) {
        e.preventDefault()
        const item = autocomplete.items[autocomplete.selectedIndex]
        if (item) handleSelect(item)
      }
    } else if (e.key === 'Escape') {
      autocomplete.close()
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'min-h-[36px] text-sm bg-card border-border resize-y',
          isMissing && 'border-amber-500/50 ring-1 ring-amber-500/30'
        )}
      />
      <ReferenceAutocomplete
        isOpen={autocomplete.isOpen}
        items={autocomplete.items}
        selectedIndex={autocomplete.selectedIndex}
        onSelect={handleSelect}
        onClose={autocomplete.close}
        onNavigate={(dir) => dir === 'up' ? autocomplete.selectPrevious() : autocomplete.selectNext()}
      />
    </div>
  )
}
