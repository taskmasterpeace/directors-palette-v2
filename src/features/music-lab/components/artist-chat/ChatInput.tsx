'use client'

import { useRef, useState, useCallback, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/utils/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  isSending: boolean
  isDisabled: boolean
}

export function ChatInput({ onSend, isSending, isDisabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = value.trim().length > 0 && !isSending && !isDisabled

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isSending || isDisabled) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isSending, isDisabled, onSend])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    // Auto-grow up to 5 lines (~120px)
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div
      className={cn(
        'px-3 py-2.5',
        'bg-card/60 backdrop-blur-xl',
        'border-t border-border/30',
      )}
    >
      <div
        className={cn(
          'flex items-end gap-2',
          'rounded-[22px] px-4 py-2',
          'bg-background/60 border border-border/50',
          'transition-all duration-200',
          'focus-within:border-amber-500/40',
          'focus-within:shadow-[0_0_0_2px_rgba(245,158,11,0.1)]',
          (isSending || isDisabled) && 'opacity-60',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            handleInput()
          }}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? 'Chat unavailable...' : 'Message...'}
          disabled={isSending || isDisabled}
          rows={1}
          className={cn(
            'flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40',
            'resize-none outline-none',
            'py-0.5',
            'max-h-[120px]',
            'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
          )}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'shrink-0 w-8 h-8 rounded-full',
            'flex items-center justify-center',
            'transition-all duration-200',
            canSend
              ? cn(
                  'bg-amber-500 text-black',
                  'shadow-[0_2px_8px_rgba(245,158,11,0.3)]',
                  'hover:bg-amber-400 hover:shadow-[0_2px_12px_rgba(245,158,11,0.4)]',
                  'active:scale-95',
                )
              : 'bg-muted/50 text-muted-foreground/30 cursor-not-allowed',
          )}
          aria-label="Send message"
        >
          <ArrowUp className="w-4.5 h-4.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
