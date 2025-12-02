/**
 * Autocomplete dropdown for @reference suggestions
 * Positioned below textarea cursor
 */

'use client'

import { useEffect, useRef } from 'react'
import { Command, CommandList, CommandGroup } from '@/components/ui/command'
import { ReferenceItem } from './ReferenceItem'
import { CategoryItem } from './CategoryItem'
import type { AutocompleteOption } from '../../types/autocomplete.types'

interface PromptAutocompleteProps {
  items: AutocompleteOption[]
  selectedIndex: number
  onSelect: (item: AutocompleteOption) => void
  onSelectIndex: (index: number) => void
  position?: { top: number; left: number }
}

export function PromptAutocomplete({
  items,
  selectedIndex,
  onSelect,
  onSelectIndex,
  position = { top: 0, left: 0 }
}: PromptAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]')
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Separate categories and references
  const categories = items.filter(item => item.type === 'category')
  const references = items.filter(item => item.type === 'reference')

  // Don't render if no items
  if (items.length === 0) {
    return null
  }

  return (
    <div
      className="fixed z-50 w-80 max-w-[calc(100vw-2rem)] sm:w-80 rounded-md border border-border bg-card text-white shadow-xl outline-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        maxHeight: '300px'
      }}
    >
      <Command>
        <CommandList ref={listRef} className="max-h-[300px] overflow-y-auto">
          {/* Categories Section */}
          {categories.length > 0 && (
            <CommandGroup heading="Categories (random selection)">
              {categories.map((item, index) => (
                <CategoryItem
                  key={item.value}
                  item={item}
                  isSelected={selectedIndex === index}
                  onSelect={() => onSelect(item)}
                  onHover={() => onSelectIndex(index)}
                />
              ))}
            </CommandGroup>
          )}

          {/* References Section */}
          {references.length > 0 && (
            <CommandGroup heading="References">
              {references.map((item, index) => {
                const actualIndex = categories.length + index
                return (
                  <ReferenceItem
                    key={item.value}
                    item={item}
                    isSelected={selectedIndex === actualIndex}
                    onSelect={() => onSelect(item)}
                    onHover={() => onSelectIndex(actualIndex)}
                  />
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </div>
  )
}
