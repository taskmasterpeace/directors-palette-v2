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
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Sound Assistant
        </h3>
        {assistantMessages.length > 0 && (
          <button
            onClick={clearAssistant}
            className="ml-auto p-1 rounded-lg hover:bg-[oklch(0.25_0.03_55)] transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5 text-[oklch(0.45_0.03_55)]" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="rounded-[0.625rem] border border-[oklch(0.30_0.03_55)] bg-[oklch(0.17_0.015_55)] min-h-[120px] max-h-[280px] overflow-y-auto"
      >
        {assistantMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
            <Bot className="w-6 h-6 text-[oklch(0.35_0.03_55)]" />
            <p className="text-xs text-[oklch(0.45_0.03_55)]">
              Ask for help with your sound design.
            </p>
            <p className="text-[10px] text-[oklch(0.35_0.03_55)] max-w-[220px]">
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
                      ? 'bg-amber-500 text-[oklch(0.15_0.02_55)] rounded-br-md'
                      : 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.82_0.02_55)] border border-[oklch(0.28_0.03_55)] rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isAssistantLoading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-[oklch(0.22_0.025_55)] border border-[oklch(0.28_0.03_55)]">
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
          className="flex-1 bg-[oklch(0.22_0.025_55)] border-[oklch(0.32_0.03_55)] text-[oklch(0.88_0.02_55)] placeholder:text-[oklch(0.45_0.03_55)] rounded-xl text-sm"
          disabled={isAssistantLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isAssistantLoading}
          className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[oklch(0.15_0.02_55)] disabled:opacity-40 transition-colors flex-shrink-0"
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
