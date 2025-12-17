'use client'

import React from 'react'
import { Search, SlidersHorizontal, Layers, BookOpen, MessageSquare, Film, Grid3X3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/utils'
import type { CommunityFilters as CommunityFiltersType, CommunityItemType } from '../types/community.types'
import {
  getCategoriesForType,
  WILDCARD_CATEGORIES,
  RECIPE_CATEGORIES,
  PROMPT_CATEGORIES,
  DIRECTOR_CATEGORIES,
} from '../types/community.types'

interface CommunityFiltersProps {
  filters: CommunityFiltersType
  onTypeChange: (type: CommunityItemType | 'all') => void
  onCategoryChange: (category: string | undefined) => void
  onSearchChange: (search: string | undefined) => void
  onSortChange: (sortBy: CommunityFiltersType['sortBy']) => void
}

const TYPE_TABS: { value: CommunityItemType | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Grid3X3 },
  { value: 'wildcard', label: 'Wildcards', icon: Layers },
  { value: 'recipe', label: 'Recipes', icon: BookOpen },
  { value: 'prompt', label: 'Prompts', icon: MessageSquare },
  { value: 'director', label: 'Directors', icon: Film },
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'alphabetical', label: 'A-Z' },
]

export function CommunityFilters({
  filters,
  onTypeChange,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}: CommunityFiltersProps) {
  // Get categories for current type filter
  const categories = filters.type && filters.type !== 'all'
    ? getCategoriesForType(filters.type)
    : []

  // All categories when type is 'all'
  const allCategories = [
    ...WILDCARD_CATEGORIES.map(c => ({ ...c, type: 'wildcard' as const })),
    ...RECIPE_CATEGORIES.map(c => ({ ...c, type: 'recipe' as const })),
    ...PROMPT_CATEGORIES.map(c => ({ ...c, type: 'prompt' as const })),
    ...DIRECTOR_CATEGORIES.map(c => ({ ...c, type: 'director' as const })),
  ]

  return (
    <div className="space-y-4">
      {/* Type Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {TYPE_TABS.map((tab) => {
          const isActive = filters.type === tab.value || (!filters.type && tab.value === 'all')
          return (
            <Button
              key={tab.value}
              variant="ghost"
              size="sm"
              onClick={() => {
                onTypeChange(tab.value)
                // Clear category when changing type
                if (tab.value !== filters.type) {
                  onCategoryChange(undefined)
                }
              }}
              className={cn(
                'h-8 px-3 gap-1.5',
                isActive
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search community..."
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value || undefined)}
            className="pl-9 h-9"
          />
        </div>

        {/* Category Filter */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => onCategoryChange(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(filters.type && filters.type !== 'all' ? categories : allCategories).map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy || 'popular'}
          onValueChange={(value) => onSortChange(value as CommunityFiltersType['sortBy'])}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
