'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Check, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface GalleryPromptEditorProps {
    prompt: string
    sequence: number
    isRegenerating: boolean
    onRegenerate: (newPrompt: string) => void
}

export function GalleryPromptEditor({
    prompt,
    sequence,
    isRegenerating,
    onRegenerate,
}: GalleryPromptEditorProps) {
    const [editedPrompt, setEditedPrompt] = useState(prompt)
    const [isEditing, setIsEditing] = useState(false)

    // Sync editedPrompt when the prompt prop changes (e.g., carousel navigation)
    useEffect(() => {
        setEditedPrompt(prompt)
        setIsEditing(false)
    }, [prompt, sequence])

    const hasChanges = editedPrompt !== prompt

    const handleSave = () => {
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditedPrompt(prompt)
        setIsEditing(false)
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                    Shot {sequence} Prompt
                </span>
                <div className="flex items-center gap-1">
                    {isEditing && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={handleCancel}
                            >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-green-600"
                                onClick={handleSave}
                            >
                                <Check className="w-3 h-3 mr-1" />
                                Save
                            </Button>
                        </>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isRegenerating}
                        onClick={() => onRegenerate(editedPrompt)}
                    >
                        {isRegenerating ? (
                            <>
                                <LoadingSpinner size="xs" color="current" className="mr-1" />
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                {hasChanges ? 'Regenerate with Changes' : 'Regenerate'}
                            </>
                        )}
                    </Button>
                </div>
            </div>
            <textarea
                value={editedPrompt}
                onChange={(e) => {
                    setEditedPrompt(e.target.value)
                    if (!isEditing) setIsEditing(true)
                }}
                onFocus={() => setIsEditing(true)}
                className="w-full min-h-[80px] text-sm bg-muted/50 border rounded-md p-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Shot prompt..."
            />
        </div>
    )
}
