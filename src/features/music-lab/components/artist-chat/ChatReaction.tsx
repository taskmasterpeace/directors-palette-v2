'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/utils/utils'
import type { ChatReaction as ChatReactionType } from '../../types/artist-chat.types'

interface ChatReactionProps {
  messageId: string
  currentReaction: ChatReactionType
  onReact: (messageId: string, reaction: ChatReactionType) => void
}

export function ChatReaction({ messageId, currentReaction, onReact }: ChatReactionProps) {
  const [animating, setAnimating] = useState<'up' | 'down' | null>(null)

  const handleReact = (reaction: 'thumbs-up' | 'thumbs-down') => {
    // Toggle off if same reaction clicked again
    const newReaction = currentReaction === reaction ? null : reaction
    setAnimating(reaction === 'thumbs-up' ? 'up' : 'down')
    onReact(messageId, newReaction)
    setTimeout(() => setAnimating(null), 300)
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full',
        'bg-card/80 backdrop-blur-sm border border-border/30',
        'px-1 py-0.5',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
      )}
    >
      <button
        onClick={() => handleReact('thumbs-up')}
        className={cn(
          'p-1 rounded-full transition-all duration-200',
          'hover:bg-amber-500/15',
          currentReaction === 'thumbs-up'
            ? 'text-amber-400'
            : 'text-muted-foreground/60 hover:text-amber-400',
          animating === 'up' && 'scale-125',
        )}
        aria-label="Thumbs up"
      >
        <ThumbsUp
          className="w-3.5 h-3.5"
          fill={currentReaction === 'thumbs-up' ? 'currentColor' : 'none'}
        />
      </button>

      <button
        onClick={() => handleReact('thumbs-down')}
        className={cn(
          'p-1 rounded-full transition-all duration-200',
          'hover:bg-red-500/15',
          currentReaction === 'thumbs-down'
            ? 'text-red-400'
            : 'text-muted-foreground/60 hover:text-red-400',
          animating === 'down' && 'scale-125',
        )}
        aria-label="Thumbs down"
      >
        <ThumbsDown
          className="w-3.5 h-3.5"
          fill={currentReaction === 'thumbs-down' ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  )
}
