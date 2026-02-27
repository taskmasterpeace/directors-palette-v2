/**
 * Category item in autocomplete dropdown
 * Shows category icon and name for random selection
 */

'use client'

import { CommandItem } from '@/components/ui/command'
import { Users, MapPin, Package, Layout, Brush, Sparkles } from 'lucide-react'
import type { CategoryAutocompleteItem, ReferenceCategory } from '../../types/autocomplete.types'

const CATEGORY_ICONS: Record<ReferenceCategory, React.ComponentType<{ className?: string }>> = {
  people: Users,
  places: MapPin,
  props: Package,
  layouts: Layout,
  styles: Brush,
}

const CATEGORY_COLORS: Record<ReferenceCategory, string> = {
  people: 'text-blue-600',
  places: 'text-green-600',
  props: 'text-orange-600',
  layouts: 'text-purple-600',
  styles: 'text-pink-600',
}

interface CategoryItemProps {
  item: CategoryAutocompleteItem
  isSelected: boolean
  onSelect: () => void
  onHover: () => void
}

export function CategoryItem({
  item,
  isSelected,
  onSelect,
  onHover
}: CategoryItemProps) {
  const Icon = CATEGORY_ICONS[item.category]
  const colorClass = CATEGORY_COLORS[item.category]

  return (
    <CommandItem
      value={item.value}
      onSelect={onSelect}
      onMouseEnter={onHover}
      data-selected={isSelected}
      className="flex items-center gap-3 px-3 py-2 cursor-pointer"
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded flex items-center justify-center bg-gray-100 flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${colorClass}`} />
      </div>

      {/* Category Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-yellow-600" />
          <span className="font-medium text-sm">
            {item.value}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Random {item.category} selection
        </p>
      </div>
    </CommandItem>
  )
}
