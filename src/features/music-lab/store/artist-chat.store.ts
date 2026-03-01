'use client'

/**
 * Artist Chat Store
 * Manages chat state, living context, memory, and personality prints
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, ChatReaction } from '../types/artist-chat.types'
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

  // Living context
  livingContext: LivingContext | null
  isLoadingContext: boolean

  // Memory
  memory: ArtistMemory | null
  isLoadingMemory: boolean

  // Personality print
  personalityPrint: PersonalityPrint | null

  // Photo generation
  isGeneratingPhoto: boolean

  // Actions
  openChat: (artistId: string, userId: string, dna: ArtistDNA) => Promise<void>
  closeChat: (userId: string) => Promise<void>
  sendMessage: (content: string, userId: string, dna: ArtistDNA) => Promise<void>
  reactToMessage: (messageId: string, reaction: ChatReaction) => Promise<void>
  refreshStatus: (dna: ArtistDNA) => Promise<void>
  requestPhoto: (context: string, dna: ArtistDNA) => Promise<string | null>

  // Internal
  loadMessages: (artistId: string, userId: string) => Promise<void>
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
      livingContext: null,
      isLoadingContext: false,
      memory: null,
      isLoadingMemory: false,
      personalityPrint: null,
      isGeneratingPhoto: false,

      openChat: async (artistId, userId, dna) => {
        set({ activeArtistId: artistId, isLoading: true, messages: [] })

        // Load everything in parallel
        await Promise.all([
          get().loadMessages(artistId, userId),
          get().loadMemory(artistId, userId),
          get().loadPersonalityPrint(artistId, userId),
          get().generateLivingContext(dna),
        ])

        set({ isLoading: false })
      },

      closeChat: async (userId) => {
        const { activeArtistId, messages, memory } = get()
        if (!activeArtistId || !messages.length) return

        // Extract memory updates before closing
        await get().updateMemory(userId)
        set({ activeArtistId: null, messages: [], livingContext: null, memory: null, personalityPrint: null })
      },

      sendMessage: async (content, userId, dna) => {
        const { activeArtistId, personalityPrint, livingContext, memory, messages } = get()
        if (!activeArtistId || !personalityPrint) return

        set({ isSending: true })

        // Optimistically add user message
        const tempUserMsg: ChatMessage = {
          id: `temp-${Date.now()}`,
          artistId: activeArtistId,
          role: 'user',
          content,
          messageType: 'text',
          createdAt: new Date().toISOString(),
        }
        set(state => ({ messages: [...state.messages, tempUserMsg] }))

        try {
          const res = await fetch('/api/artist-chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artistId: activeArtistId,
              userMessage: content,
              dna,
              personalityPrint,
              livingContext,
              memory,
              recentMessages: messages.slice(-10),
            }),
          })

          if (res.ok) {
            const data = await res.json()

            set(state => {
              // Replace temp user message with real one, add artist message
              const filtered = state.messages.filter(m => m.id !== tempUserMsg.id)
              const newMessages = [...filtered]
              if (data.userMessage) newMessages.push(data.userMessage)
              if (data.artistMessage) newMessages.push(data.artistMessage)
              return { messages: newMessages }
            })

            // Handle photo trigger
            if (data.photoTrigger) {
              get().requestPhoto('selfie from chat context', dna)
            }
          }
        } catch (e) {
          console.error('Send message failed:', e)
        } finally {
          set({ isSending: false })
        }
      },

      reactToMessage: async (messageId, reaction) => {
        const { activeArtistId } = get()
        if (!activeArtistId) return

        // Optimistic update
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

            // Add photo message
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
      loadMessages: async (artistId, userId) => {
        try {
          // Messages come from DB via service, but we call from client
          // So we use the API pattern instead
          const res = await fetch(`/api/artist-chat/message?artistId=${artistId}`, {
            method: 'GET',
          })
          if (res.ok) {
            const data = await res.json()
            set({ messages: data.messages || [] })
          }
        } catch {
          // Messages will load fresh — no cached state needed
          void userId // used for auth on server side
        }
      },

      loadMemory: async (artistId, userId) => {
        set({ isLoadingMemory: true })
        try {
          // Memory is loaded server-side; for now just reset
          void artistId
          void userId
        } finally {
          set({ isLoadingMemory: false })
        }
      },

      loadPersonalityPrint: async (artistId, userId) => {
        try {
          void artistId
          void userId
          // Print is loaded when opening chat; set from artist-dna store
        } catch {
          // Will be generated on demand
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
          livingContext: null,
          isLoadingContext: false,
          memory: null,
          isLoadingMemory: false,
          personalityPrint: null,
          isGeneratingPhoto: false,
        })
      },
    }),
    {
      name: 'artist-chat',
      partialize: (state) => ({
        activeArtistId: state.activeArtistId,
      }),
    }
  )
)
