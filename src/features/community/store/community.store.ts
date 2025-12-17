/**
 * Community Store
 * Zustand store for community feature state management
 */

import { create } from 'zustand'
import type {
  CommunityItem,
  CommunityFilters,
} from '../types/community.types'
import { communityService } from '../services/community.service'

interface CommunityState {
  // Data
  items: CommunityItem[]
  libraryItemIds: Set<string>
  userRatings: Map<string, number>
  pendingSubmissions: CommunityItem[]

  // UI State
  filters: CommunityFilters
  isLoading: boolean
  error: string | null
  selectedItem: CommunityItem | null

  // Actions
  fetchItems: () => Promise<void>
  fetchLibraryItemIds: (userId: string) => Promise<void>
  fetchUserRatings: (userId: string) => Promise<void>
  addToLibrary: (itemId: string, userId: string) => Promise<boolean>
  rateItem: (itemId: string, userId: string, rating: number) => Promise<boolean>
  setFilters: (filters: Partial<CommunityFilters>) => void
  setSelectedItem: (item: CommunityItem | null) => void
  clearError: () => void

  // Admin
  fetchPendingSubmissions: () => Promise<void>
  approveSubmission: (itemId: string, adminUserId: string) => Promise<boolean>
  rejectSubmission: (itemId: string, adminUserId: string, reason?: string) => Promise<boolean>
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // Initial state
  items: [],
  libraryItemIds: new Set(),
  userRatings: new Map(),
  pendingSubmissions: [],
  filters: {
    type: 'all',
    sortBy: 'popular',
  },
  isLoading: false,
  error: null,
  selectedItem: null,

  // Actions
  fetchItems: async () => {
    set({ isLoading: true, error: null })
    try {
      const { filters } = get()
      const items = await communityService.getApprovedItems(filters)
      set({ items, isLoading: false })
    } catch (error) {
      console.error('Error fetching community items:', error)
      set({ error: 'Failed to load community items', isLoading: false })
    }
  },

  fetchLibraryItemIds: async (userId: string) => {
    try {
      const libraryItemIds = await communityService.getLibraryItemIds(userId)
      set({ libraryItemIds })
    } catch (error) {
      console.error('Error fetching library item IDs:', error)
    }
  },

  fetchUserRatings: async (userId: string) => {
    try {
      const userRatings = await communityService.getUserRatings(userId)
      set({ userRatings })
    } catch (error) {
      console.error('Error fetching user ratings:', error)
    }
  },

  addToLibrary: async (itemId: string, userId: string) => {
    try {
      await communityService.addToLibrary(itemId, userId)
      // Update local state
      const { libraryItemIds, items } = get()
      const newLibraryIds = new Set(libraryItemIds)
      newLibraryIds.add(itemId)

      // Update add count in items
      const updatedItems = items.map(item =>
        item.id === itemId
          ? { ...item, addCount: item.addCount + 1 }
          : item
      )

      set({ libraryItemIds: newLibraryIds, items: updatedItems })
      return true
    } catch (error) {
      console.error('Error adding to library:', error)
      set({ error: 'Failed to add to library' })
      return false
    }
  },

  rateItem: async (itemId: string, userId: string, rating: number) => {
    try {
      const { userRatings, items } = get()
      const oldRating = userRatings.get(itemId)

      await communityService.rateItem(itemId, userId, rating)

      // Update local ratings
      const newRatings = new Map(userRatings)
      newRatings.set(itemId, rating)

      // Update item stats
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const newRatingSum = item.ratingSum - (oldRating || 0) + rating
          const newRatingCount = oldRating ? item.ratingCount : item.ratingCount + 1
          return {
            ...item,
            ratingSum: newRatingSum,
            ratingCount: newRatingCount,
            averageRating: newRatingSum / newRatingCount,
          }
        }
        return item
      })

      set({ userRatings: newRatings, items: updatedItems })
      return true
    } catch (error) {
      console.error('Error rating item:', error)
      set({ error: 'Failed to rate item' })
      return false
    }
  },

  setFilters: (newFilters: Partial<CommunityFilters>) => {
    const { filters } = get()
    set({ filters: { ...filters, ...newFilters } })
    // Automatically refetch when filters change
    get().fetchItems()
  },

  setSelectedItem: (item: CommunityItem | null) => {
    set({ selectedItem: item })
  },

  clearError: () => {
    set({ error: null })
  },

  // Admin actions
  fetchPendingSubmissions: async () => {
    set({ isLoading: true, error: null })
    try {
      const pendingSubmissions = await communityService.getPendingSubmissions()
      set({ pendingSubmissions, isLoading: false })
    } catch (error) {
      console.error('Error fetching pending submissions:', error)
      set({ error: 'Failed to load pending submissions', isLoading: false })
    }
  },

  approveSubmission: async (itemId: string, adminUserId: string) => {
    try {
      await communityService.approveSubmission(itemId, adminUserId)
      // Remove from pending list
      const { pendingSubmissions } = get()
      set({
        pendingSubmissions: pendingSubmissions.filter(item => item.id !== itemId),
      })
      return true
    } catch (error) {
      console.error('Error approving submission:', error)
      set({ error: 'Failed to approve submission' })
      return false
    }
  },

  rejectSubmission: async (itemId: string, adminUserId: string, reason?: string) => {
    try {
      await communityService.rejectSubmission(itemId, adminUserId, reason)
      // Remove from pending list
      const { pendingSubmissions } = get()
      set({
        pendingSubmissions: pendingSubmissions.filter(item => item.id !== itemId),
      })
      return true
    } catch (error) {
      console.error('Error rejecting submission:', error)
      set({ error: 'Failed to reject submission' })
      return false
    }
  },
}))
