/**
 * Shot Animator Store
 *
 * Centralized state management for Shot Animator feature.
 * Persisted to localStorage so shots, prompts, and video tracking
 * survive page refreshes.
 *
 * Images are stored as either https: URLs (from Supabase gallery) or
 * base64 data: URLs (from local file uploads). blob: URLs are converted
 * to base64 at upload time in the modal components so they survive
 * serialization.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShotAnimationConfig } from '../types'

interface ShotAnimatorStore {
  // State
  shotConfigs: ShotAnimationConfig[]

  // Actions
  addShotConfig: (config: ShotAnimationConfig) => void
  addShotConfigs: (configs: ShotAnimationConfig[]) => void
  updateShotConfig: (id: string, updates: Partial<ShotAnimationConfig>) => void
  removeShotConfig: (id: string) => void
  setShotConfigs: (configs: ShotAnimationConfig[]) => void
  clearShotConfigs: () => void
}

export const useShotAnimatorStore = create<ShotAnimatorStore>()(
  persist(
    (set) => ({
      shotConfigs: [],

      addShotConfig: (config) =>
        set((state) => ({
          shotConfigs: [...state.shotConfigs, config],
        })),

      addShotConfigs: (configs) =>
        set((state) => {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(state.shotConfigs.map((s) => s.id))
          const newConfigs = configs.filter((c) => !existingIds.has(c.id))
          return {
            shotConfigs: [...state.shotConfigs, ...newConfigs],
          }
        }),

      updateShotConfig: (id, updates) =>
        set((state) => ({
          shotConfigs: state.shotConfigs.map((config) =>
            config.id === id ? { ...config, ...updates } : config
          ),
        })),

      removeShotConfig: (id) =>
        set((state) => ({
          shotConfigs: state.shotConfigs.filter((config) => config.id !== id),
        })),

      setShotConfigs: (configs) =>
        set({ shotConfigs: configs }),

      clearShotConfigs: () =>
        set({ shotConfigs: [] }),
    }),
    {
      name: 'shot-animator-store',
      version: 1,

      // Use a custom storage that catches quota errors silently
      storage: {
        getItem: (name) => {
          try {
            const value = localStorage.getItem(name)
            return value ? JSON.parse(value) : null
          } catch {
            return null
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value))
          } catch {
            // localStorage quota exceeded — silently ignore.
            // In-memory state still works, just won't survive refresh.
            console.warn('[shot-animator-store] localStorage quota exceeded, state not persisted')
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name)
          } catch { /* ignore */ }
        },
      },

      // Only persist serializable state. Strip base64 data: URLs to avoid
      // blowing the ~5MB localStorage quota — only https: gallery URLs survive.
      partialize: (state) => ({
        shotConfigs: state.shotConfigs.map(config => ({
          ...config,
          // Only persist remote URLs, not base64 data (too large for localStorage)
          imageUrl: config.imageUrl.startsWith('data:') ? '' : config.imageUrl,
          lastFrameImage: config.lastFrameImage?.startsWith('data:') ? undefined : config.lastFrameImage,
          referenceImages: (config.referenceImages || []).filter(url => !url.startsWith('data:')),
        })).filter(config => config.imageUrl !== ''), // Drop configs with no persistable image
      } as unknown as ShotAnimatorStore),

      // Revive Date objects and strip any legacy blob: URLs that may
      // still be in storage from before the base64 conversion was added.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.shotConfigs = state.shotConfigs.map(config => ({
          ...config,
          // Strip legacy blob: URLs that cannot survive a refresh
          referenceImages: (config.referenceImages || []).filter(
            url => !url.startsWith('blob:')
          ),
          lastFrameImage: config.lastFrameImage?.startsWith('blob:')
            ? undefined
            : config.lastFrameImage,
          // Revive Date objects from JSON strings
          generatedVideos: (config.generatedVideos || []).map(video => ({
            ...video,
            createdAt: new Date(video.createdAt),
          })),
        }))
      },
    }
  )
)
