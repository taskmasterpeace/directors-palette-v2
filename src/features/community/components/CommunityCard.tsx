'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, User, Tag, Layers, BookOpen, MessageSquare, Film } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RatingStars, RatingInput } from './RatingStars'
import type {
  CommunityItem,
  CommunityItemType,
  WildcardContent,
  RecipeContent,
  PromptContent,
  DirectorContent,
} from '../types/community.types'

interface CommunityCardProps {
  item: CommunityItem
  isInLibrary: boolean
  userRating: number | null
  onAdd: () => Promise<boolean>
  onRate: (rating: number) => Promise<boolean>
  onClick?: () => void
}

const TYPE_COLORS: Record<CommunityItemType, string> = {
  wildcard: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  recipe: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  prompt: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  director: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const TYPE_ICONS: Record<CommunityItemType, React.ElementType> = {
  wildcard: Layers,
  recipe: BookOpen,
  prompt: MessageSquare,
  director: Film,
}

export function CommunityCard({
  item,
  isInLibrary,
  userRating,
  onAdd,
  onRate,
  onClick,
}: CommunityCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [showRating, setShowRating] = useState(false)

  const TypeIcon = TYPE_ICONS[item.type]

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isInLibrary || isAdding) return

    setIsAdding(true)
    const success = await onAdd()
    setIsAdding(false)

    if (success) {
      setJustAdded(true)
      // Show rating prompt after adding
      setTimeout(() => setShowRating(true), 500)
    }
  }

  const handleRate = async (rating: number) => {
    await onRate(rating)
    setShowRating(false)
  }

  // Get preview content based on type
  const getPreviewContent = () => {
    switch (item.type) {
      case 'wildcard': {
        const content = item.content as WildcardContent
        const preview = content.entries.slice(0, 4).join(', ')
        return (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {preview}
            {content.entries.length > 4 && '...'}
          </p>
        )
      }
      case 'recipe': {
        const content = item.content as RecipeContent
        const fieldCount = content.stages.reduce((acc, s) => acc + s.fields.length, 0)
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{content.stages.length} stage{content.stages.length > 1 ? 's' : ''}</span>
            <span className="text-muted-foreground/30">|</span>
            <span>{fieldCount} field{fieldCount > 1 ? 's' : ''}</span>
          </div>
        )
      }
      case 'prompt': {
        const content = item.content as PromptContent
        return (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            &ldquo;{content.promptText.slice(0, 100)}...&rdquo;
          </p>
        )
      }
      case 'director': {
        const content = item.content as DirectorContent
        return (
          <div className="flex flex-wrap gap-1">
            {content.fingerprint.coreIntent.primaryFocus.slice(0, 3).map((focus) => (
              <Badge key={focus} variant="outline" className="text-[10px] px-1.5 py-0">
                {focus}
              </Badge>
            ))}
          </div>
        )
      }
    }
  }

  const isAdded = isInLibrary || justAdded

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={onClick}
      className={cn(
        'group relative bg-card border border-border rounded-lg p-4 cursor-pointer',
        'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200'
      )}
    >
      {/* Type Badge */}
      <div className="flex items-center justify-between mb-2">
        <Badge
          variant="outline"
          className={cn('text-[10px] uppercase tracking-wider', TYPE_COLORS[item.type])}
        >
          <TypeIcon className="w-3 h-3 mr-1" />
          {item.type}
        </Badge>

        {/* Add Button */}
        <AnimatePresence mode="wait">
          {isAdded ? (
            <motion.div
              key="added"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-1 text-emerald-400"
            >
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Added</span>
            </motion.div>
          ) : (
            <motion.div key="add" initial={{ scale: 1 }} exit={{ scale: 0 }}>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleAdd}
                disabled={isAdding}
                className={cn(
                  'h-7 w-7 rounded-full transition-all',
                  'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white',
                  'border border-emerald-500/30 hover:border-emerald-500',
                  isAdding && 'animate-pulse'
                )}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title */}
      <h3 className="font-medium text-sm mb-1 line-clamp-1 group-hover:text-primary transition-colors">
        {item.name}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Preview Content */}
      <div className="mb-3">{getPreviewContent()}</div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        {/* Author */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{item.submittedByName}</span>
        </div>

        {/* Rating */}
        <RatingStars
          rating={item.averageRating}
          count={item.ratingCount}
          size="sm"
        />
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          <Tag className="w-3 h-3 text-muted-foreground/50" />
          {item.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground/50">
              +{item.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Rating Prompt (shows after adding) */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-card/95 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-2">Rate this {item.type}</p>
            <RatingInput value={userRating} onChange={handleRate} size="lg" />
            <button
              onClick={() => setShowRating(false)}
              className="text-xs text-muted-foreground mt-3 hover:text-foreground"
            >
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
