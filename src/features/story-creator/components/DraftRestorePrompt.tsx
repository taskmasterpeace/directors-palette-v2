'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Trash2 } from 'lucide-react'
import { loadDraft, clearDraft, type DraftData } from '../hooks/useDraftAutosave'
import { createLogger } from '@/lib/logger'


const log = createLogger('StoryCreator')
interface DraftRestorePromptProps {
    onRestore: (draft: DraftData) => void
}

const SHOWN_DRAFTS_KEY = 'story-creator-shown-drafts'

/**
 * Track which draft prompts have already been shown in this session
 */
function hasShownDraftPrompt(timestamp: number): boolean {
    if (typeof window === 'undefined') return false

    try {
        const shown = sessionStorage.getItem(SHOWN_DRAFTS_KEY)
        if (!shown) return false

        const shownTimestamps = JSON.parse(shown) as number[]
        return shownTimestamps.includes(timestamp)
    } catch {
        return false
    }
}

/**
 * Mark a draft prompt as shown for this session
 */
function markDraftPromptShown(timestamp: number): void {
    if (typeof window === 'undefined') return

    try {
        const shown = sessionStorage.getItem(SHOWN_DRAFTS_KEY)
        const shownTimestamps = shown ? JSON.parse(shown) as number[] : []

        if (!shownTimestamps.includes(timestamp)) {
            shownTimestamps.push(timestamp)
            sessionStorage.setItem(SHOWN_DRAFTS_KEY, JSON.stringify(shownTimestamps))
        }
    } catch (error) {
        log.error('Failed to track shown draft', { error: error instanceof Error ? error.message : String(error) })
    }
}

/**
 * Clear the tracking when a draft is discarded or restored
 */
function clearDraftPromptTracking(timestamp: number): void {
    if (typeof window === 'undefined') return

    try {
        const shown = sessionStorage.getItem(SHOWN_DRAFTS_KEY)
        if (!shown) return

        const shownTimestamps = JSON.parse(shown) as number[]
        const filtered = shownTimestamps.filter(t => t !== timestamp)

        if (filtered.length > 0) {
            sessionStorage.setItem(SHOWN_DRAFTS_KEY, JSON.stringify(filtered))
        } else {
            sessionStorage.removeItem(SHOWN_DRAFTS_KEY)
        }
    } catch (error) {
        log.error('Failed to clear draft tracking', { error: error instanceof Error ? error.message : String(error) })
    }
}

/**
 * Prompt to restore a saved draft when the page loads
 */
export function DraftRestorePrompt({ onRestore }: DraftRestorePromptProps) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<DraftData | null>(null)

    useEffect(() => {
        // Check for saved draft on mount
        const savedDraft = loadDraft()
        if (savedDraft) {
            // Only show prompt if we haven't shown it for this draft in this session
            if (!hasShownDraftPrompt(savedDraft.timestamp)) {
                setDraft(savedDraft)
                setOpen(true)
                markDraftPromptShown(savedDraft.timestamp)
            }
        }
    }, [])

    const handleRestore = () => {
        if (draft) {
            onRestore(draft)
            clearDraftPromptTracking(draft.timestamp)
            setOpen(false)
        }
    }

    const handleDiscard = () => {
        if (draft) {
            clearDraftPromptTracking(draft.timestamp)
        }
        clearDraft()
        setOpen(false)
    }

    if (!draft) return null

    const age = Date.now() - draft.timestamp
    const hoursAgo = Math.floor(age / (1000 * 60 * 60))
    const minutesAgo = Math.floor(age / (1000 * 60))

    const timeAgo = hoursAgo > 0
        ? `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`
        : `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Clock className="w-5 h-5 text-accent" />
                        Restore Previous Draft?
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        We found an unsaved draft from {timeAgo} with {draft.shots.length} shot
                        {draft.shots.length !== 1 ? 's' : ''}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                    <div className="bg-card rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Project ID</div>
                        <div className="text-sm font-mono text-foreground">{draft.projectId}</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Shots</div>
                        <div className="text-sm text-foreground">{draft.shots.length} shots</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border border-border">
                        <div className="text-xs text-muted-foreground mb-1">Last Saved</div>
                        <div className="text-sm text-foreground">
                            {new Date(draft.timestamp).toLocaleString()}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleDiscard}
                        className="border-border text-foreground"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Discard Draft
                    </Button>
                    <Button
                        onClick={handleRestore}
                        className="bg-accent hover:bg-accent/90"
                    >
                        Restore Draft
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
