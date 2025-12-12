'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Sparkles, FileText, AlertCircle, Trash2 } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { LLMModelSelector } from '../settings/LLMModelSelector'

export function StoryInput() {
    const {
        storyText,
        setStoryText,
        extractionResult,
        setExtractionResult,
        isExtracting,
        setIsExtracting,
        selectedModel,
        setInternalTab,
        resetStoryboard
    } = useStoryboardStore()

    const [error, setError] = useState<string | null>(null)

    const handleExtract = async () => {
        if (!storyText.trim()) {
            setError('Please enter some story text first')
            return
        }

        setError(null)
        setIsExtracting(true)

        try {
            const response = await fetch('/api/storyboard/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyText: storyText.trim(),
                    model: selectedModel
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Extraction failed')
            }

            const result = await response.json()
            setExtractionResult(result)

            // Auto-navigate to entities tab
            setInternalTab('entities')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Extraction failed')
        } finally {
            setIsExtracting(false)
        }
    }

    const wordCount = storyText.trim().split(/\s+/).filter(Boolean).length
    const charCount = storyText.length

    return (
        <div className="space-y-4">
            {/* Model Selector */}
            <Card className="bg-card/50 border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Model
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <LLMModelSelector />
                </CardContent>
            </Card>

            {/* Story Input */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Story Text
                    </CardTitle>
                    <CardDescription>
                        Paste your story text below. The AI will extract characters and locations automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="Paste your story here...

Example:
Marcus walked into the courtroom, his footsteps echoing against the marble floor. Judge Harrison looked up from her papers, her expression stern. Sarah, sitting in the gallery, clutched her notebook nervously."
                        value={storyText}
                        onChange={(e) => setStoryText(e.target.value)}
                        className="min-h-[300px] font-mono text-sm"
                        disabled={isExtracting}
                    />

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{wordCount} words, {charCount} characters</span>
                        {extractionResult && (
                            <span className="text-primary">
                                Found {extractionResult.characters.length} characters, {extractionResult.locations.length} locations
                            </span>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Extract Button */}
                    <Button
                        onClick={handleExtract}
                        disabled={!storyText.trim() || isExtracting}
                        className="w-full"
                        size="lg"
                    >
                        {isExtracting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Extracting Characters & Locations...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Extract Characters & Locations
                            </>
                        )}
                    </Button>

                    {/* Clear & Start Fresh Button */}
                    {(storyText || extractionResult) && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                resetStoryboard()
                            }}
                            className="w-full"
                            disabled={isExtracting}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear & Start Fresh
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
