'use client'

import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Loader2, Inbox } from 'lucide-react'
import { CommunityCard } from './CommunityCard'
import type { CommunityItem } from '../types/community.types'

interface CommunityGridProps {
  items: CommunityItem[]
  isLoading: boolean
  isInLibrary: (itemId: string) => boolean
  getUserRating: (itemId: string) => number | null
  onAdd: (itemId: string) => Promise<boolean>
  onRate: (itemId: string, rating: number) => Promise<boolean>
  onItemClick?: (item: CommunityItem) => void
  // Admin controls
  isAdmin?: boolean
  onEdit?: (item: CommunityItem) => void
  onDelete?: (item: CommunityItem) => void
}

export function CommunityGrid({
  items,
  isLoading,
  isInLibrary,
  getUserRating,
  onAdd,
  onRate,
  onItemClick,
  isAdmin,
  onEdit,
  onDelete,
}: CommunityGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No items found</p>
        <p className="text-sm">Try adjusting your filters or search terms</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <CommunityCard
            key={item.id}
            item={item}
            isInLibrary={isInLibrary(item.id)}
            userRating={getUserRating(item.id)}
            onAdd={() => onAdd(item.id)}
            onRate={(rating) => onRate(item.id, rating)}
            onClick={() => onItemClick?.(item)}
            isAdmin={isAdmin}
            onEdit={() => onEdit?.(item)}
            onDelete={() => onDelete?.(item)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
