/**
 * Autocomplete types for @reference suggestions
 */

import type { GeneratedImage } from '../store/unified-gallery-store'

/**
 * Type of autocomplete item
 */
export type AutocompleteItemType = 'reference' | 'category'

/**
 * Category types for random selection
 */
export type ReferenceCategory = 'people' | 'places' | 'props' | 'layouts'

/**
 * Base autocomplete item interface
 */
export interface AutocompleteItem {
  type: AutocompleteItemType
  value: string // The text to insert (e.g., "@hero", "@people")
  label: string // Display label
}

/**
 * Reference autocomplete item (specific image reference)
 */
export interface ReferenceAutocompleteItem extends AutocompleteItem {
  type: 'reference'
  image: GeneratedImage
  thumbnailUrl: string
}

/**
 * Category autocomplete item (random selection from category)
 */
export interface CategoryAutocompleteItem extends AutocompleteItem {
  type: 'category'
  category: ReferenceCategory
  count: number // Number of items in this category
}

/**
 * Union type for all autocomplete items
 */
export type AutocompleteOption = ReferenceAutocompleteItem | CategoryAutocompleteItem

/**
 * Autocomplete state
 */
export interface AutocompleteState {
  isOpen: boolean
  query: string // Text after @ symbol
  filteredItems: AutocompleteOption[]
  selectedIndex: number
  triggerPosition: number // Cursor position where @ was typed
}

/**
 * Cursor position in textarea
 */
export interface CursorPosition {
  start: number
  end: number
  line: number
  column: number
}

/**
 * Autocomplete trigger result
 */
export interface TriggerResult {
  shouldShow: boolean
  query: string
  triggerPosition: number
}
