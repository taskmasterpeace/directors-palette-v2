'use client'

import { useEffect, useCallback, useRef } from 'react'
import {
  MessageCircle,
  User,
  Plus,
  Loader2,
  Send,
  ThumbsUp,
  ThumbsDown,
  Camera,
  MapPin,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// ScrollArea available if needed for future use

import { useArtistChatStore } from '@/features/music-lab/store/artist-chat.store'
import { useArtistDnaStore } from '@/features/music-lab/store/artist-dna.store'
import { useLayoutStore } from '@/store/layout.store'
import type { ChatMessage, ChatReaction } from '@/features/music-lab/types/artist-chat.types'
import type { LivingContext } from '@/features/music-lab/types/living-context.types'
import { useState } from 'react'

// ─── Chat Header ──────────────────────────────────────────────────────────────

function ChatHeader({
  artistName,
  portraitUrl,
  livingContext,
  isLoadingContext,
  onRefresh,
  onBack,
  onInspiration,
}: {
  artistName: string
  portraitUrl?: string
  livingContext: LivingContext | null
  isLoadingContext: boolean
  onRefresh: () => void
  onBack: () => void
  onInspiration: () => void
}) {
  const initials = artistName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[oklch(0.32_0.03_55)] bg-[oklch(0.20_0.025_55)]">
      <button
        onClick={onBack}
        className="p-1.5 rounded-lg hover:bg-[oklch(0.28_0.03_55)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[oklch(0.65_0.04_55)]" />
      </button>

      <div className="w-10 h-10 rounded-full ring-2 ring-amber-500/60 overflow-hidden flex-shrink-0 flex items-center justify-center bg-[oklch(0.25_0.03_55)]">
        {portraitUrl ? (
          <img src={portraitUrl} alt={artistName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-[oklch(0.65_0.04_55)]">{initials}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[oklch(0.92_0.02_55)]">{artistName}</p>
        {livingContext ? (
          <div className="flex items-center gap-1.5 text-xs text-[oklch(0.55_0.04_55)]">
            <span>{livingContext.statusEmoji}</span>
            <span className="truncate">{livingContext.statusLine}</span>
          </div>
        ) : isLoadingContext ? (
          <div className="flex items-center gap-1 text-xs text-[oklch(0.55_0.04_55)]">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading context...</span>
          </div>
        ) : null}
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoadingContext}
        className="p-2 rounded-lg hover:bg-[oklch(0.28_0.03_55)] transition-colors disabled:opacity-40"
        title="Refresh status"
      >
        <RefreshCw className={`w-4 h-4 text-[oklch(0.55_0.04_55)] ${isLoadingContext ? 'animate-spin' : ''}`} />
      </button>

      <button
        onClick={onInspiration}
        className="p-2 rounded-lg hover:bg-[oklch(0.28_0.03_55)] transition-colors"
        title="Inspiration feed"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  )
}

// ─── Chat Message Bubble ──────────────────────────────────────────────────────

function ChatBubble({
  message,
  onReact,
}: {
  message: ChatMessage
  onReact: (messageId: string, reaction: ChatReaction) => void
}) {
  const isUser = message.role === 'user'
  const isPhoto = message.messageType === 'photo'
  const isAction = message.messageType === 'action'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : 'order-1'}`}>
        {isPhoto && message.photoUrl ? (
          <div className="rounded-2xl overflow-hidden border border-[oklch(0.32_0.03_55)]">
            <img
              src={message.photoUrl}
              alt="Shared photo"
              className="max-w-[280px] w-full object-cover"
            />
          </div>
        ) : isAction && message.actionData ? (
          <button className="px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors">
            {message.actionData.label}
          </button>
        ) : (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? 'bg-amber-500 text-[oklch(0.15_0.02_55)] rounded-br-md'
                : 'bg-[oklch(0.25_0.03_55)] text-[oklch(0.88_0.02_55)] border border-[oklch(0.32_0.03_55)] rounded-bl-md'
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Reactions (only on artist messages) */}
        {!isUser && message.messageType !== 'action' && (
          <div className="flex items-center gap-1 mt-1 ml-1">
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-up' ? null : 'thumbs-up')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-up'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-[oklch(0.28_0.03_55)] text-[oklch(0.45_0.03_55)]'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-down' ? null : 'thumbs-down')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-down'
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-[oklch(0.28_0.03_55)] text-[oklch(0.45_0.03_55)]'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-[oklch(0.40_0.03_55)] ml-1">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {isUser && (
          <div className="flex justify-end mt-0.5 mr-1">
            <span className="text-[10px] text-[oklch(0.45_0.03_55)]">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Chat Message List ────────────────────────────────────────────────────────

function ChatMessageList({
  messages,
  isSending,
  onReact,
}: {
  messages: ChatMessage[]
  isSending: boolean
  onReact: (messageId: string, reaction: ChatReaction) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
        <div className="w-16 h-16 rounded-full bg-[oklch(0.25_0.03_55)] flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-amber-400/50" />
        </div>
        <p className="text-[oklch(0.55_0.04_55)] text-sm">
          Start a conversation with your artist.
        </p>
        <p className="text-[oklch(0.40_0.03_55)] text-xs max-w-[260px]">
          Ask about their day, discuss music ideas, or share inspiration.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} onReact={onReact} />
      ))}

      {isSending && (
        <div className="flex justify-start mb-3">
          <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[oklch(0.25_0.03_55)] border border-[oklch(0.32_0.03_55)]">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chat Input ───────────────────────────────────────────────────────────────

function ChatInput({
  onSend,
  isSending,
  onRequestPhoto,
}: {
  onSend: (content: string) => void
  isSending: boolean
  onRequestPhoto: () => void
}) {
  const [text, setText] = useState('')

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    onSend(trimmed)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 py-3 border-t border-[oklch(0.32_0.03_55)] bg-[oklch(0.18_0.02_55)]">
      <div className="flex items-center gap-2">
        <button
          onClick={onRequestPhoto}
          className="p-2 rounded-lg hover:bg-[oklch(0.25_0.03_55)] transition-colors flex-shrink-0"
          title="Request photo"
        >
          <Camera className="w-5 h-5 text-[oklch(0.55_0.04_55)]" />
        </button>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-[oklch(0.22_0.025_55)] border-[oklch(0.32_0.03_55)] text-[oklch(0.88_0.02_55)] placeholder:text-[oklch(0.45_0.03_55)] rounded-xl focus-visible:ring-amber-500/50"
          disabled={isSending}
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          size="icon"
          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-[oklch(0.15_0.02_55)] disabled:opacity-40 flex-shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Living Context Drawer ────────────────────────────────────────────────────

function LivingContextDrawer({ context }: { context: LivingContext }) {
  return (
    <div className="px-4 py-3 border-b border-[oklch(0.32_0.03_55)] bg-[oklch(0.19_0.02_55)]">
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-[oklch(0.60_0.04_55)]">
          <Clock className="w-3.5 h-3.5" />
          <span>{context.timeOfDay} &middot; {context.dayOfWeek}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[oklch(0.60_0.04_55)]">
          <MapPin className="w-3.5 h-3.5" />
          <span>{context.currentLocation}</span>
        </div>
        <div className="text-[oklch(0.55_0.04_55)]">
          {context.activityDescription}
        </div>
      </div>
    </div>
  )
}

// ─── Inspiration Feed (lazy-loaded) ──────────────────────────────────────────

import { InspirationFeed } from './InspirationFeed'

// ─── Main Chat Page ──────────────────────────────────────────────────────────

interface ChatPageProps {
  userId: string
}

export function ChatPage({ userId }: ChatPageProps) {
  const {
    activeArtistId: _chatArtistId,
    messages,
    isLoading,
    isSending,
    livingContext,
    isLoadingContext,
    openChat,
    closeChat,
    sendMessage,
    reactToMessage,
    refreshStatus,
    requestPhoto,
  } = useArtistChatStore()

  const {
    artists,
    activeArtistId: dnaActiveArtistId,
    draft,
    isInitialized,
    initialize,
    loadArtistIntoDraft,
  } = useArtistDnaStore()

  const { setActiveTab, setMusicLabSubTab } = useLayoutStore()

  const [showInspiration, setShowInspiration] = useState(false)
  const [showContext, setShowContext] = useState(false)

  // Initialize the artist DNA store
  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  // Open chat when an artist is selected in DNA store
  const activeArtistId = dnaActiveArtistId
  const activeArtist = artists.find((a) => a.id === activeArtistId)

  const handleSelectArtist = useCallback(
    async (artistId: string) => {
      loadArtistIntoDraft(artistId)
      const artist = artists.find((a) => a.id === artistId)
      if (artist) {
        await openChat(artistId, userId, artist.dna)
      }
    },
    [loadArtistIntoDraft, artists, openChat, userId],
  )

  const handleBack = useCallback(async () => {
    await closeChat(userId)
  }, [closeChat, userId])

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeArtist) return
      await sendMessage(content, userId, activeArtist.dna)
    },
    [activeArtist, sendMessage, userId],
  )

  const handleReact = useCallback(
    async (messageId: string, reaction: ChatReaction) => {
      await reactToMessage(messageId, reaction)
    },
    [reactToMessage],
  )

  const handleRefresh = useCallback(async () => {
    if (!activeArtist) return
    await refreshStatus(activeArtist.dna)
  }, [activeArtist, refreshStatus])

  const handleRequestPhoto = useCallback(async () => {
    if (!activeArtist) return
    await requestPhoto('selfie requested by user', activeArtist.dna)
  }, [activeArtist, requestPhoto])

  // ── No artist selected: show artist picker ────────────────────────────────
  if (!activeArtistId || !activeArtist) {
    return (
      <div className="flex flex-col h-full bg-[oklch(0.18_0.02_55)]">
        <div className="px-4 py-3 border-b border-[oklch(0.32_0.03_55)] bg-[oklch(0.20_0.025_55)]">
          <h2 className="font-semibold text-[oklch(0.92_0.02_55)] tracking-[-0.025em]">Artist Chat</h2>
          <p className="text-xs text-[oklch(0.55_0.04_55)]">Choose an artist to start chatting</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="w-20 h-20 rounded-full bg-[oklch(0.22_0.025_55)] border-2 border-dashed border-[oklch(0.35_0.03_55)] flex items-center justify-center">
            <User className="w-8 h-8 text-[oklch(0.45_0.03_55)]" />
          </div>

          {isInitialized && artists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md w-full">
              {artists.map((a) => {
                const portrait = a.dna.look?.portraitUrl
                const initials = a.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <button
                    key={a.id}
                    onClick={() => handleSelectArtist(a.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-[0.625rem] border border-[oklch(0.32_0.03_55)] bg-[oklch(0.22_0.025_55)] hover:border-amber-500/50 hover:bg-[oklch(0.25_0.03_55)] transition-all"
                  >
                    <div className="w-14 h-14 rounded-full ring-2 ring-[oklch(0.35_0.03_55)] overflow-hidden flex items-center justify-center bg-[oklch(0.28_0.03_55)]">
                      {portrait ? (
                        <img src={portrait} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-[oklch(0.55_0.04_55)]">{initials}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-[oklch(0.85_0.02_55)] truncate max-w-full">
                      {a.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : isInitialized ? (
            <div className="text-center space-y-3">
              <p className="text-[oklch(0.55_0.04_55)] text-sm">No artists yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('music-lab')
                  setMusicLabSubTab('artist-lab')
                }}
                className="border-[oklch(0.32_0.03_55)] text-[oklch(0.75_0.04_55)] hover:bg-[oklch(0.25_0.03_55)]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Artist
              </Button>
            </div>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          )}
        </div>
      </div>
    )
  }

  // ── Inspiration feed overlay ──────────────────────────────────────────────
  if (showInspiration) {
    return (
      <InspirationFeed
        artistId={activeArtistId}
        onClose={() => setShowInspiration(false)}
      />
    )
  }

  // ── Active chat ───────────────────────────────────────────────────────────
  const artistName = activeArtist.name || 'Artist'
  const portraitUrl = draft.look?.portraitUrl

  return (
    <div className="flex flex-col h-full bg-[oklch(0.18_0.02_55)]">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            <p className="text-sm text-[oklch(0.55_0.04_55)]">Connecting to {artistName}...</p>
          </div>
        </div>
      ) : (
        <>
          <ChatHeader
            artistName={artistName}
            portraitUrl={portraitUrl}
            livingContext={livingContext}
            isLoadingContext={isLoadingContext}
            onRefresh={handleRefresh}
            onBack={handleBack}
            onInspiration={() => setShowInspiration(true)}
          />

          {livingContext && showContext && (
            <LivingContextDrawer context={livingContext} />
          )}

          {livingContext && !showContext && (
            <button
              onClick={() => setShowContext(true)}
              className="px-4 py-1.5 text-xs text-[oklch(0.50_0.04_55)] hover:text-[oklch(0.65_0.04_55)] bg-[oklch(0.19_0.02_55)] border-b border-[oklch(0.28_0.03_55)] transition-colors text-left"
            >
              {livingContext.currentActivity} &middot; tap for details
            </button>
          )}

          {showContext && livingContext && (
            <button
              onClick={() => setShowContext(false)}
              className="px-4 py-1 text-[10px] text-[oklch(0.40_0.03_55)] hover:text-[oklch(0.55_0.04_55)] transition-colors text-left"
            >
              Hide details
            </button>
          )}

          <ChatMessageList
            messages={messages}
            isSending={isSending}
            onReact={handleReact}
          />

          <ChatInput
            onSend={handleSend}
            isSending={isSending}
            onRequestPhoto={handleRequestPhoto}
          />
        </>
      )}
    </div>
  )
}
