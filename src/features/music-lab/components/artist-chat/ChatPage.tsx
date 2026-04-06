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
  Copy,
  Check,
  PenLine,
  Music,
  Headphones,
  ScrollText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useArtistChatStore } from '@/features/music-lab/store/artist-chat.store'
import { useArtistDnaStore } from '@/features/music-lab/store/artist-dna.store'
import { useWritingStudioStore } from '@/features/music-lab/store/writing-studio.store'
import { useLayoutStore } from '@/store/layout.store'
import type { ChatMessage, ChatReaction, ChatActionData } from '@/features/music-lab/types/artist-chat.types'
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
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
      <button
        onClick={onBack}
        className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="w-10 h-10 rounded-full ring-2 ring-primary/60 overflow-hidden flex-shrink-0 flex items-center justify-center bg-muted/30">
        {portraitUrl ? (
          <img src={portraitUrl} alt={artistName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">{initials}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{artistName}</p>
        {livingContext ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{livingContext.statusEmoji}</span>
            <span className="truncate">{livingContext.statusLine}</span>
          </div>
        ) : isLoadingContext ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading context...</span>
          </div>
        ) : null}
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoadingContext}
        className="p-2 rounded-lg hover:bg-muted/40 transition-colors disabled:opacity-40"
        title="Refresh status"
      >
        <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoadingContext ? 'animate-spin' : ''}`} />
      </button>

      <button
        onClick={onInspiration}
        className="p-2 rounded-lg hover:bg-muted/40 transition-colors"
        title="Inspiration feed"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  )
}

// ─── Action Icons ────────────────────────────────────────────────────────────

function getActionIcon(type: ChatActionData['type']) {
  switch (type) {
    case 'start-song': return Music
    case 'check-beat': return Headphones
    case 'view-lyrics': return ScrollText
    case 'work-on-hook': return Sparkles
    default: return Music
  }
}

// ─── Chat Message Bubble ──────────────────────────────────────────────────────

function ChatBubble({
  message,
  onReact,
  onAction,
  onSendLyricsToStudio,
  onGetSunoPrompt,
}: {
  message: ChatMessage
  onReact: (messageId: string, reaction: ChatReaction) => void
  onAction: (action: ChatActionData) => void
  onSendLyricsToStudio: (lyrics: string) => void
  onGetSunoPrompt: (lyrics: string) => void
}) {
  const isUser = message.role === 'user'
  const isPhoto = message.messageType === 'photo'
  const isAction = message.messageType === 'action'
  const isLyrics = message.messageType === 'lyrics'
  const isSunoPrompt = message.messageType === 'suno-prompt'
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const timestamp = (
    <span className="text-[10px] text-muted-foreground/60">
      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  )

  // ── Lyrics bubble ──
  if (isLyrics && !isUser) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] space-y-1.5">
          {/* Lyrics card with amber accent */}
          <div className="rounded-2xl overflow-hidden bg-amber-500/[0.06] border border-amber-500/20 shadow-[0_2px_12px_rgba(245,158,11,0.06)]">
            <div className="flex">
              <div className="w-1 bg-gradient-to-b from-amber-400 to-amber-600 shrink-0 rounded-l-full" />
              <div className="px-3.5 py-3 flex-1 min-w-0">
                <pre className="font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i} className="block">{line || '\u00A0'}</span>
                  ))}
                </pre>
              </div>
            </div>
          </div>

          {/* Lyrics action bar: Copy + Send to Studio + Reactions */}
          <div className="flex items-center gap-1 ml-1 flex-wrap">
            <button
              onClick={() => handleCopy(message.content)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors hover:bg-muted/40 text-muted-foreground/60"
              title="Copy lyrics"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={() => onSendLyricsToStudio(message.content)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors hover:bg-amber-500/20 text-amber-400/80 hover:text-amber-400"
              title="Send to Writing Studio"
            >
              <PenLine className="w-3 h-3" />
              <span>Edit in Studio</span>
            </button>
            <button
              onClick={() => onGetSunoPrompt(message.content)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors hover:bg-violet-500/20 text-violet-400/80 hover:text-violet-400"
              title="Generate a Suno prompt for these lyrics"
            >
              <Music className="w-3 h-3" />
              <span>Get Suno Prompt</span>
            </button>
            <div className="w-px h-3 bg-border/40 mx-0.5" />
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-up' ? null : 'thumbs-up')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-up'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-muted/40 text-muted-foreground/60'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-down' ? null : 'thumbs-down')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-down'
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-muted/40 text-muted-foreground/60'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            {timestamp}
          </div>
        </div>
      </div>
    )
  }

  // ── Suno prompt card ──
  if (isSunoPrompt && !isUser) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] space-y-1.5">
          <div className="rounded-2xl overflow-hidden bg-violet-500/[0.06] border border-violet-500/20 shadow-[0_2px_12px_rgba(139,92,246,0.06)]">
            <div className="flex">
              <div className="w-1 bg-gradient-to-b from-violet-400 to-fuchsia-600 shrink-0 rounded-l-full" />
              <div className="px-3.5 py-3 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <Music className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Suno Prompt</span>
                </div>
                <p className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          </div>

          {/* Suno prompt action bar */}
          <div className="flex items-center gap-1 ml-1 flex-wrap">
            <button
              onClick={() => handleCopy(message.content)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors hover:bg-muted/40 text-muted-foreground/60"
              title="Copy Suno prompt"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Prompt'}</span>
            </button>
            <div className="w-px h-3 bg-border/40 mx-0.5" />
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-up' ? null : 'thumbs-up')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-up'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'hover:bg-muted/40 text-muted-foreground/60'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-down' ? null : 'thumbs-down')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-down'
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-muted/40 text-muted-foreground/60'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            {timestamp}
          </div>
        </div>
      </div>
    )
  }

  // ── Action button ──
  if (isAction && message.actionData && !isUser) {
    const ActionIcon = getActionIcon(message.actionData.type)
    return (
      <div className="flex justify-start mb-3">
        <div className="space-y-1">
          <button
            onClick={() => onAction(message.actionData!)}
            className="group/action flex items-center gap-2.5 w-full max-w-[280px] rounded-xl px-3.5 py-2.5 bg-amber-500/[0.06] border border-amber-500/25 hover:bg-amber-500/[0.12] hover:border-amber-500/40 hover:shadow-[0_0_16px_rgba(245,158,11,0.1)] transition-all duration-200 text-left"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-amber-500/15 group-hover/action:bg-amber-500/25 transition-colors duration-200">
              <ActionIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{message.actionData.label}</p>
              <p className="text-[11px] text-muted-foreground/70 capitalize">{message.actionData.type.replace(/-/g, ' ')}</p>
            </div>
            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-500/10 group-hover/action:bg-amber-500/20 transition-colors duration-200">
              <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <div className="ml-1">{timestamp}</div>
        </div>
      </div>
    )
  }

  // ── Photo ──
  if (isPhoto && message.photoUrl) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className="max-w-[80%] space-y-1">
          <div className="rounded-2xl overflow-hidden border border-border">
            <img src={message.photoUrl} alt="Shared photo" className="max-w-[280px] w-full object-cover" />
          </div>
          {!isUser && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => onReact(message.id, message.reaction === 'thumbs-up' ? null : 'thumbs-up')}
                className={`p-1 rounded-md transition-colors ${message.reaction === 'thumbs-up' ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-muted/40 text-muted-foreground/60'}`}
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => onReact(message.id, message.reaction === 'thumbs-down' ? null : 'thumbs-down')}
                className={`p-1 rounded-md transition-colors ${message.reaction === 'thumbs-down' ? 'bg-red-500/20 text-red-400' : 'hover:bg-muted/40 text-muted-foreground/60'}`}
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
              {timestamp}
            </div>
          )}
          {isUser && <div className="flex justify-end mr-1">{timestamp}</div>}
        </div>
      </div>
    )
  }

  // ── Default: text bubble ──
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className="max-w-[80%] space-y-1">
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-amber-500 text-background rounded-br-md'
              : 'bg-muted/30 text-foreground border border-border rounded-bl-md'
          }`}
        >
          {message.content}
        </div>

        {!isUser && (
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-up' ? null : 'thumbs-up')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-up'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-muted/40 text-muted-foreground/60'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onReact(message.id, message.reaction === 'thumbs-down' ? null : 'thumbs-down')}
              className={`p-1 rounded-md transition-colors ${
                message.reaction === 'thumbs-down'
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-muted/40 text-muted-foreground/60'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
            {timestamp}
          </div>
        )}

        {isUser && <div className="flex justify-end mr-1">{timestamp}</div>}
      </div>
    </div>
  )
}

// ─── Chat Message List ────────────────────────────────────────────────────────

function ChatMessageList({
  messages,
  isSending,
  onReact,
  onAction,
  onSendLyricsToStudio,
  onGetSunoPrompt,
}: {
  messages: ChatMessage[]
  isSending: boolean
  onReact: (messageId: string, reaction: ChatReaction) => void
  onAction: (action: ChatActionData) => void
  onSendLyricsToStudio: (lyrics: string) => void
  onGetSunoPrompt: (lyrics: string) => void
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
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-amber-400/50" />
        </div>
        <p className="text-muted-foreground text-sm">
          Start a conversation with your artist.
        </p>
        <p className="text-muted-foreground/60 text-xs max-w-[260px]">
          Ask about their day, discuss music ideas, or share inspiration.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      {messages.map((msg) => (
        <ChatBubble
          key={msg.id}
          message={msg}
          onReact={onReact}
          onAction={onAction}
          onSendLyricsToStudio={onSendLyricsToStudio}
          onGetSunoPrompt={onGetSunoPrompt}
        />
      ))}

      {isSending && (
        <div className="flex justify-start mb-3">
          <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted/30 border border-border">
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
    <div className="px-4 py-3 border-t border-border bg-background">
      <div className="flex items-center gap-2">
        <button
          onClick={onRequestPhoto}
          className="p-2 rounded-lg hover:bg-muted/30 transition-colors flex-shrink-0"
          title="Request photo"
        >
          <Camera className="w-5 h-5 text-muted-foreground" />
        </button>

        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl focus-visible:ring-amber-500/50"
          disabled={isSending}
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          size="icon"
          className="rounded-xl bg-amber-500 hover:bg-amber-400 text-background disabled:opacity-40 flex-shrink-0"
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
    <div className="px-4 py-3 border-b border-border bg-background">
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{context.timeOfDay} &middot; {context.dayOfWeek}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{context.currentLocation}</span>
        </div>
        <div className="text-muted-foreground">
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
    activeArtistId: chatActiveArtistId,
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
    draft,
    isInitialized,
    initialize,
    loadArtistIntoDraft,
  } = useArtistDnaStore()

  const { setActiveTab, setMusicLabSubTab } = useLayoutStore()
  const { importSections, setActiveArtistId: setStudioArtistId, resetStudio, addSection } = useWritingStudioStore()

  const [showInspiration, setShowInspiration] = useState(false)
  const [showContext, setShowContext] = useState(false)

  // Initialize the artist DNA store
  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  // Chat store's activeArtistId is the source of truth for chat view
  const activeArtistId = chatActiveArtistId
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
    closeChat(userId)
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

  // Navigate to writing studio with context
  const navigateToStudio = useCallback((sectionType?: 'hook' | 'verse') => {
    if (activeArtistId) setStudioArtistId(activeArtistId)
    if (sectionType) addSection(sectionType)
    setActiveTab('music-lab')
    setMusicLabSubTab('writing-studio')
  }, [activeArtistId, setStudioArtistId, addSection, setActiveTab, setMusicLabSubTab])

  // Handle action button clicks from chat
  const handleAction = useCallback((action: ChatActionData) => {
    switch (action.type) {
      case 'start-song':
        if (activeArtistId) setStudioArtistId(activeArtistId)
        resetStudio()
        setActiveTab('music-lab')
        setMusicLabSubTab('writing-studio')
        break
      case 'work-on-hook':
        navigateToStudio('hook')
        break
      case 'check-beat':
        setActiveTab('music-lab')
        setMusicLabSubTab('sound-studio')
        break
      case 'view-lyrics':
        navigateToStudio()
        break
    }
  }, [activeArtistId, setStudioArtistId, resetStudio, navigateToStudio, setActiveTab, setMusicLabSubTab])

  // One-click: ask artist to generate a Suno prompt for given lyrics
  const handleGetSunoPrompt = useCallback(
    async (lyrics: string) => {
      if (!activeArtist) return
      const prompt = `Based on these lyrics I just wrote, give me a Suno prompt that captures the vibe, genre, mood, and sound:\n\n${lyrics}`
      await sendMessage(prompt, userId, activeArtist.dna)
    },
    [activeArtist, sendMessage, userId],
  )

  // Send lyrics from chat directly to writing studio import
  const handleSendLyricsToStudio = useCallback(async (lyrics: string) => {
    if (activeArtistId) setStudioArtistId(activeArtistId)

    // Call the analyze-lyrics API to detect sections
    try {
      const response = await fetch('/api/artist-dna/analyze-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics }),
      })

      if (response.ok) {
        const { sections: detected } = await response.json()
        if (detected?.length) {
          importSections(detected)
        }
      }
    } catch {
      // Fallback: import as a single verse section if API fails
      importSections([{ type: 'verse', label: 'Verse 1', lines: lyrics.split('\n') }])
    }

    setActiveTab('music-lab')
    setMusicLabSubTab('writing-studio')
  }, [activeArtistId, setStudioArtistId, importSections, setActiveTab, setMusicLabSubTab])

  // ── No artist selected: show artist picker ────────────────────────────────
  if (!activeArtistId || !activeArtist) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="px-4 py-3 border-b border-border bg-card">
          <h2 className="font-semibold text-foreground tracking-[-0.025em]">Artist Chat</h2>
          <p className="text-xs text-muted-foreground">Choose an artist to start chatting</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="w-20 h-20 rounded-full bg-muted/20 border-2 border-dashed border-border/60 flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground/60" />
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
                    className="flex flex-col items-center gap-2 p-4 rounded-[0.625rem] border border-border bg-muted/20 hover:border-amber-500/50 hover:bg-muted/30 transition-all"
                  >
                    <div className="w-14 h-14 rounded-full ring-2 ring-border/60 overflow-hidden flex items-center justify-center bg-muted/40">
                      {portrait ? (
                        <img src={portrait} alt={a.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">{initials}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground truncate max-w-full">
                      {a.name}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : isInitialized ? (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground text-sm">No artists yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveTab('music-lab')
                  setMusicLabSubTab('artist-lab')
                }}
                className="border-border text-foreground/80 hover:bg-muted/30"
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
    <div className="flex flex-col h-full bg-background">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting to {artistName}...</p>
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
              className="px-4 py-1.5 text-xs text-muted-foreground hover:text-muted-foreground bg-background border-b border-border/60 transition-colors text-left"
            >
              {livingContext.currentActivity} &middot; tap for details
            </button>
          )}

          {showContext && livingContext && (
            <button
              onClick={() => setShowContext(false)}
              className="px-4 py-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors text-left"
            >
              Hide details
            </button>
          )}

          <ChatMessageList
            messages={messages}
            isSending={isSending}
            onReact={handleReact}
            onAction={handleAction}
            onSendLyricsToStudio={handleSendLyricsToStudio}
            onGetSunoPrompt={handleGetSunoPrompt}
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
