'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import type { ArtistDNA } from '@/features/music-lab/types/artist-dna.types'

interface SoundAssistantProps {
  artistDna?: ArtistDNA
}

export function SoundAssistant({ artistDna }: SoundAssistantProps) {
  const { assistantMessages, isAssistantLoading, askAssistant, clearAssistant } =
    useSoundStudioStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [assistantMessages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isAssistantLoading) return
    setInput('')
    await askAssistant(trimmed, artistDna)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground tracking-[-0.025em]">
          Sound Assistant
        </h3>
        {assistantMessages.length > 0 && (
          <button
            onClick={clearAssistant}
            className="ml-auto p-1 rounded-lg hover:bg-muted/30 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground/60" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="rounded-[0.625rem] border border-border bg-background min-h-[120px] max-h-[280px] overflow-y-auto"
      >
        {assistantMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
            <Bot className="w-6 h-6 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground/60">
              Ask for help with your sound design.
            </p>
            <p className="text-[10px] text-muted-foreground/60 max-w-[220px]">
              Try &quot;Suggest instruments for a dark trap beat&quot; or &quot;What mood fits 140 BPM?&quot;
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {assistantMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-background rounded-br-md'
                      : 'bg-muted/20 text-foreground border border-border/60 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isAssistantLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-muted/20 border border-border/60">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about sound design..."
          className="flex-1 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl text-sm"
          disabled={isAssistantLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isAssistantLoading}
          className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-background disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {isAssistantLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  )
}
