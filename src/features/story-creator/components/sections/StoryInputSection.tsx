'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Loader2 } from 'lucide-react'

interface StoryInputSectionProps {
    onExtractShots: (title: string, storyText: string) => Promise<void>
    isExtracting: boolean
    extractionProgress?: number
}

/**
 * Story Input Section - Paste story text and extract shots
 */
export default function StoryInputSection({
    onExtractShots,
    isExtracting,
    extractionProgress = 0
}: StoryInputSectionProps) {
    const [title, setTitle] = useState('')
    const [storyText, setStoryText] = useState('')

    const handleExtract = async () => {
        if (!title.trim() || !storyText.trim()) return
        await onExtractShots(title, storyText)
    }

    const canExtract = title.trim().length > 0 && storyText.trim().length > 10 && !isExtracting

    return (
        <div className="space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                    Project Title
                </label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your story project title..."
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={isExtracting}
                />
            </div>

            {/* Story Text Input */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                    Story Text
                </label>
                <Textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Paste your story text here... The AI will extract visual scenes and create shot prompts."
                    className="bg-slate-800 border-slate-700 text-white min-h-[300px] resize-y"
                    disabled={isExtracting}
                />
                <p className="text-xs text-slate-500">
                    {storyText.length} characters
                </p>
            </div>

            {/* Extraction Progress */}
            {isExtracting && (
                <div className="space-y-2 p-4 bg-slate-800 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extracting shots from your story...</span>
                    </div>
                    <Progress value={extractionProgress} className="h-2" />
                </div>
            )}

            {/* Extract Button */}
            <Button
                onClick={handleExtract}
                disabled={!canExtract}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
                size="lg"
            >
                {isExtracting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Extract Shots
                    </>
                )}
            </Button>
        </div>
    )
}
