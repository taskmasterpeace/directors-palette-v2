'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { SplitSquareVertical, Wand2, AlertCircle, CheckCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useStoryboardStore } from '../../store'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'
import { StoryDirectorService } from '../../services/story-director.service'
import {
    replaceAllCharacterReferences,
    type CharacterReplacement
} from '../../services/name-replacement.service'
import { EditableShot } from './EditableShot'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import type { GeneratedShotPrompt, ShotMetadata } from '../../types/storyboard.types'

interface ShotBreakdownProps {
    chapterIndex?: number
}

export function ShotBreakdown({ chapterIndex = 0 }: ShotBreakdownProps) {
    const {
        breakdownResult,
        characters,
        locations,
        currentStyleGuide,
        storyText,
        selectedModel,
        generatedPrompts,
        isGeneratingPrompts,
        promptsGenerated,
        chapters,
        shotNotes,
        isPreviewCollapsed,
        generatedImages,
        openShotLab,
        openContactSheetModal,
        openBRollModal,
        setBreakdownResult,
        addGeneratedPrompts,
        updateGeneratedPrompt,
        updateGeneratedPromptMetadata,
        setIsGeneratingPrompts,
        clearGeneratedPrompts,
        setShotNote
    } = useStoryboardStore()

    const handleRefine = (sequence: number) => {
        openShotLab(sequence)
    }

    const handleGetAngles = (sequence: number) => {
        // Open contact sheet modal with the shot
        openContactSheetModal(String(sequence))
    }

    const handleGetBRoll = (sequence: number) => {
        // Get the generated image URL for this shot
        const imageData = generatedImages[sequence]
        if (imageData?.imageUrl) {
            openBRollModal(sequence, imageData.imageUrl)
        } else {
            // If no image, try to use character reference or alert user
            console.warn('No generated image for shot', sequence)
        }
    }

    const [error, setError] = useState<string | null>(null)
    const [generationProgress, setGenerationProgress] = useState<{
        total: number
        processed: number
        complete: boolean
        currentBatch?: number
        totalBatches?: number
    } | null>(null)

    // Get character and location names
    const characterNames = characters.map(c => c.name)
    const locationNames = locations.map(l => l.name)

    // Filter segments by chapter if chapters exist
    // chapterIndex of -1 means "All Chapters" view - show all segments
    const filteredSegments = useMemo(() => {
        if (!breakdownResult?.segments) return []
        if (!chapters || chapters.length === 0) return breakdownResult.segments

        // "All Chapters" view - show all segments
        if (chapterIndex < 0) return breakdownResult.segments

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return breakdownResult.segments
        }

        return breakdownResult.segments.filter(s =>
            activeChapter.segmentIndices.includes(s.sequence)
        )
    }, [breakdownResult?.segments, chapters, chapterIndex])

    const handlePromptChange = (sequence: number, newPrompt: string) => {
        if (!breakdownResult) return

        const updatedSegments = breakdownResult.segments.map(s =>
            s.sequence === sequence ? { ...s, text: newPrompt } : s
        )

        setBreakdownResult({
            ...breakdownResult,
            segments: updatedSegments
        })
    }

    const handleGeneratedPromptChange = (sequence: number, newPrompt: string) => {
        updateGeneratedPrompt(sequence, newPrompt)
    }

    const handleMetadataChange = (sequence: number, metadata: Partial<ShotMetadata>) => {
        updateGeneratedPromptMetadata(sequence, metadata)
    }

    const BATCH_SIZE = 15 // Must match API route

    const generatePrompts = async () => {
        if (!breakdownResult?.segments.length) return

        setIsGeneratingPrompts(true)
        setError(null)
        clearGeneratedPrompts()

        const totalSegments = breakdownResult.segments.length
        const totalBatches = Math.ceil(totalSegments / BATCH_SIZE)
        const allPrompts: GeneratedShotPrompt[] = []
        const errors: string[] = []

        // Build character descriptions map with @name format
        // Include ALL characters with descriptions (not just those with reference images)
        const characterDescriptions: Record<string, string> = {}
        for (const char of characters) {
            if (char.description) {
                const atName = '@' + char.name.toLowerCase().replace(/\s+/g, '_')
                characterDescriptions[atName] = char.description
            }
        }

        // Build character replacements for the name replacement service
        // Only characters WITHOUT reference images get their names replaced with descriptions
        const characterReplacements: CharacterReplacement[] = characters.map(char => ({
            name: char.name,
            description: char.description || '',
            has_reference: char.has_reference
        }))

        // Helper function to replace @tags AND plain names with descriptions
        // Uses the tested name-replacement.service for unicode support and edge cases
        const replaceTagsWithDescriptions = (prompt: string): string => {
            return replaceAllCharacterReferences(prompt, characterReplacements)
        }

        // Initialize progress
        setGenerationProgress({
            total: totalSegments,
            processed: 0,
            complete: false,
            currentBatch: 0,
            totalBatches
        })

        // Auto-continue loop: process all batches
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const startFrom = batchIndex * BATCH_SIZE
            const currentBatch = batchIndex + 1

            // Update progress with current batch
            setGenerationProgress({
                total: totalSegments,
                processed: allPrompts.length,
                complete: false,
                currentBatch,
                totalBatches
            })

            try {
                // Call the API route for this batch
                const response = await fetch('/api/storyboard/generate-prompts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        segments: breakdownResult.segments.map(s => ({
                            text: s.text,
                            sequence: s.sequence,
                            directorNote: shotNotes[s.sequence] || undefined
                        })),
                        stylePrompt: currentStyleGuide?.style_prompt,
                        characterDescriptions,
                        storyContext: storyText,
                        model: selectedModel,
                        startFrom
                    })
                })

                const data = await safeJsonParse<{ shots: Array<{ sequence?: number; prompt?: string; shotType?: string }>; error?: string; errors?: string[]; complete?: boolean }>(response)

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to generate prompts')
                }

                // Transform API response to GeneratedShotPrompt format
                const batchPrompts: GeneratedShotPrompt[] = data.shots
                    .filter((shot): shot is { sequence: number; prompt: string; shotType?: string } => {
                        // Filter out malformed shots from LLM
                        if (!shot || typeof shot.sequence !== 'number' || !shot.prompt) {
                            console.warn('Skipping malformed shot from LLM:', shot)
                            return false
                        }
                        return true
                    })
                    .map((shot) => {
                        const segment = breakdownResult.segments.find(s => s.sequence === shot.sequence)
                        // Post-process: Replace @tags with verbatim descriptions for characters WITHOUT reference images
                        const processedPrompt = replaceTagsWithDescriptions(shot.prompt)
                        const promptLower = processedPrompt.toLowerCase()
                        return {
                            sequence: shot.sequence,
                            originalText: segment?.text || '',
                            prompt: processedPrompt,
                            shotType: (shot.shotType || 'unknown') as 'establishing' | 'wide' | 'medium' | 'close-up' | 'detail' | 'unknown',
                            characterRefs: characters.filter(c =>
                                c.has_reference &&
                                (promptLower.includes(c.name.toLowerCase()) ||
                                    processedPrompt.includes('@' + c.name.toLowerCase().replace(/\s+/g, '_')))
                            ),
                            locationRef: locations.find(l =>
                                l.has_reference &&
                                (promptLower.includes(l.name.toLowerCase()) ||
                                    promptLower.includes(l.tag.toLowerCase().replace('@', '')))
                            ),
                            edited: false
                        }
                    })

                // Add to our collection and update store
                allPrompts.push(...batchPrompts)
                addGeneratedPrompts(batchPrompts)

                // Collect errors from API response
                if (data.errors && data.errors.length > 0) {
                    errors.push(...data.errors)
                }

                // If this batch completed everything, break early
                if (data.complete) {
                    break
                }
            } catch (err) {
                const errorMsg = `Batch ${currentBatch} failed: ${err instanceof Error ? err.message : 'Unknown error'}`
                errors.push(errorMsg)
                // Continue with next batch instead of stopping completely
            }
        }

        // Apply director enhancement if a director is selected
        const storeState = useStoryboardStore.getState()
        if (storeState.selectedDirectorId && allPrompts.length > 0) {
            const director = DIRECTORS.find(d => d.id === storeState.selectedDirectorId)
            if (director) {
                const enhanced = StoryDirectorService.enhanceGeneratedPrompts(allPrompts, director)
                storeState.setGeneratedPrompts(enhanced)
            }
        }

        // Final progress update
        const isComplete = allPrompts.length >= totalSegments
        setGenerationProgress({
            total: totalSegments,
            processed: allPrompts.length,
            complete: isComplete,
            currentBatch: totalBatches,
            totalBatches
        })

        // Show accumulated errors if any, with clear indication of missing segments
        if (errors.length > 0) {
            const missingCount = totalSegments - allPrompts.length
            const errorSummary = errors.slice(0, 3).join('; ')
            const moreErrors = errors.length > 3 ? ` (+${errors.length - 3} more errors)` : ''
            const missingWarning = missingCount > 0 ? ` Missing ${missingCount} segment(s).` : ''
            setError(`Some batches failed: ${errorSummary}${moreErrors}${missingWarning}`)
        }

        setIsGeneratingPrompts(false)
    }

    const handleGeneratePrompts = () => generatePrompts()

    // Calculate progress percentage
    const progressPercent = generationProgress
        ? Math.round((generationProgress.processed / generationProgress.total) * 100)
        : 0

    // Get generated prompt for a segment
    const getGeneratedPrompt = (sequence: number): GeneratedShotPrompt | undefined => {
        return generatedPrompts.find(p => p.sequence === sequence)
    }

    if (!breakdownResult) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <SplitSquareVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No shot breakdown yet.</p>
                    <p className="text-sm">Enter story text and adjust the slider above.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Generate Prompts Button - Compact after generation */}
            {promptsGenerated ? (
                // Compact bar when prompts are already generated
                <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">
                            {generatedPrompts.length} prompts generated
                        </span>
                        {generationProgress && !generationProgress.complete && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                                {generationProgress.processed}/{generationProgress.total}
                            </Badge>
                        )}
                    </div>
                    <Button
                        onClick={handleGeneratePrompts}
                        disabled={isGeneratingPrompts}
                        variant="ghost"
                        size="sm"
                    >
                        {isGeneratingPrompts ? (
                            <>
                                <LoadingSpinner size="xs" color="current" className="mr-1" />
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-3 h-3 mr-1" />
                                Regenerate
                            </>
                        )}
                    </Button>
                </div>
            ) : (
                // Full card when no prompts generated yet
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium flex items-center gap-2">
                                    <Wand2 className="w-4 h-4" />
                                    AI Shot Prompts
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Transform story segments into cinematic shot descriptions using AI.
                                </p>
                            </div>
                            <Button
                                onClick={handleGeneratePrompts}
                                disabled={isGeneratingPrompts}
                            >
                                {isGeneratingPrompts ? (
                                    <>
                                        <LoadingSpinner size="sm" color="current" className="mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mr-2" />
                                        Generate Shot Prompts
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Progress bar during generation */}
                        {isGeneratingPrompts && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                        {generationProgress?.currentBatch && generationProgress?.totalBatches
                                            ? `Processing batch ${generationProgress.currentBatch}/${generationProgress.totalBatches}...`
                                            : 'Starting generation...'}
                                    </span>
                                    {generationProgress && (
                                        <span className="font-medium">
                                            {generationProgress.processed} / {generationProgress.total} shots ({progressPercent}%)
                                        </span>
                                    )}
                                </div>
                                <Progress value={progressPercent} className="h-2" />
                            </div>
                        )}

                        {/* Error display */}
                        {error && (
                            <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                                <p className="text-xs text-destructive">{error}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Progress bar when regenerating (shown outside the compact bar) */}
            {isGeneratingPrompts && promptsGenerated && (
                <div className="p-2 rounded-lg bg-muted/30 border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                            {generationProgress?.currentBatch && generationProgress?.totalBatches
                                ? `Regenerating batch ${generationProgress.currentBatch}/${generationProgress.totalBatches}...`
                                : 'Starting...'}
                        </span>
                        {generationProgress && (
                            <span className="font-medium">
                                {generationProgress.processed} / {generationProgress.total} ({progressPercent}%)
                            </span>
                        )}
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                </div>
            )}

            {/* Shot List */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SplitSquareVertical className="w-4 h-4" />
                            Shot List
                        </div>
                        <div className="flex items-center gap-2">
                            {promptsGenerated && (
                                <Badge variant="secondary" className="text-xs">
                                    AI Enhanced
                                </Badge>
                            )}
                            <Badge variant="outline">
                                {chapters && chapters.length > 1 && chapterIndex >= 0
                                    ? `${filteredSegments.length} of ${breakdownResult.total_count} shots`
                                    : `${breakdownResult.total_count} shots`}
                            </Badge>
                        </div>
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {promptsGenerated
                            ? 'Each shot shows the original story text and AI-generated prompt. Click to expand and edit.'
                            : 'Click any shot to expand and edit. Generate prompts to transform into cinematic descriptions.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className={isPreviewCollapsed ? "h-[calc(100vh-300px)] pr-4" : "h-[500px] pr-4"}>
                        <div className="space-y-2">
                            {filteredSegments.map((segment) => (
                                <EditableShot
                                    key={segment.sequence}
                                    segment={segment}
                                    generatedPrompt={getGeneratedPrompt(segment.sequence)}
                                    characters={characterNames}
                                    locations={locationNames}
                                    shotNote={shotNotes[segment.sequence]}
                                    onPromptChange={handlePromptChange}
                                    onGeneratedPromptChange={handleGeneratedPromptChange}
                                    onNoteChange={setShotNote}
                                    onMetadataChange={handleMetadataChange}
                                    onGetAngles={handleGetAngles}
                                    onGetBRoll={handleGetBRoll}
                                    onRefine={handleRefine}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>



        </div >
    )
}
