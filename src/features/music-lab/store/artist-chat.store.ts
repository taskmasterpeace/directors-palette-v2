'use client'

/**
 * Artist Chat Store
 * Manages chat state, living context, memory, personality prints, and conversation threads
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, ChatConversation, ChatReaction } from '../types/artist-chat.types'
import type { LivingContext } from '../types/living-context.types'
import type { ArtistMemory } from '../types/artist-memory.types'
import type { PersonalityPrint } from '../types/personality-print.types'
import type { ArtistDNA } from '../types/artist-dna.types'

interface ArtistChatState {
  // Active chat
  activeArtistId: string | null
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean

  // Conversations
  conversations: ChatConversation[]
  activeConversationId: string | null
  isLoadingConversations: boolean

  // Living context
  livingContext: LivingContext | null
  isLoadingContext: boolean

  // Memory
  memory: ArtistMemory | null
  isLoadingMemory: boolean

  // Personality print
  personalityPrint: PersonalityPrint | null

  // Quick reply suggestions
  quickReplies: string[]

  // Photo generation
  isGeneratingPhoto: boolean

  // Actions
  openChat: (artistId: string, userId: string, dna: ArtistDNA) => Promise<void>
  closeChat: (userId: string) => void
  sendMessage: (content: string, userId: string, dna: ArtistDNA) => Promise<void>
  reactToMessage: (messageId: string, reaction: ChatReaction) => Promise<void>
  refreshStatus: (dna: ArtistDNA) => Promise<void>
  requestPhoto: (context: string, dna: ArtistDNA) => Promise<string | null>

  // Conversation actions
  loadConversations: (artistId: string) => Promise<void>
  selectConversation: (conversationId: string | null, artistId: string) => Promise<void>
  createConversation: (artistId: string) => Promise<ChatConversation | null>
  deleteConversation: (conversationId: string, artistId: string) => Promise<void>

  // Internal
  loadMessages: (artistId: string, userId: string, conversationId?: string) => Promise<void>
  loadMemory: (artistId: string, userId: string) => Promise<void>
  loadPersonalityPrint: (artistId: string, userId: string) => Promise<void>
  generateLivingContext: (dna: ArtistDNA) => Promise<void>
  updateMemory: (userId: string) => Promise<void>
  reset: () => void
}

export const useArtistChatStore = create<ArtistChatState>()(
  persist(
    (set, get) => ({
      activeArtistId: null,
      messages: [],
      isLoading: false,
      isSending: false,
      conversations: [],
      activeConversationId: null,
      isLoadingConversations: false,
      livingContext: null,
      isLoadingContext: false,
      memory: null,
      isLoadingMemory: false,
      personalityPrint: null,
      quickReplies: [],
      isGeneratingPhoto: false,

      openChat: async (artistId, userId, dna) => {
        set({ activeArtistId: artistId, isLoading: true, messages: [], conversations: [], activeConversationId: null })

        // Phase 1: Load conversations + fast data in parallel
        await Promise.all([
          get().loadConversations(artistId),
          get().loadMemory(artistId, userId),
          get().loadPersonalityPrint(artistId, userId),
        ])

        // If conversations exist, select the most recent one; otherwise load legacy messages
        const { conversations } = get()
        if (conversations.length > 0) {
          await get().loadMessages(artistId, userId, conversations[0].id)
          set({ activeConversationId: conversations[0].id, isLoading: false })
        } else {
          // Load legacy messages (no conversation_id)
          await get().loadMessages(artistId, userId)
          set({ isLoading: false })
        }

        // Phase 2: Generate living context in background
        get().generateLivingContext(dna)

        // Phase 3: If no personality print was loaded, generate one
        if (!get().personalityPrint) {
          try {
            const genRes = await fetch('/api/artist-dna/generate-personality-print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ artistId, dna }),
            })
            if (genRes.ok) {
              const genData = await genRes.json()
              if (genData.print) {
                set({ personalityPrint: genData.print })
              }
            }
          } catch {
            // Will generate on first message if needed
          }
        }
      },

      closeChat: (userId) => {
        const { activeArtistId, messages } = get()

        set({
          activeArtistId: null,
          messages: [],
          conversations: [],
          activeConversationId: null,
          livingContext: null,
          memory: null,
          personalityPrint: null,
          quickReplies: [],
        })

        if (activeArtistId && messages.length) {
          fetch('/api/artist-chat/update-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistId: activeArtistId,
              recentMessages: messages,
              existingMemory: null,
              artistName: 'Artist',
            }),
          }).catch(() => { /* best-effort */ })
          void userId
        }
      },

      // --- Conversation actions ---

      loadConversations: async (artistId) => {
        set({ isLoadingConversations: true })
        try {
          const res = await fetch(`/api/artist-chat/conversations?artistId=${artistId}`)
          if (res.ok) {
            const data = await res.json()
            set({ conversations: data.conversations || [] })
          }
        } catch {
          // No conversations loaded
        } finally {
          set({ isLoadingConversations: false })
        }
      },

      selectConversation: async (conversationId, artistId) => {
        const { activeArtistId } = get()
        const aid = artistId || activeArtistId
        if (!aid) return

        set({ activeConversationId: conversationId, messages: [], isLoading: true, quickReplies: [] })

        // Fetch the user ID from current auth context — we'll pass via loadMessages
        // loadMessages handles auth server-side, so just pass the conversationId
        try {
          const url = conversationId
            ? `/api/artist-chat/message?artistId=${aid}&conversationId=${conversationId}`
            : `/api/artist-chat/message?artistId=${aid}`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            set({ messages: data.messages || [] })
          }
        } catch {
          // Empty messages
        } finally {
          set({ isLoading: false })
        }
      },

      createConversation: async (artistId) => {
        try {
          const res = await fetch('/api/artist-chat/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistId }),
          })
          if (res.ok) {
            const data = await res.json()
            const conv = data.conversation
            if (conv) {
              set(state => ({
                conversations: [conv, ...state.conversations],
                activeConversationId: conv.id,
                messages: [],
                quickReplies: [],
              }))
              return conv
            }
          }
        } catch {
          // Failed to create
        }
        return null
      },

      deleteConversation: async (conversationId, artistId) => {
        try {
          await fetch(`/api/artist-chat/conversations?id=${conversationId}`, { method: 'DELETE' })
          const remaining = get().conversations.filter(c => c.id !== conversationId)
          set({ conversations: remaining })

          // If we deleted the active conversation, switch to most recent or clear
          if (get().activeConversationId === conversationId) {
            if (remaining.length > 0) {
              await get().selectConversation(remaining[0].id, artistId)
            } else {
              set({ activeConversationId: null, messages: [] })
            }
          }
        } catch {
          // Failed to delete
        }
      },

      sendMessage: async (content, _userId, dna) => {
        const { activeArtistId, livingContext, memory, messages } = get()
        if (!activeArtistId) return

        let { personalityPrint, activeConversationId } = get()

        // If no personality print loaded, generate one on demand
        if (!personalityPrint) {
          set({ isSending: true })
          try {
            const genRes = await fetch('/api/artist-dna/generate-personality-print', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ artistId: activeArtistId, dna }),
            })
            if (genRes.ok) {
              const genData = await genRes.json()
              if (genData.print) {
                personalityPrint = genData.print
                set({ personalityPrint })
              }
            }
          } catch (e) {
            console.error('On-demand personality print generation failed:', e)
          }

          if (!personalityPrint) {
            const errorMsg: ChatMessage = {
              id: `error-${Date.now()}`,
              artistId: activeArtistId,
              role: 'artist',
              content: 'Still warming up... try sending your message again in a moment.',
              messageType: 'text',
              createdAt: new Date().toISOString(),
            }
            set(state => ({ messages: [...state.messages, errorMsg], isSending: false }))
            return
          }
        }

        // Auto-create conversation if none active
        if (!activeConversationId) {
          const conv = await get().createConversation(activeArtistId)
          if (conv) {
            activeConversationId = conv.id
          }
        }

        set({ isSending: true, quickReplies: [] })

        // Optimistically add user message
        const tempUserMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          artistId: activeArtistId,
          conversationId: activeConversationId || undefined,
          role: 'user',
          content,
          messageType: 'text',
          createdAt: new Date().toISOString(),
        }
        set(state => ({ messages: [...state.messages, tempUserMsg] }))

        // Create streaming placeholder for artist response
        const streamingMsgId = `streaming-${Date.now()}`
        const streamingMsg: ChatMessage = {
          id: streamingMsgId,
          artistId: activeArtistId,
          conversationId: activeConversationId || undefined,
          role: 'artist',
          content: '',
          messageType: 'text',
          createdAt: new Date().toISOString(),
        }
        set(state => ({ messages: [...state.messages, streamingMsg] }))

        try {
          const res = await fetch('/api/artist-chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistId: activeArtistId,
              conversationId: activeConversationId,
              userMessage: content,
              dna,
              personalityPrint,
              livingContext,
              memory,
              recentMessages: messages.slice(-10),
            }),
          })

          if (!res.ok) {
            console.error('Chat API returned', res.status)
            set(state => ({
              messages: state.messages.map(m =>
                m.id === streamingMsgId
                  ? { ...m, content: "Something went wrong. Try sending your message again." }
                  : m
              ),
            }))
            return
          }

          // Auto-title conversation from first user message
          if (activeConversationId && messages.length === 0) {
            const title = content.length > 40 ? content.substring(0, 40) + '...' : content
            fetch('/api/artist-chat/conversations', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: activeConversationId, title }),
            }).catch(() => {})
            // Update local state
            set(state => ({
              conversations: state.conversations.map(c =>
                c.id === activeConversationId ? { ...c, title } : c
              ),
            }))
          }

          // Read SSE stream
          const reader = res.body?.getReader()
          if (!reader) {
            set(state => ({
              messages: state.messages.map(m =>
                m.id === streamingMsgId
                  ? { ...m, content: "Couldn't get a response right now. Try again." }
                  : m
              ),
            }))
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (!raw) continue

              try {
                const event = JSON.parse(raw)

                if (event.type === 'user_saved' && event.message) {
                  set(state => ({
                    messages: state.messages.map(m =>
                      m.id === tempUserMsg.id ? event.message : m
                    ),
                  }))
                } else if (event.type === 'chunk' && event.content) {
                  set(state => ({
                    messages: state.messages.map(m =>
                      m.id === streamingMsgId
                        ? { ...m, content: m.content + event.content }
                        : m
                    ),
                  }))
                } else if (event.type === 'done' && event.message) {
                  set(state => ({
                    messages: state.messages.map(m =>
                      m.id === streamingMsgId ? event.message : m
                    ),
                    quickReplies: event.quickReplies?.length ? event.quickReplies : [],
                  }))

                  if (event.photoTrigger) {
                    get().requestPhoto('selfie from chat context', dna)
                  }
                } else if (event.type === 'error') {
                  set(state => ({
                    messages: state.messages.map(m =>
                      m.id === streamingMsgId
                        ? { ...m, content: "Something went wrong. Try sending your message again." }
                        : m
                    ),
                  }))
                }
              } catch {
                // Skip malformed SSE lines
              }
            }
          }
        } catch (e) {
          console.error('Send message failed:', e)
          set(state => ({
            messages: state.messages.map(m =>
              m.id === streamingMsgId
                ? { ...m, content: "Connection issue. Check your network and try again." }
                : m
            ),
          }))
        } finally {
          set({ isSending: false })
        }
      },

      reactToMessage: async (messageId, reaction) => {
        const { activeArtistId } = get()
        if (!activeArtistId) return

        set(state => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, reaction } : m
          ),
        }))

        try {
          await fetch('/api/artist-chat/react', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, reaction, artistId: activeArtistId }),
          })
        } catch (e) {
          console.error('React failed:', e)
        }
      },

      refreshStatus: async (dna) => {
        await get().generateLivingContext(dna)
      },

      requestPhoto: async (context, dna) => {
        const { activeArtistId, livingContext } = get()
        if (!activeArtistId) return null

        set({ isGeneratingPhoto: true })

        try {
          const res = await fetch('/api/artist-chat/generate-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistId: activeArtistId,
              dna,
              livingContext,
              photoContext: context,
            }),
          })

          if (res.ok) {
            const data = await res.json()

            const photoMsg: ChatMessage = {
              id: `photo-${Date.now()}`,
              artistId: activeArtistId,
              role: 'artist',
              content: '',
              messageType: 'photo',
              photoUrl: data.imageUrl,
              createdAt: new Date().toISOString(),
            }
            set(state => ({ messages: [...state.messages, photoMsg] }))
            return data.imageUrl
          }
        } catch (e) {
          console.error('Photo request failed:', e)
        } finally {
          set({ isGeneratingPhoto: false })
        }
        return null
      },

      // Internal actions
      loadMessages: async (artistId, userId, conversationId) => {
        try {
          const params = new URLSearchParams({ artistId })
          if (conversationId) params.set('conversationId', conversationId)
          const res = await fetch(`/api/artist-chat/message?${params}`)
          if (res.ok) {
            const data = await res.json()
            set({ messages: data.messages || [] })
          }
        } catch {
          void userId
        }
      },

      loadMemory: async (artistId, userId) => {
        set({ isLoadingMemory: true })
        try {
          void artistId
          void userId
        } finally {
          set({ isLoadingMemory: false })
        }
      },

      loadPersonalityPrint: async (artistId, _userId) => {
        try {
          const res = await fetch(`/api/artist-chat/personality-print?artistId=${artistId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.print) {
              set({ personalityPrint: data.print })
              return
            }
          }
        } catch (e) {
          console.error('Load personality print failed:', e)
        }
      },

      generateLivingContext: async (dna) => {
        const { activeArtistId } = get()
        if (!activeArtistId) return

        set({ isLoadingContext: true })
        try {
          const res = await fetch('/api/artist-chat/generate-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistId: activeArtistId, dna }),
          })

          if (res.ok) {
            const data = await res.json()
            set({ livingContext: data.livingContext })
          }
        } catch (e) {
          console.error('Generate living context failed:', e)
        } finally {
          set({ isLoadingContext: false })
        }
      },

      updateMemory: async (userId) => {
        const { activeArtistId, messages, memory } = get()
        if (!activeArtistId || !messages.length) return

        try {
          await fetch('/api/artist-chat/update-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistId: activeArtistId,
              recentMessages: messages,
              existingMemory: memory || {
                aboutUser: { name: null, preferences: [], musicTaste: [], personalDetails: [], workStyle: [], petPeeves: [] },
                sessions: [],
                relationship: { rapportLevel: 10, insideJokes: [], sharedReferences: [], conflictHistory: [], trust: 10 },
                selfReflections: [],
                facts: [],
              },
              artistName: 'Artist',
            }),
          })
        } catch (e) {
          console.error('Memory update failed:', e)
          void userId
        }
      },

      reset: () => {
        set({
          activeArtistId: null,
          messages: [],
          isLoading: false,
          isSending: false,
          conversations: [],
          activeConversationId: null,
          isLoadingConversations: false,
          livingContext: null,
          isLoadingContext: false,
          memory: null,
          isLoadingMemory: false,
          personalityPrint: null,
          isGeneratingPhoto: false,
          quickReplies: [],
        })
      },
    }),
    {
      name: 'artist-chat',
      partialize: () => ({}),
    }
  )
)
