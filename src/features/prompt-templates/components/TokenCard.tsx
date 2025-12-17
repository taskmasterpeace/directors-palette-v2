"use client"

/**
 * TokenCard Component
 *
 * Draggable token chip for the template editor.
 * Shows category color coding and inclusion rule badge.
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Camera,
  Users,
  Palette,
  Move,
  Volume2,
  Sparkles,
  Music,
  BookOpen,
  GripVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import type { Token, TokenCategory, InclusionRule } from '../types/prompt-template.types'
import { cn } from '@/utils/utils'

interface TokenCardProps {
  token: Token
  isInTemplate?: boolean
  isDragging?: boolean
  compact?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onRemoveFromTemplate?: () => void
}

// Category to icon mapping
const categoryIcons: Record<TokenCategory, React.ReactNode> = {
  cinematography: <Camera className="w-3.5 h-3.5" />,
  content: <Users className="w-3.5 h-3.5" />,
  visualLook: <Palette className="w-3.5 h-3.5" />,
  motion: <Move className="w-3.5 h-3.5" />,
  audio: <Volume2 className="w-3.5 h-3.5" />,
  style: <Sparkles className="w-3.5 h-3.5" />,
  musicLab: <Music className="w-3.5 h-3.5" />,
  storybook: <BookOpen className="w-3.5 h-3.5" />,
}

// Category to color mapping - more vibrant
const categoryColors: Record<TokenCategory, string> = {
  cinematography: 'bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25 hover:border-blue-400/50',
  content: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400/50',
  visualLook: 'bg-violet-500/15 text-violet-300 border-violet-500/40 hover:bg-violet-500/25 hover:border-violet-400/50',
  motion: 'bg-orange-500/15 text-orange-300 border-orange-500/40 hover:bg-orange-500/25 hover:border-orange-400/50',
  audio: 'bg-pink-500/15 text-pink-300 border-pink-500/40 hover:bg-pink-500/25 hover:border-pink-400/50',
  style: 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-400/50',
  musicLab: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 hover:border-cyan-400/50',
  storybook: 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25 hover:border-rose-400/50',
}

// Inclusion rule badge styling
const ruleStyles: Record<InclusionRule, { bg: string; label: string }> = {
  always: { bg: 'bg-emerald-600/90 text-emerald-50', label: 'Always' },
  conditionalOnNoStyle: { bg: 'bg-amber-600/90 text-amber-50', label: 'No Style' },
  separate: { bg: 'bg-blue-600/90 text-blue-50', label: 'Separate' },
  additive: { bg: 'bg-orange-600/90 text-orange-50', label: 'Additive' },
  optional: { bg: 'bg-zinc-600/90 text-zinc-50', label: 'Optional' },
}

export function TokenCard({
  token,
  isInTemplate = false,
  isDragging = false,
  compact = false,
  onEdit,
  onDelete,
  onRemoveFromTemplate,
}: TokenCardProps) {
  const ruleStyle = ruleStyles[token.inclusionRule]

  return (
    <div
      className={cn(
        'group flex items-center gap-2.5 rounded-lg border transition-all duration-150 cursor-grab active:cursor-grabbing',
        compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5',
        categoryColors[token.category],
        isDragging && 'opacity-60 scale-105 shadow-lg shadow-black/20 ring-2 ring-white/20',
        isInTemplate && 'pr-2'
      )}
    >
      {/* Category icon */}
      <span className="flex-shrink-0 opacity-80">
        {categoryIcons[token.category]}
      </span>

      {/* Token name */}
      <span className={cn(
        'font-medium flex-1 truncate',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {token.label}
      </span>

      {/* Inclusion rule badge */}
      {!compact && (
        <Badge
          variant="secondary"
          className={cn(
            'text-[10px] px-1.5 py-0 h-4 font-medium shadow-sm',
            ruleStyle.bg
          )}
        >
          {ruleStyle.label}
        </Badge>
      )}

      {/* Action buttons - shown on hover */}
      {!isInTemplate && (onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-white/15 rounded-md"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-red-500/25 text-red-400 rounded-md"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* Remove from template button */}
      {isInTemplate && onRemoveFromTemplate && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-red-500/25 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
          onClick={(e) => {
            e.stopPropagation()
            onRemoveFromTemplate()
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}

// Sortable version for use in template builder
interface SortableTokenCardProps extends TokenCardProps {
  id: string
}

export function SortableTokenCard({ id, ...props }: SortableTokenCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1',
        isDragging && 'z-50'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded"
      >
        <GripVertical className="w-4 h-4 text-zinc-500" />
      </button>

      <TokenCard {...props} isDragging={isDragging} />
    </div>
  )
}

// Draggable version for library (source)
interface DraggableTokenCardProps extends TokenCardProps {
  id: string
}

export function DraggableTokenCard({ id, ...props }: DraggableTokenCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'token',
      token: props.token,
    },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      <TokenCard {...props} isDragging={isDragging} />
    </div>
  )
}
