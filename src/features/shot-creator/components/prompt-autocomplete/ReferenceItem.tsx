/**
 * Single reference item in autocomplete dropdown
 * Shows thumbnail and reference name
 */

'use client'

import { CommandItem } from '@/components/ui/command'
import { Tag } from 'lucide-react'
import Image from 'next/image'
import type { ReferenceAutocompleteItem } from '../../types/autocomplete.types'

interface ReferenceItemProps {
  item: ReferenceAutocompleteItem
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

export function ReferenceItem({
  item,
  isSelected,
  onSelect,
  onHover
}: ReferenceItemProps) {
  return (
    <CommandItem
      value={item.value}
      onSelect={onSelect}
      onMouseEnter={onHover}
      data-selected={isSelected}
      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100">
        <Image
          src={item.thumbnailUrl}
          alt={item.label}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>

      {/* Reference Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Tag className="w-3 h-3 text-green-600" />
          <span className="font-medium text-sm truncate">
            {item.value}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {item.image.prompt || 'No prompt'}
        </p>
      </div>
    </CommandItem>
  )
}
