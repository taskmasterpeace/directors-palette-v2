'use client'

import { ArrowLeft, MoreVertical, User, Trash2, Rss } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/utils'
import type { LivingContext } from '../../types/living-context.types'

interface ChatHeaderProps {
  artistName: string
  portraitUrl?: string
  livingContext: LivingContext | null
  isLoadingContext: boolean
  onBack: () => void
  onMenuAction: (action: string) => void
}

/** Deterministic color from a string (stable across renders) */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
    'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
  ]
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function ChatHeader({
  artistName,
  portraitUrl,
  livingContext,
  isLoadingContext,
  onBack,
  onMenuAction,
}: ChatHeaderProps) {
  const initials = artistName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isOnline = !!livingContext
  const statusText = livingContext
    ? `${livingContext.statusEmoji} ${livingContext.activityDescription}`
    : null

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5',
        'bg-card/80 backdrop-blur-xl',
        'border-b border-border/40',
        'shadow-[0_1px_8px_rgba(0,0,0,0.25)]',
      )}
    >
      {/* Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full hover:bg-white/5 transition-colors"
        onClick={onBack}
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Avatar with online indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10 ring-2 ring-amber-500/50 shadow-md">
          <AvatarImage src={portraitUrl} alt={artistName} />
          <AvatarFallback className={cn('text-white font-bold text-sm', getAvatarColor(artistName))}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card transition-colors duration-300',
            isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-neutral-500',
          )}
        />
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight tracking-tight truncate">
          {artistName}
        </p>
        {isLoadingContext ? (
          <Skeleton className="h-3.5 w-32 mt-0.5 rounded-full" />
        ) : statusText ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5 leading-tight">
            {statusText}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/50 mt-0.5 leading-tight">
            Offline
          </p>
        )}
      </div>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full hover:bg-white/5 transition-colors"
            aria-label="Chat options"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuItem onClick={() => onMenuAction('view-profile')}>
            <User className="w-4 h-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenuAction('inspiration-feed')}>
            <Rss className="w-4 h-4 mr-2" />
            Inspiration Feed
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onMenuAction('clear-chat')}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
