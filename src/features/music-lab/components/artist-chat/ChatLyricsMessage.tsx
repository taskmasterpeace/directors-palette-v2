'use client'

import { cn } from '@/utils/utils'
import { ChatReaction } from './ChatReaction'
import type { ChatReaction as ChatReactionType } from '../../types/artist-chat.types'

interface ChatLyricsMessageProps {
  content: string
  reaction?: ChatReactionType
  onReact?: (reaction: ChatReactionType) => void
}

export function ChatLyricsMessage({ content, reaction, onReact }: ChatLyricsMessageProps) {
  const lines = content.split('\n')

  return (
    <div className="group relative max-w-[85%]">
      <div
        className={cn(
          'rounded-2xl overflow-hidden',
          'bg-amber-500/[0.06] border border-amber-500/20',
          'shadow-[0_2px_12px_rgba(245,158,11,0.06)]',
        )}
      >
        {/* Amber left accent bar */}
        <div className="flex">
          <div className="w-1 bg-gradient-to-b from-amber-400 to-amber-600 shrink-0 rounded-l-full" />
          <div className="px-3.5 py-3 flex-1 min-w-0">
            <pre
              className={cn(
                'font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                'text-foreground/90',
              )}
            >
              {lines.map((line, i) => (
                <span key={i} className="block">
                  {line || '\u00A0'}
                </span>
              ))}
            </pre>
          </div>
        </div>
      </div>

      {/* Reaction overlay */}
      {onReact && (
        <div className="absolute -bottom-2 right-2">
          <ChatReaction
            messageId="lyrics"
            currentReaction={reaction ?? null}
            onReact={(_id, r) => onReact(r)}
          />
        </div>
      )}
    </div>
  )
}
