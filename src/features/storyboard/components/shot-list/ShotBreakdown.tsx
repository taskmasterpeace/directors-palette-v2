'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
    SplitSquareVertical,
    ChevronDown,
    ChevronUp,
    Edit2,
    Check,
    X,
    Users,
    MapPin,
    Wand2,
    AlertCircle,
    Image as ImageIcon,
    Copy,
    CheckCircle,
    MessageSquare,
    Star,
    FlaskConical,
    Grid3X3,
    Film
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Input } from '@/components/ui/input'
import { useStoryboardStore } from '../../store'
import {
    replaceAllCharacterReferences,
    type CharacterReplacement
} from '../../services/name-replacement.service'
import { HighlightedPrompt } from '../shared'
import type { ShotBreakdownSegment, GeneratedShotPrompt, StoryboardCharacter, ShotMetadata } from '../../types/storyboard.types'

interface EditableShotProps {
    segment: ShotBreakdownSegment
    generatedPrompt?: GeneratedShotPrompt
    characters: string[]
    locations: string[]
    shotNote?: string
    onPromptChange?: (sequence: number, newPrompt: string) => void
    onGeneratedPromptChange?: (sequence: number, newPrompt: string) => void
    onNoteChange?: (sequence: number, note: string) => void
    onMetadataChange?: (sequence: number, metadata: Partial<ShotMetadata>) => void
    onRefine?: (sequence: number) => void
    onGetAngles?: (sequence: number) => void
    onGetBRoll?: (sequence: number) => void
}

function EditableShot({
    segment,
    generatedPrompt,
    characters,
    locations,
    shotNote,
    onPromptChange,
    onGeneratedPromptChange,
    onNoteChange,
    onMetadataChange,
    onRefine,
    onGetAngles,
    onGetBRoll
}: EditableShotProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedPrompt, setEditedPrompt] = useState(generatedPrompt?.prompt || segment.text)
    const [isExpanded, setIsExpanded] = useState(false)
    const [copied, setCopied] = useState(false)
    const [hoveredRating, setHoveredRating] = useState(0)

    const isGreenlit = generatedPrompt?.metadata?.isGreenlit
    const rating = generatedPrompt?.metadata?.rating || 0

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const textToCopy = generatedPrompt?.prompt || segment.text
        await navigator.clipboard.writeText(textToCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Find mentioned characters and locations in original text
    const mentionedCharacters = characters.filter(c =>
        segment.text.toLowerCase().includes(c.toLowerCase())
    )
    const mentionedLocations = locations.filter(l =>
        segment.text.toLowerCase().includes(l.toLowerCase())
    )

    const handleSave = () => {
        if (generatedPrompt) {
            onGeneratedPromptChange?.(segment.sequence, editedPrompt)
        } else {
            onPromptChange?.(segment.sequence, editedPrompt)
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditedPrompt(generatedPrompt?.prompt || segment.text)
        setIsEditing(false)
    }

    // Get shot type color
    const getShotTypeColor = (type: string) => {
        switch (type) {
            case 'establishing': return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
            case 'wide': return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
            case 'medium': return 'bg-green-500/20 text-green-500 border-green-500/30'
            case 'close-up': return 'bg-amber-500/20 text-amber-500 border-amber-500/30'
            case 'detail': return 'bg-red-500/20 text-red-500 border-red-500/30'
            default: return 'bg-muted text-muted-foreground'
        }
    }

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="rounded-lg border bg-card/50 hover:bg-card/80 transition-colors overflow-hidden">
                {/* Header Row - Always visible */}
                <CollapsibleTrigger asChild>
                    <div className="flex gap-3 p-3 cursor-pointer">
                        <div
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
                            style={{ backgroundColor: segment.color }}
                        >
                            {segment.sequence}
                        </div>
                        <div className="flex-1 min-w-0">
                            {/* Shot type badge if generated */}
                            {generatedPrompt && (
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className={`text-[10px] py-0 ${getShotTypeColor(generatedPrompt.shotType)}`}>
                                        {generatedPrompt.shotType}
                                    </Badge>
                                    {generatedPrompt.edited && (
                                        <Badge variant="secondary" className="text-[10px] py-0">
                                            edited
                                        </Badge>
                                    )}
                                    {isGreenlit && (
                                        <Badge variant="default" className="text-[10px] py-0 bg-green-500 hover:bg-green-600 border-none shadow-none">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Greenlit
                                        </Badge>
                                    )}
                                </div>
                            )}
                            <div className="text-sm leading-relaxed line-clamp-2">
                                <HighlightedPrompt text={generatedPrompt ? generatedPrompt.prompt : segment.text} />
                            </div>
                            {/* Quick reference badges */}
                            {(mentionedCharacters.length > 0 || mentionedLocations.length > 0) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {mentionedCharacters.map(c => (
                                        <Badge key={c} variant="outline" className="text-[10px] py-0">
                                            <Users className="w-3 h-3 mr-1" />
                                            {c}
                                        </Badge>
                                    ))}
                                    {mentionedLocations.map(l => (
                                        <Badge key={l} variant="secondary" className="text-[10px] py-0">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {l}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CollapsibleTrigger>

                {/* Expanded Content */}
                <CollapsibleContent>
                    <div className="px-3 pb-3 border-t bg-muted/20">
                        <div className="pt-3 space-y-3">
                            {/* Original Story Text */}
                            <div>
                                <Label className="text-xs text-muted-foreground">From Story:</Label>
                                <div className="mt-1 p-2 rounded bg-muted/30 text-sm italic border border-dashed">
                                    &ldquo;{segment.text}&rdquo;
                                </div>
                            </div>

                            {/* Director's Notes - Guidance for AI */}
                            {!generatedPrompt && onNoteChange && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Director&apos;s Notes (optional guidance for AI):
                                    </Label>
                                    <Input
                                        className="mt-1 h-8 text-xs"
                                        placeholder="e.g., looking out over a city skyline at sunset..."
                                        value={shotNote || ''}
                                        onChange={(e) => {
                                            e.stopPropagation()
                                            onNoteChange(segment.sequence, e.target.value)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {shotNote && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            This note will guide the AI when generating the shot prompt
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Show notes if already set and prompt generated */}
                            {generatedPrompt && shotNote && (
                                <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Director&apos;s Notes Used:
                                    </Label>
                                    <div className="mt-1 p-2 rounded bg-amber-500/10 text-xs border border-amber-500/20">
                                        {shotNote}
                                    </div>
                                </div>
                            )}

                            {/* Rating & Greenlight (Director Mode) */}
                            {generatedPrompt && (
                                <div className="p-3 bg-muted/20 border rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <Label className="text-xs text-muted-foreground mb-1">Director Rating</Label>
                                            <div className="flex gap-0.5" onMouseLeave={() => setHoveredRating(0)}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        className="focus:outline-none transition-transform hover:scale-110 p-1 -m-1"
                                                        onMouseEnter={() => setHoveredRating(star)}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onMetadataChange?.(segment.sequence, { ...generatedPrompt.metadata, rating: star })
                                                        }}
                                                    >
                                                        <Star
                                                            className={`w-4 h-4 ${(hoveredRating || rating || 0) >= star
                                                                ? "fill-primary text-primary"
                                                                : "fill-muted text-muted-foreground/30"
                                                                }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none border-blue-500/20 text-blue-500 hover:bg-blue-500/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onGetAngles?.(segment.sequence)
                                            }}
                                        >
                                            <Grid3X3 className="w-4 h-4 mr-2" />
                                            Angles
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onGetBRoll?.(segment.sequence)
                                            }}
                                        >
                                            <Film className="w-4 h-4 mr-2" />
                                            B-Roll
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none border-purple-500/20 text-purple-500 hover:bg-purple-500/10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRefine?.(segment.sequence)
                                            }}
                                        >
                                            <FlaskConical className="w-4 h-4 mr-2" />
                                            Refine
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={isGreenlit ? "default" : "outline"}
                                            className={`flex-1 sm:flex-none ${isGreenlit ? "bg-green-500 hover:bg-green-600" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onMetadataChange?.(segment.sequence, { ...generatedPrompt.metadata, isGreenlit: !isGreenlit })
                                            }}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            {isGreenlit ? "Greenlit" : "Greenlight"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Generated/Edited Prompt */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">
                                        {generatedPrompt ? 'Shot Prompt:' : 'Raw Text (no AI prompt yet):'}
                                    </Label>
                                    {!isEditing && (
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={handleCopy}
                                            >
                                                {copied ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3 mr-1" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditedPrompt(generatedPrompt?.prompt || segment.text)
                                                    setIsEditing(true)
                                                }}
                                            >
                                                <Edit2 className="w-3 h-3 mr-1" />
                                                Edit
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={editedPrompt}
                                            onChange={(e) => setEditedPrompt(e.target.value)}
                                            className="min-h-[100px] text-sm"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleCancel()
                                                }}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSave()
                                                }}
                                            >
                                                <Check className="w-3 h-3 mr-1" />
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-2 rounded bg-background border text-sm">
                                        <HighlightedPrompt text={generatedPrompt?.prompt || segment.text} />
                                    </div>
                                )}
                            </div>

                            {/* Character References (with images if available) */}
                            {generatedPrompt?.characterRefs && generatedPrompt.characterRefs.length > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Character References:</Label>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {generatedPrompt.characterRefs.map((char: StoryboardCharacter) => (
                                            <div key={char.id} className="flex items-center gap-2 p-1.5 rounded bg-muted/50 border">
                                                {char.reference_image_url ? (
                                                    <img
                                                        src={char.reference_image_url}
                                                        alt={char.name}
                                                        className="w-8 h-8 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <span className="text-xs font-medium">{char.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Location Reference */}
                            {generatedPrompt?.locationRef && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Location Reference:</Label>
                                    <div className="flex items-center gap-2 mt-1 p-1.5 rounded bg-muted/50 border w-fit">
                                        {generatedPrompt.locationRef.reference_image_url ? (
                                            <img
                                                src={generatedPrompt.locationRef.reference_image_url}
                                                alt={generatedPrompt.locationRef.name}
                                                className="w-8 h-8 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <span className="text-xs font-medium">{generatedPrompt.locationRef.name}</span>
                                    </div>
                                </div>
                            )}

                            {/* Placeholder if no prompts generated yet */}
                            {!generatedPrompt && (
                                <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded border border-dashed">
                                    Click &ldquo;Generate Shot Prompts&rdquo; to transform this text into a cinematic shot description
                                </div>
                            )}
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

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
        updateGeneratedShot,
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

    const _handleUpdateLabShot = (updated: GeneratedShotPrompt) => {
        updateGeneratedShot(updated.sequence, updated)
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

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Failed to generate prompts')
                }

                const data = await response.json()

                // Transform API response to GeneratedShotPrompt format
                const batchPrompts: GeneratedShotPrompt[] = data.shots
                    .filter((shot: { sequence?: number; prompt?: string; shotType?: string }) => {
                        // Filter out malformed shots from LLM
                        if (!shot || typeof shot.sequence !== 'number' || !shot.prompt) {
                            console.warn('Skipping malformed shot from LLM:', shot)
                            return false
                        }
                        return true
                    })
                    .map((shot: { sequence: number; prompt: string; shotType?: string }) => {
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
                            <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">
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
                    <CardTitle className="text-sm flex items-center justify-between">
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
