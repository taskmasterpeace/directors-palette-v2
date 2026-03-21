'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Check, User, Tag, Layers, BookOpen, MessageSquare, Wand2, Film, Pencil, Trash2, Camera, X } from 'lucide-react'
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
  LoraContent,
  DirectorContent,
} from '../types/community.types'

interface CommunityCardProps {
  item: CommunityItem
  isInLibrary: boolean
  userRating: number | null
  onAdd: () => Promise<boolean>
  onRemove?: () => Promise<boolean>
  onRate: (rating: number) => Promise<boolean>
  onClick?: () => void
  // Admin controls
  isAdmin?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onUpdateThumbnail?: (file: File) => Promise<void>
  onDeleteThumbnail?: () => Promise<void>
}

const TYPE_COLORS: Record<CommunityItemType, string> = {
  wildcard: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  recipe: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  prompt: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lora: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  director: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const TYPE_ICONS: Record<CommunityItemType, React.ComponentType<{ className?: string }>> = {
  wildcard: Layers,
  recipe: BookOpen,
  prompt: MessageSquare,
  lora: Wand2,
  director: Film,
}

export function CommunityCard({
  item,
  isInLibrary,
  userRating,
  onAdd,
  onRemove,
  onRate,
  onClick,
  isAdmin,
  onEdit,
  onDelete,
  onUpdateThumbnail,
  onDeleteThumbnail,
}: CommunityCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [isUploadingThumb, setIsUploadingThumb] = useState(false)
  const thumbInputRef = useRef<HTMLInputElement>(null)

  const TypeIcon = TYPE_ICONS[item.type]

  const handleThumbUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpdateThumbnail) return
    e.target.value = ''
    setIsUploadingThumb(true)
    try {
      await onUpdateThumbnail(file)
    } finally {
      setIsUploadingThumb(false)
    }
  }, [onUpdateThumbnail])

  const handleDeleteThumbnail = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDeleteThumbnail) return
    setIsUploadingThumb(true)
    try {
      await onDeleteThumbnail()
    } finally {
      setIsUploadingThumb(false)
    }
  }, [onDeleteThumbnail])

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onRemove || isRemoving) return
    setIsRemoving(true)
    await onRemove()
    setIsRemoving(false)
    setJustAdded(false)
  }

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
        const fieldCount = content.stages.reduce((acc, s) => acc + (s.fields?.length || 0), 0)
        // Collect all reference images from all stages
        const allRefImages = content.stages.flatMap(s => s.referenceImages || []).slice(0, 4)
        return (
          <div className="space-y-2">
            {/* Template URL if exists */}
            {content.templateUrl && (
              <div className="relative aspect-video rounded overflow-hidden bg-muted/20 mb-2">
                <img
                  src={content.templateUrl}
                  alt="Template layout"
                  className="object-contain w-full h-full"
                />
              </div>
            )}
            {/* Stage Reference Images Gallery */}
            {allRefImages.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {allRefImages.map((img, idx) => (
                  <div key={img.id || idx} className="relative w-10 h-10 rounded overflow-hidden bg-muted/20 border border-border/50">
                    <img
                      src={img.url}
                      alt={img.name || `Reference ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
                {content.stages.flatMap(s => s.referenceImages || []).length > 4 && (
                  <div className="w-10 h-10 rounded bg-muted/30 border border-border/50 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground">
                      +{content.stages.flatMap(s => s.referenceImages || []).length - 4}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{content.stages.length} stage{content.stages.length > 1 ? 's' : ''}</span>
              <span className="text-muted-foreground/30">|</span>
              <span>{fieldCount} field{fieldCount > 1 ? 's' : ''}</span>
              {allRefImages.length > 0 && (
                <>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="text-blue-400">{content.stages.flatMap(s => s.referenceImages || []).length} ref image{content.stages.flatMap(s => s.referenceImages || []).length > 1 ? 's' : ''}</span>
                </>
              )}
            </div>
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
      case 'lora': {
        const content = item.content as LoraContent
        return (
          <div className="space-y-2">
            <div className="relative aspect-video rounded overflow-hidden bg-muted/20 mb-2 group/thumb">
              {content.thumbnailUrl ? (
                <img
                  src={content.thumbnailUrl}
                  alt={`${item.name} preview`}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full bg-violet-950/20">
                  <Wand2 className="w-8 h-8 text-violet-500/30" />
                </div>
              )}
              {/* Thumbnail controls — admin only */}
              {isAdmin && onUpdateThumbnail && (
                <>
                  <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover/thumb:opacity-100 transition-all">
                    {/* Upload / replace thumbnail */}
                    <button
                      onClick={(e) => { e.stopPropagation(); thumbInputRef.current?.click() }}
                      disabled={isUploadingThumb}
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center',
                        'bg-black/60 text-white/80 hover:bg-violet-500 hover:text-white transition-all',
                        isUploadingThumb && 'animate-pulse opacity-100'
                      )}
                      title="Upload thumbnail"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete thumbnail — only when one exists */}
                    {content.thumbnailUrl && onDeleteThumbnail && (
                      <button
                        onClick={handleDeleteThumbnail}
                        disabled={isUploadingThumb}
                        className={cn(
                          'w-7 h-7 rounded-md flex items-center justify-center',
                          'bg-black/60 text-red-400 hover:bg-red-500 hover:text-white transition-all',
                          isUploadingThumb && 'animate-pulse opacity-100'
                        )}
                        title="Delete thumbnail"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbUpload}
                    className="hidden"
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {content.loraType}
              </Badge>
              <span className="text-muted-foreground/30">|</span>
              <span className="italic text-violet-400">{content.triggerWord}</span>
            </div>
          </div>
        )
      }
      case 'director': {
        const content = item.content as DirectorContent
        return (
          <div className="flex flex-wrap gap-1">
            {(Array.isArray(content.fingerprint?.coreIntent?.primaryFocus) ? content.fingerprint.coreIntent.primaryFocus : []).slice(0, 3).map((focus) => (
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
      {/* Admin Controls - visible on hover, positioned at bottom-right above footer */}
      {isAdmin && (
        <div className="absolute bottom-12 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Edit Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onEdit?.() }}
            className={cn(
              "h-7 w-7 rounded-full transition-all",
              "bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white",
              "border border-blue-500/30 hover:border-blue-500"
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          {/* Delete Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
            className={cn(
              "h-7 w-7 rounded-full transition-all",
              "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white",
              "border border-red-500/30 hover:border-red-500"
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

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
            >
              <Button
                size="icon"
                variant="ghost"
                onClick={handleRemove}
                disabled={isRemoving}
                className={cn(
                  'h-7 w-7 rounded-full transition-all group/remove',
                  'bg-emerald-500/10 hover:bg-red-500 text-emerald-400 hover:text-white',
                  'border border-emerald-500/30 hover:border-red-500',
                  isRemoving && 'animate-pulse'
                )}
              >
                <Check className="w-4 h-4 group-hover/remove:hidden" />
                <Minus className="w-4 h-4 hidden group-hover/remove:block" />
              </Button>
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
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
          {item.name}
        </h3>
        {item.isOfficial && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-400 shrink-0">
            Official
          </Badge>
        )}
      </div>

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
      {Array.isArray(item.tags) && item.tags.length > 0 && (
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
          {Array.isArray(item.tags) && item.tags.length > 3 && (
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
