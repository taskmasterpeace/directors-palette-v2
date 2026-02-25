'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sparkles, FileText, AlertCircle, Trash2, Film } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useStoryboardStore } from '../../store'
import { LLMModelSelector } from '../settings/LLMModelSelector'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { toast } from 'sonner'
import type { ExtractionResult } from '../../types/storyboard.types'

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
        resetStoryboard,
        characters,
        locations,
        generatedPrompts,
        generatedImages,
        isDocumentaryMode,
        setDocumentaryMode,
    } = useStoryboardStore()

    const [error, setError] = useState<string | null>(null)
    const [showClearConfirmation, setShowClearConfirmation] = useState(false)

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

            const result = await safeJsonParse<ExtractionResult & { error?: string }>(response)

            if (!response.ok) {
                throw new Error(result.error || 'Extraction failed')
            }
            setExtractionResult(result)

            // Handle 0 results case - don't auto-navigate to empty tab
            if (result.characters.length === 0 && result.locations.length === 0) {
                toast.warning(
                    'No characters or locations detected. You can add them manually in the Entities tab.',
                    { duration: 5000 }
                )
                return
            }

            // Show success and auto-navigate to style tab (step 2 in workflow)
            toast.success(`Found ${result.characters.length} characters and ${result.locations.length} locations`)
            setInternalTab('style')
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

            {/* Documentary Mode Toggle */}
            <Card className="bg-card/50 border-primary/20">
                <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Mode</span>
                        </div>
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                            <button
                                onClick={() => setDocumentaryMode(false)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    !isDocumentaryMode
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Storyboard
                            </button>
                            <button
                                onClick={() => setDocumentaryMode(true)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    isDocumentaryMode
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Documentary
                            </button>
                        </div>
                    </div>
                    {isDocumentaryMode && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Documentary mode classifies segments, generates B-roll pools, and creates chapter title cards.
                        </p>
                    )}
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
                        aria-label="Story text input - paste your story here for character and location extraction"
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

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            onClick={handleExtract}
                            disabled={!storyText.trim() || isExtracting}
                            className="flex-1"
                            size="lg"
                            title={
                                isExtracting
                                    ? 'Extraction in progress...'
                                    : !storyText.trim()
                                    ? 'Enter story text first to extract characters and locations'
                                    : 'Click to extract characters and locations from your story'
                            }
                            aria-busy={isExtracting}
                        >
                            {isExtracting ? (
                                <>
                                    <LoadingSpinner size="sm" color="current" className="mr-2" />
                                    Extracting Characters & Locations...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Extract Characters & Locations
                                </>
                            )}
                        </Button>

                        {(storyText || extractionResult) && (
                            <Button
                                variant="outline"
                                onClick={() => setShowClearConfirmation(true)}
                                className="sm:w-auto"
                                size="lg"
                                disabled={isExtracting}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear & Start Fresh
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Clear Confirmation Dialog */}
            <AlertDialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear all storyboard data?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>This will permanently delete:</p>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                    {storyText && <li>Your story text ({storyText.split(/\s+/).length} words)</li>}
                                    {characters.length > 0 && <li>{characters.length} character(s)</li>}
                                    {locations.length > 0 && <li>{locations.length} location(s)</li>}
                                    {generatedPrompts.length > 0 && <li>{generatedPrompts.length} generated prompt(s)</li>}
                                    {Object.keys(generatedImages).length > 0 && <li>{Object.keys(generatedImages).length} generated image(s)</li>}
                                </ul>
                                <p className="text-destructive font-medium">This action cannot be undone.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                resetStoryboard()
                                setShowClearConfirmation(false)
                                toast.success('Storyboard cleared')
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Clear Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
