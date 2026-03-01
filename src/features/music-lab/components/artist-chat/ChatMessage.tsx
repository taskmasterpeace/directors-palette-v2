'use client'

import { useMemo } from 'react'
import { cn } from '@/utils/utils'
import { ChatReaction } from './ChatReaction'
import { ChatLyricsMessage } from './ChatLyricsMessage'
import { ChatPhotoMessage } from './ChatPhotoMessage'
import { ChatActionLink } from './ChatActionLink'
import { ChatWebShare } from './ChatWebShare'
import type {
  ChatMessage as ChatMessageType,
  ChatReaction as ChatReactionType,
} from '../../types/artist-chat.types'

interface ChatMessageProps {
  message: ChatMessageType
  isOwn: boolean
  onReact: (messageId: string, reaction: ChatReactionType) => void
}

/** Returns relative time string like "2m ago", "1h ago", "Yesterday" */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 30) return 'Just now'
  if (diffMin < 1) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ChatMessage({ message, isOwn, onReact }: ChatMessageProps) {
  const relativeTime = useMemo(() => formatRelativeTime(message.createdAt), [message.createdAt])

  // System messages render centered
  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-muted-foreground/50 bg-card/40 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  // Lyrics type
  if (message.messageType === 'lyrics') {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="space-y-1">
          <ChatLyricsMessage
            content={message.content}
            reaction={message.reaction}
            onReact={!isOwn ? (r) => onReact(message.id, r) : undefined}
          />
          <p className={cn('text-[10px] text-muted-foreground/40 px-2', isOwn && 'text-right')}>
            {relativeTime}
          </p>
        </div>
      </div>
    )
  }

  // Photo type
  if (message.messageType === 'photo') {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="group space-y-1">
          <ChatPhotoMessage
            photoUrl={message.photoUrl}
            caption={message.content || undefined}
            isGenerating={!message.photoUrl}
          />
          {/* Reaction for artist photos */}
          {!isOwn && (
            <div className="flex items-center gap-2 px-1">
              <ChatReaction
                messageId={message.id}
                currentReaction={message.reaction ?? null}
                onReact={onReact}
              />
              <span className="text-[10px] text-muted-foreground/40">{relativeTime}</span>
            </div>
          )}
          {isOwn && (
            <p className="text-[10px] text-muted-foreground/40 px-2 text-right">{relativeTime}</p>
          )}
        </div>
      </div>
    )
  }

  // Action type
  if (message.messageType === 'action' && message.actionData) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="space-y-1">
          <ChatActionLink actionData={message.actionData} onClick={() => {}} />
          <p className={cn('text-[10px] text-muted-foreground/40 px-2', isOwn && 'text-right')}>
            {relativeTime}
          </p>
        </div>
      </div>
    )
  }

  // Web share type
  if (message.messageType === 'web-share' && message.webShareData) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <div className="space-y-1">
          <ChatWebShare
            data={message.webShareData}
            reaction={message.reaction}
            onReact={!isOwn ? (r) => onReact(message.id, r) : undefined}
          />
          <p className={cn('text-[10px] text-muted-foreground/40 px-2', isOwn && 'text-right')}>
            {relativeTime}
          </p>
        </div>
      </div>
    )
  }

  // Default: text message bubble
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className="group max-w-[80%] space-y-1">
        <div
          className={cn(
            'relative px-3.5 py-2.5 rounded-2xl',
            'text-sm leading-relaxed',
            'transition-shadow duration-200',
            isOwn
              ? cn(
                  'bg-amber-500/20 text-foreground',
                  'border border-amber-500/25',
                  'rounded-br-md',
                  'shadow-[0_1px_6px_rgba(245,158,11,0.08)]',
                )
              : cn(
                  'bg-card/70 text-foreground',
                  'border border-border/40',
                  'rounded-bl-md',
                  'shadow-[0_1px_6px_rgba(0,0,0,0.1)]',
                ),
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Timestamp + reaction row */}
        <div
          className={cn(
            'flex items-center gap-2 px-1',
            isOwn ? 'justify-end' : 'justify-start',
          )}
        >
          {!isOwn && (
            <ChatReaction
              messageId={message.id}
              currentReaction={message.reaction ?? null}
              onReact={onReact}
            />
          )}
          <span className="text-[10px] text-muted-foreground/40">{relativeTime}</span>
        </div>
      </div>
    </div>
  )
}
