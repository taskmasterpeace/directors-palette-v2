'use client'

import { ExternalLink } from 'lucide-react'
import { cn } from '@/utils/utils'
import { ChatReaction } from './ChatReaction'
import type { WebShareData, ChatReaction as ChatReactionType } from '../../types/artist-chat.types'

interface ChatWebShareProps {
  data: WebShareData
  reaction?: ChatReactionType
  onReact?: (reaction: ChatReactionType) => void
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function ChatWebShare({ data, reaction, onReact }: ChatWebShareProps) {
  return (
    <div className="group relative max-w-[300px]">
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'block rounded-2xl overflow-hidden',
          'bg-card/60 border border-border/40',
          'hover:bg-card/80 hover:border-amber-500/30',
          'hover:shadow-[0_2px_16px_rgba(0,0,0,0.15)]',
          'transition-all duration-200',
        )}
      >
        <div className="px-3.5 py-3 space-y-1.5">
          {/* Title */}
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2 flex-1">
              {data.title}
            </p>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
          </div>

          {/* Summary - 2 lines max */}
          {data.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {data.summary}
            </p>
          )}

          {/* Source domain tag */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full',
                'text-[10px] font-medium',
                'bg-amber-500/10 text-amber-400/80',
                'border border-amber-500/15',
              )}
            >
              {extractDomain(data.url)}
            </span>
            {data.source && data.source !== extractDomain(data.url) && (
              <span className="text-[10px] text-muted-foreground/50">
                via {data.source}
              </span>
            )}
          </div>
        </div>
      </a>

      {/* Reaction overlay */}
      {onReact && (
        <div className="absolute -bottom-2 right-2">
          <ChatReaction
            messageId="web-share"
            currentReaction={reaction ?? null}
            onReact={(_id, r) => onReact(r)}
          />
        </div>
      )}
    </div>
  )
}
