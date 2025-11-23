import { useEffect, useRef } from 'react'
import type { StoryShot } from '../types/story.types'

const AUTOSAVE_KEY = 'story-creator-draft'
const AUTOSAVE_INTERVAL = 30000 // 30 seconds

export interface DraftData {
    timestamp: number
    projectId: string
    shots: StoryShot[]
}

/**
 * Hook for auto-saving draft changes to localStorage
 * Saves every 30 seconds if there are changes
 */
export function useDraftAutosave(projectId: string | null, shots: StoryShot[]) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastSavedRef = useRef<string>('')

    useEffect(() => {
        if (!projectId || shots.length === 0) {
            return
        }

        // Create snapshot of current state
        const currentSnapshot = JSON.stringify({
            projectId,
            shots: shots.map(s => ({
                id: s.id,
                prompt: s.prompt,
                reference_tags: s.reference_tags,
                sequence_number: s.sequence_number
            }))
        })

        // Only save if there are changes
        if (currentSnapshot === lastSavedRef.current) {
            return
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Schedule autosave
        timeoutRef.current = setTimeout(() => {
            const draftData: DraftData = {
                timestamp: Date.now(),
                projectId,
                shots
            }

            try {
                localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draftData))
                lastSavedRef.current = currentSnapshot
                console.log('💾 Draft autosaved')
            } catch (error) {
                console.error('Failed to autosave draft:', error)
            }
        }, AUTOSAVE_INTERVAL)

        // Cleanup on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [projectId, shots])
}

/**
 * Load saved draft from localStorage
 */
export function loadDraft(): DraftData | null {
    try {
        const saved = localStorage.getItem(AUTOSAVE_KEY)
        if (!saved) return null

        const draft = JSON.parse(saved) as DraftData

        // Check if draft is less than 24 hours old
        const age = Date.now() - draft.timestamp
        const maxAge = 24 * 60 * 60 * 1000 // 24 hours

        if (age > maxAge) {
            clearDraft()
            return null
        }

        return draft
    } catch (error) {
        console.error('Failed to load draft:', error)
        return null
    }
}

/**
 * Clear saved draft from localStorage
 */
export function clearDraft(): void {
    try {
        localStorage.removeItem(AUTOSAVE_KEY)
        console.log('🗑️ Draft cleared')
    } catch (error) {
        console.error('Failed to clear draft:', error)
    }
}

/**
 * Check if a draft exists for a specific project
 */
export function hasDraft(projectId: string): boolean {
    const draft = loadDraft()
    return draft !== null && draft.projectId === projectId
}
