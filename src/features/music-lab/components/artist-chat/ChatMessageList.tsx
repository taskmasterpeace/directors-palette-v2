'use client'

import { useEffect, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/utils/utils'
import { ChatMessage } from './ChatMessage'
import type {
  ChatMessage as ChatMessageType,
  ChatReaction as ChatReactionType,
} from '../../types/artist-chat.types'

interface ChatMessageListProps {
  messages: ChatMessageType[]
  isSending: boolean
  onReact: (messageId: string, reaction: ChatReactionType) => void
}

/** Typing indicator -- three animated dots in a dark bubble */
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'inline-flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-md',
          'bg-card/70 border border-border/40',
          'shadow-[0_1px_6px_rgba(0,0,0,0.1)]',
        )}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full bg-muted-foreground/50"
            style={{
              animation: 'typing-dot 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        {/* Inline keyframes for the typing animation */}
        <style>{`
          @keyframes typing-dot {
            0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
            30% { opacity: 1; transform: translateY(-4px); }
          }
        `}</style>
      </div>
    </div>
  )
}

/** Empty state -- shown when no messages exist yet */
function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-16">
      <div
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          'bg-amber-500/10 border border-amber-500/20',
        )}
      >
        <MessageCircle className="w-7 h-7 text-amber-400" />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium text-foreground/80">Start the conversation</p>
        <p className="text-xs text-muted-foreground/60 max-w-[240px] leading-relaxed">
          Send a message to start chatting. Ask about what they are working on, share an idea, or just say hey.
        </p>
      </div>
    </div>
  )
}

export function ChatMessageList({ messages, isSending, onReact }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change or sending state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSending])

  if (messages.length === 0 && !isSending) {
    return <EmptyState />
  }

  // Group consecutive same-sender messages for visual clustering
  const groupedMessages: { message: ChatMessageType; isFirstInGroup: boolean; isLastInGroup: boolean }[] = []

  messages.forEach((msg, i) => {
    const prev = i > 0 ? messages[i - 1] : null
    const next = i < messages.length - 1 ? messages[i + 1] : null
    const isFirstInGroup = !prev || prev.role !== msg.role
    const isLastInGroup = !next || next.role !== msg.role
    groupedMessages.push({ message: msg, isFirstInGroup, isLastInGroup })
  })

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-0.5"
    >
      {groupedMessages.map(({ message, isFirstInGroup, isLastInGroup }) => (
        <div
          key={message.id}
          className={cn(
            isFirstInGroup && 'mt-3',
            isLastInGroup && 'mb-1',
            !isFirstInGroup && !isLastInGroup && 'my-0.5',
          )}
        >
          <ChatMessage
            message={message}
            isOwn={message.role === 'user'}
            onReact={onReact}
          />
        </div>
      ))}

      {/* Typing indicator */}
      {isSending && (
        <div className="mt-3">
          <TypingIndicator />
        </div>
      )}

      {/* Invisible scroll anchor */}
      <div ref={bottomRef} className="h-px" />
    </div>
  )
}
