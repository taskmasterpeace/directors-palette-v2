'use client'

import { create } from 'zustand'
import type { Announcement } from './types'

interface AnnouncementState {
    announcements: Announcement[]
    muteAll: boolean
    loading: boolean
    loaded: boolean
    // Computed
    unreadCount: number
    latestUrgent: Announcement | null
    // Actions
    setAnnouncements: (announcements: Announcement[]) => void
    setMuteAll: (muted: boolean) => void
    setLoading: (loading: boolean) => void
    dismissLocally: (id: string) => void
    fetch: () => Promise<void>
    dismissAnnouncement: (id: string) => Promise<void>
    toggleMuteAll: () => Promise<void>
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
    announcements: [],
    muteAll: false,
    loading: false,
    loaded: false,
    unreadCount: 0,
    latestUrgent: null,

    setAnnouncements: (announcements) => {
        const undismissed = announcements.filter(a => !a.is_dismissed)
        const urgent = undismissed.find(a => a.priority === 'urgent') || null
        set({
            announcements,
            unreadCount: undismissed.length,
            latestUrgent: urgent,
            loaded: true
        })
    },

    setMuteAll: (muted) => set({ muteAll: muted }),
    setLoading: (loading) => set({ loading }),

    dismissLocally: (id) => {
        const updated = get().announcements.map(a =>
            a.id === id ? { ...a, is_dismissed: true } : a
        )
        const undismissed = updated.filter(a => !a.is_dismissed)
        set({
            announcements: updated,
            unreadCount: undismissed.length,
            latestUrgent: undismissed.find(a => a.priority === 'urgent') || null
        })
    },

    fetch: async () => {
        if (get().loading) return
        set({ loading: true })
        try {
            const res = await fetch('/api/announcements')
            if (!res.ok) throw new Error('Failed to fetch')
            const data = await res.json()
            get().setAnnouncements(data.announcements)
            set({ muteAll: data.muteAll ?? false })
        } catch {
            // Silent fail — announcements are non-critical
        } finally {
            set({ loading: false })
        }
    },

    dismissAnnouncement: async (id) => {
        get().dismissLocally(id)
        try {
            await fetch('/api/announcements/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ announcement_id: id })
            })
        } catch {
            // Optimistic — already dismissed locally
        }
    },

    toggleMuteAll: async () => {
        const newVal = !get().muteAll
        set({ muteAll: newVal })
        try {
            await fetch('/api/announcements/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mute_all: newVal })
            })
        } catch {
            set({ muteAll: !newVal })
        }
    }
}))
