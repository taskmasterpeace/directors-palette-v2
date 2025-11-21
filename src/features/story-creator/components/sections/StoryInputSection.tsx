'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Sparkles, Loader2, TestTube2 } from 'lucide-react'

const TEST_STORIES = [
    {
        title: "The Chase",
        text: `Marcus sprinted through the neon-lit streets of downtown, his breath visible in the cold night air. Behind him, the sound of heavy boots echoed off the wet pavement.

He ducked into a narrow alley, pressing his back against the graffiti-covered wall. A trash can clattered somewhere in the darkness.

Sarah waited on the rooftop above, her sniper rifle trained on the alley entrance. She spoke into her earpiece: "I've got eyes on you. Two hostiles approaching from the east."

The rain began to fall harder as Marcus pulled out his pistol. This was it. No more running.`
    },
    {
        title: "Morning Coffee",
        text: `Elena sat at the corner table of the small cafe, steam rising from her cup. The morning sun streamed through the window, casting long shadows across the wooden floor.

She opened her laptop and began to type. Outside, the city was waking up. A yellow taxi pulled up to the curb. A mother pushed a stroller down the sidewalk.

The barista, a young man with kind eyes, brought her a fresh croissant. She smiled and nodded in thanks.

This was her favorite part of the day - before the meetings, before the calls. Just her, her coffee, and her thoughts.`
    }
]

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

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button
                    onClick={() => {
                        const story = TEST_STORIES[Math.floor(Math.random() * TEST_STORIES.length)]
                        setTitle(story.title)
                        setStoryText(story.text)
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    disabled={isExtracting}
                >
                    <TestTube2 className="w-4 h-4 mr-2" />
                    Test Story
                </Button>
                <Button
                    onClick={handleExtract}
                    disabled={!canExtract}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
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
        </div>
    )
}
