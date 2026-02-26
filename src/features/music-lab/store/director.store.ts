/**
 * Director Store
 * Manages user directors from database and combines with static directors
 */

import { create } from 'zustand'
import type { DirectorFingerprint } from '../types/director.types'
import { directorService, UserDirector } from '../services/director.service'
import { DIRECTORS } from '../data/directors.data'
import { logger } from '@/lib/logger'

interface DirectorState {
  // User directors from database
  userDirectors: UserDirector[]
  isLoading: boolean
  isInitialized: boolean
  currentUserId: string | null

  // Actions
  initialize: (userId: string) => Promise<void>
  refreshDirectors: () => Promise<void>
  addDirector: (
    fingerprint: DirectorFingerprint,
    name: string,
    description?: string,
    communityItemId?: string
  ) => Promise<UserDirector | null>
  updateDirector: (
    directorId: string,
    updates: Partial<{
      fingerprint: DirectorFingerprint
      name: string
      description: string
      avatarUrl: string
    }>
  ) => Promise<UserDirector | null>
  deleteDirector: (directorId: string) => Promise<boolean>

  // Getters
  getAllDirectors: () => DirectorFingerprint[]
  getUserDirectorById: (id: string) => UserDirector | undefined
}

export const useDirectorStore = create<DirectorState>()((set, get) => ({
  userDirectors: [],
  isLoading: false,
  isInitialized: false,
  currentUserId: null,

  // Initialize store with user's directors from database
  initialize: async (userId: string) => {
    const state = get()

    // Skip if already initialized for this user
    if (state.isInitialized && state.currentUserId === userId) {
      return
    }

    set({ isLoading: true })

    try {
      const userDirectors = await directorService.getUserDirectors(userId)
      set({
        userDirectors,
        isInitialized: true,
        currentUserId: userId,
        isLoading: false,
      })
    } catch (error) {
      logger.musicLab.error('Error initializing director store', { error: error instanceof Error ? error.message : String(error) })
      set({ isLoading: false })
    }
  },

  // Refresh directors from database
  refreshDirectors: async () => {
    const { currentUserId } = get()
    if (!currentUserId) return

    set({ isLoading: true })

    try {
      const userDirectors = await directorService.getUserDirectors(currentUserId)
      set({ userDirectors, isLoading: false })
    } catch (error) {
      logger.musicLab.error('Error refreshing directors', { error: error instanceof Error ? error.message : String(error) })
      set({ isLoading: false })
    }
  },

  // Add a new director
  addDirector: async (fingerprint, name, description, communityItemId) => {
    const { currentUserId } = get()
    if (!currentUserId) return null

    const newDirector = await directorService.addDirector(
      currentUserId,
      fingerprint,
      name,
      description,
      communityItemId
    )

    if (newDirector) {
      set((state) => ({
        userDirectors: [newDirector, ...state.userDirectors],
      }))
    }

    return newDirector
  },

  // Update an existing director
  updateDirector: async (directorId, updates) => {
    const { currentUserId } = get()
    if (!currentUserId) return null

    const updatedDirector = await directorService.updateDirector(
      directorId,
      currentUserId,
      updates
    )

    if (updatedDirector) {
      set((state) => ({
        userDirectors: state.userDirectors.map((d) =>
          d.id === directorId ? updatedDirector : d
        ),
      }))
    }

    return updatedDirector
  },

  // Delete a director
  deleteDirector: async (directorId) => {
    const { currentUserId } = get()
    if (!currentUserId) return false

    const success = await directorService.deleteDirector(directorId, currentUserId)

    if (success) {
      set((state) => ({
        userDirectors: state.userDirectors.filter((d) => d.id !== directorId),
      }))
    }

    return success
  },

  // Get all directors (static + user)
  getAllDirectors: () => {
    const { userDirectors } = get()

    // Convert user directors to DirectorFingerprint format
    const userFingerprints: DirectorFingerprint[] = userDirectors.map((ud) => ({
      ...ud.fingerprint,
      // Override with user's custom name/description if modified
      name: ud.name,
      description: ud.description || ud.fingerprint.description,
    }))

    // Combine: user directors first, then static directors
    return [...userFingerprints, ...DIRECTORS]
  },

  // Get a specific user director by ID
  getUserDirectorById: (id: string) => {
    return get().userDirectors.find((d) => d.id === id)
  },
}))
