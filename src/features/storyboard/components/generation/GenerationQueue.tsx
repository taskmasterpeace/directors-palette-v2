'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Play, CheckCircle, AlertCircle, SplitSquareVertical, Wand2, CheckSquare, Square, Sparkles, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useStoryboardStore } from '../../store'
import { storyboardGenerationService } from '../../services/storyboard-generation.service'
import { PRESET_STYLES } from '../../types/storyboard.types'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Settings2 } from 'lucide-react'
import { type WildCard } from '@/features/shot-creator/helpers/wildcard/parser'
import {
    processPromptsWithWildcards,
    ensurePresetWildcards,
    getAvailableWildcards
} from '../../services/wildcard-integration.service'
import { HighlightedPrompt } from '../shared'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { toast } from 'sonner'

interface GenerationResult {
    shotNumber: number
    predictionId: string
    imageUrl?: string
    error?: string
}

interface GenerationQueueProps {
    chapterIndex?: number
}

// Shot type colors - defined at module level for performance
const SHOT_TYPE_COLORS: Record<string, string> = {
    'establishing': 'bg-purple-500',
    'wide': 'bg-blue-500',
    'medium': 'bg-green-500',
    'close-up': 'bg-amber-500',
    'detail': 'bg-red-500',
    'unknown': 'bg-gray-500'
}

export function GenerationQueue({ chapterIndex = 0 }: GenerationQueueProps) {
    const {
        breakdownResult,
        currentStyleGuide,
        selectedPresetStyle,
        characters,
        locations,
        storyText,
        generatedPrompts,
        promptsGenerated,
        chapters,
        generationSettings,
        globalPromptPrefix,
        globalPromptSuffix,
        setGeneratedImage,
        clearGeneratedImages,
        setInternalTab,
        setGenerationSettings,
        setGlobalPromptPrefix,
        setGlobalPromptSuffix
    } = useStoryboardStore()

    // Get effective style guide - preset takes precedence, then custom
    const effectiveStyleGuide = useMemo(() => {
        if (!selectedPresetStyle) return currentStyleGuide
        const preset = PRESET_STYLES.find(s => s.id === selectedPresetStyle)
        if (!preset) return currentStyleGuide
        return {
            id: `preset-${selectedPresetStyle}`,
            user_id: '',
            name: preset.name,
            style_prompt: preset.stylePrompt,
            reference_image_url: preset.imagePath,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    }, [selectedPresetStyle, currentStyleGuide])

    // Filter prompts by chapter
    // chapterIndex of -1 means "All Chapters" view - show all prompts
    const filteredPrompts = useMemo(() => {
        if (!generatedPrompts.length) return []
        if (!chapters || chapters.length === 0) return generatedPrompts

        // "All Chapters" view - show all prompts
        if (chapterIndex < 0) return generatedPrompts

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return generatedPrompts
        }

        return generatedPrompts.filter(p =>
            activeChapter.segmentIndices.includes(p.sequence)
        )
    }, [generatedPrompts, chapters, chapterIndex])

    // Credits for pre-generation check
    const { balance, fetchBalance } = useCreditsStore()

    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [results, setResults] = useState<GenerationResult[]>([])
    const [selectedShots, setSelectedShots] = useState<Set<number>>(new Set())
    const [showPrefixSuffix, setShowPrefixSuffix] = useState(false)

    // Abort controller for cancellation
    const abortControllerRef = useRef<AbortController | null>(null)

    // Use persisted settings from store
    const { aspectRatio, resolution } = generationSettings

    // Wildcard state
    const [wildcardsEnabled, setWildcardsEnabled] = useState(false)
    const [wildcards, setWildcards] = useState<WildCard[]>([])
    const [wildcardsLoading, setWildcardsLoading] = useState(false)
    const [wildcardsInitialized, setWildcardsInitialized] = useState(false)

    // Reset selection when chapter changes
    useEffect(() => {
        if (filteredPrompts.length > 0) {
            // Default: select all shots in the chapter
            const initialSelection = new Set(filteredPrompts.map(p => p.sequence))
            setSelectedShots(initialSelection)
        } else {
            setSelectedShots(new Set())
        }
    }, [chapterIndex]) // Only re-run when chapter changes

    // Initialize selected shots on first load
    useEffect(() => {
        if (filteredPrompts.length > 0 && selectedShots.size === 0) {
            // Select all shots by default
            const initialSelection = new Set(filteredPrompts.map(p => p.sequence))
            setSelectedShots(initialSelection)
        }
    }, [filteredPrompts.length]) // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize wildcards on mount (auto-create presets if needed)
    useEffect(() => {
        if (wildcardsInitialized) return

        const initWildcards = async () => {
            setWildcardsLoading(true)
            try {
                // Auto-create preset wildcards if missing
                await ensurePresetWildcards()

                // Load all available wildcards
                const { wildcards: loadedWildcards } = await getAvailableWildcards()
                setWildcards(loadedWildcards)
            } catch (error) {
                console.error('Failed to initialize wildcards:', error)
            } finally {
                setWildcardsLoading(false)
                setWildcardsInitialized(true)
            }
        }

        initWildcards()
    }, [wildcardsInitialized])

    // Page unload warning during generation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isGenerating) {
                e.preventDefault()
                e.returnValue = 'Image generation is in progress. Are you sure you want to leave? Your progress will be lost.'
                return e.returnValue
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isGenerating])

    // Cancel generation handler
    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsGenerating(false)
            toast.info('Generation cancelled')
        }
    }

    const toggleShot = (sequence: number) => {
        setSelectedShots(prev => {
            const next = new Set(prev)
            if (next.has(sequence)) {
                next.delete(sequence)
            } else {
                next.add(sequence)
            }
            return next
        })
    }

    const selectAll = () => {
        setSelectedShots(new Set(filteredPrompts.map(p => p.sequence)))
    }

    const selectNone = () => {
        setSelectedShots(new Set())
    }

    const selectRange = (count: number) => {
        setSelectedShots(new Set(filteredPrompts.slice(0, count).map(p => p.sequence)))
    }

    // Calculate estimated cost in tokens (20 tokens per image for Nano Banana Pro)
    const estimatedCost = useMemo(() => {
        const perImageTokens = 20 // Tokens per image (Nano Banana Pro)
        return selectedShots.size * perImageTokens
    }, [selectedShots.size])

    useEffect(() => {
        storyboardGenerationService.setProgressCallback((p) => {
            setProgress({ current: p.current, total: p.total })
        })
    }, [])

    const handleStartGeneration = async () => {
        // Require generated prompts and selection before generation
        if (!promptsGenerated || !generatedPrompts.length || selectedShots.size === 0) return

        // Credit check before generation
        const costPerShot = 20  // cents for nano-banana-pro
        const totalCost = selectedShots.size * costPerShot

        try {
            await fetchBalance()
        } catch {
            // Continue anyway, API will catch it
        }

        if (balance < totalCost) {
            toast.error(
                `Insufficient credits. You need ${totalCost} tokens but only have ${balance}. Purchase more credits to continue.`,
                { duration: 5000 }
            )
            return
        }

        // Confirm generation cost
        const confirmed = confirm(
            `Generate ${selectedShots.size} images for approximately ${totalCost} tokens?\n\nYour balance: ${balance} tokens\nRemaining after: ${balance - totalCost} tokens`
        )
        if (!confirmed) return

        // Filter to only selected shots
        let shotsToGenerate = generatedPrompts.filter(p => selectedShots.has(p.sequence))

        // Apply wildcards if enabled
        if (wildcardsEnabled && wildcards.length > 0) {
            shotsToGenerate = processPromptsWithWildcards(shotsToGenerate, wildcards)
        }

        // Apply global prefix/suffix
        if (globalPromptPrefix || globalPromptSuffix) {
            shotsToGenerate = shotsToGenerate.map(shot => ({
                ...shot,
                prompt: `${globalPromptPrefix}${shot.prompt}${globalPromptSuffix}`.trim()
            }))
        }

        // Set up abort controller for cancellation
        abortControllerRef.current = new AbortController()

        setIsGenerating(true)
        setResults([])
        clearGeneratedImages()

        try {
            const generationResults = await storyboardGenerationService.generateShotsFromPrompts(
                shotsToGenerate,
                {
                    model: 'nano-banana-pro',
                    aspectRatio,
                    resolution
                },
                effectiveStyleGuide || undefined,
                characters,
                locations,
                abortControllerRef.current?.signal
            )

            setResults(generationResults)

            // Store results in the global store with enhanced metadata
            const activeChapter = chapters[chapterIndex]
            const generationTimestamp = new Date().toISOString()

            for (const result of generationResults) {
                const shotPrompt = shotsToGenerate.find(p => p.sequence === result.shotNumber)

                setGeneratedImage(result.shotNumber, {
                    predictionId: result.predictionId,
                    status: result.error ? 'failed' : 'completed',
                    error: result.error,
                    imageUrl: result.imageUrl, // Include imageUrl from polling response

                    // Chapter context
                    chapterIndex: chapterIndex,
                    chapterTitle: activeChapter?.title || `Chapter ${(activeChapter?.sequence || 0) + 1}`,

                    // Prompt context
                    originalPrompt: shotPrompt?.metadata?.originalPromptWithWildcards || shotPrompt?.prompt,
                    finalPrompt: shotPrompt?.prompt,
                    appliedWildcards: shotPrompt?.metadata?.appliedWildcards,

                    // Style guide
                    styleGuideUsed: effectiveStyleGuide ? {
                        id: effectiveStyleGuide.id,
                        name: effectiveStyleGuide.name,
                        isPreset: selectedPresetStyle !== null,
                        presetId: selectedPresetStyle || undefined
                    } : undefined,

                    // Generation config
                    generationConfig: {
                        aspectRatio,
                        resolution,
                        model: 'nano-banana-pro'
                    },

                    // Timestamp
                    generationTimestamp
                })
            }

            // Auto-navigate to gallery on completion
            if (generationResults.length > 0 && !generationResults.some(r => r.error)) {
                setTimeout(() => setInternalTab('gallery'), 500)
            }
        } catch (error) {
            // Check if it was cancelled
            if (error instanceof Error && error.name === 'AbortError') {
                toast.info('Generation was cancelled')
            } else {
                console.error('Generation failed:', error)
                toast.error('Generation failed. Please try again.')
            }
        } finally {
            setIsGenerating(false)
            abortControllerRef.current = null
        }
    }

    const successCount = results.filter(r => !r.error).length
    const failedCount = results.filter(r => r.error).length
    const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    if (!storyText.trim()) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <SplitSquareVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No story text yet.</p>
                    <p className="text-sm">Go to the Story tab and enter your story first.</p>
                </CardContent>
            </Card>
        )
    }

    if (!breakdownResult) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <SplitSquareVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No shot breakdown yet.</p>
                    <p className="text-sm">Go to the Shots tab and adjust the breakdown slider.</p>
                </CardContent>
            </Card>
        )
    }

    if (!promptsGenerated || !filteredPrompts.length) {
        return (
            <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
                <CardContent className="py-8 text-center">
                    <Wand2 className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="font-medium text-amber-500">
                        {promptsGenerated ? 'No shots in this chapter' : 'Shot prompts not generated yet'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        {promptsGenerated
                            ? 'This chapter has no shot prompts. Try selecting a different chapter.'
                            : <>Go to the <strong>Shots</strong> tab and click <strong>&quot;Generate Shot Prompts&quot;</strong> to transform your story segments into cinematic shot descriptions before generating images.</>
                        }
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => setInternalTab('shots')}
                    >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Go to Shots Tab
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-3">
            {/* Compact Settings Bar */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border">
                <span className="text-xs text-muted-foreground">Settings:</span>
                <Select value={aspectRatio} onValueChange={(v) => setGenerationSettings({ aspectRatio: v })}>
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="21:9">21:9</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={resolution} onValueChange={(v) => setGenerationSettings({ resolution: v as '1K' | '2K' | '4K' })}>
                    <SelectTrigger className="h-7 w-[70px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1K">1K</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                </Select>

                {/* Wildcard Toggle */}
                <div className="flex items-center gap-1.5 border-l pl-3 ml-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className={`w-3.5 h-3.5 ${wildcardsEnabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                    <Switch
                                        checked={wildcardsEnabled}
                                        onCheckedChange={setWildcardsEnabled}
                                        disabled={wildcardsLoading || wildcards.length === 0}
                                        className="scale-75"
                                    />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[250px]">
                                <p className="font-medium">Wildcards {wildcardsEnabled ? 'ON' : 'OFF'}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Use <code className="bg-muted px-1 rounded">_variableName_</code> in prompts to randomly substitute values.
                                    {wildcards.length > 0 && (
                                        <span className="block mt-1">{wildcards.length} wildcards available</span>
                                    )}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="flex-1" />
                {effectiveStyleGuide && (
                    <Badge variant="secondary" className="text-xs">
                        Style: {effectiveStyleGuide.name}
                    </Badge>
                )}
            </div>

            {/* Prompt Prefix/Suffix */}
            <Collapsible open={showPrefixSuffix} onOpenChange={setShowPrefixSuffix}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs px-2 bg-muted/30">
                        <div className="flex items-center gap-1.5">
                            <Settings2 className="w-3.5 h-3.5" />
                            <span>Prompt Prefix/Suffix</span>
                            {(globalPromptPrefix || globalPromptSuffix) && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1">
                                    Active
                                </Badge>
                            )}
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPrefixSuffix ? 'rotate-180' : ''}`} />
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 p-2 bg-muted/20 rounded-lg border">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Prefix (added to start of every prompt)</label>
                        <Input
                            placeholder="e.g., cinematic lighting, 4K quality,"
                            value={globalPromptPrefix}
                            onChange={(e) => setGlobalPromptPrefix(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Suffix (added to end of every prompt)</label>
                        <Input
                            placeholder="e.g., , professional photography, studio lighting"
                            value={globalPromptSuffix}
                            onChange={(e) => setGlobalPromptSuffix(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                    {(globalPromptPrefix || globalPromptSuffix) && (
                        <p className="text-[10px] text-muted-foreground">
                            These will be applied to all {selectedShots.size} selected shots during generation.
                        </p>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Selection Controls */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Select:</span>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>
                    <CheckSquare className="w-3 h-3 mr-1" /> All
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={selectNone}>
                    <Square className="w-3 h-3 mr-1" /> None
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => selectRange(5)}>
                    First 5
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => selectRange(10)}>
                    First 10
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => selectRange(20)}>
                    First 20
                </Button>
                <div className="flex-1" />
                <Badge variant={selectedShots.size > 20 ? "destructive" : "outline"} className="text-xs">
                    {selectedShots.size} selected ~ {estimatedCost} tokens
                </Badge>
            </div>

            {/* Shot List with Checkboxes */}
            <Card>
                <CardContent className="p-3 space-y-3">
                    {/* Progress */}
                    {isGenerating && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>Generating shot {progress.current} of {progress.total}...</span>
                                <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <Progress value={progressPercent} />
                        </div>
                    )}

                    {/* Results Summary */}
                    {results.length > 0 && !isGenerating && (
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-2 text-green-500">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm">{successCount} completed</span>
                            </div>
                            {failedCount > 0 && (
                                <div className="flex items-center gap-2 text-destructive">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">{failedCount} failed</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Shot List - Show AI Generated Prompts with Checkboxes */}
                    <ScrollArea className="h-[350px]">
                        <div className="space-y-1">
                            {filteredPrompts.map((shot) => {
                                const result = results.find(r => r.shotNumber === shot.sequence)
                                const isSelected = selectedShots.has(shot.sequence)

                                return (
                                    <div
                                        key={shot.sequence}
                                        className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-primary/10 border-primary/30'
                                                : 'bg-card/50 hover:bg-card/80'
                                        }`}
                                        onClick={() => toggleShot(shot.sequence)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleShot(shot.sequence)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-shrink-0"
                                            />
                                            <div
                                                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${SHOT_TYPE_COLORS[shot.shotType] || 'bg-gray-500'}`}
                                            >
                                                {shot.sequence}
                                            </div>
                                            <Badge variant="outline" className="text-[10px] capitalize py-0">
                                                {shot.shotType}
                                            </Badge>
                                            {shot.characterRefs.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px] py-0">
                                                    {shot.characterRefs.map(c => c.name).join(', ')}
                                                </Badge>
                                            )}
                                            <div className="flex-1" />
                                            <div className="flex-shrink-0">
                                                {isGenerating && progress.current === shot.sequence ? (
                                                    <LoadingSpinner size="xs" />
                                                ) : result ? (
                                                    result.error ? (
                                                        <AlertCircle className="w-3 h-3 text-destructive" />
                                                    ) : (
                                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                                    )
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground line-clamp-1 mt-1 ml-7">
                                            <HighlightedPrompt text={shot.prompt} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleStartGeneration}
                            disabled={isGenerating || selectedShots.size === 0}
                            className="flex-1"
                            size="default"
                        >
                            {isGenerating ? (
                                <>
                                    <LoadingSpinner size="sm" color="current" className="mr-2" />
                                    Generating {progress.current}/{progress.total}...
                                </>
                            ) : selectedShots.size === 0 ? (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Select shots to generate
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Generate {selectedShots.size} Selected Shots (~{estimatedCost} tokens)
                                </>
                            )}
                        </Button>
                        {isGenerating && (
                            <Button
                                variant="destructive"
                                size="default"
                                onClick={handleCancelGeneration}
                                className="flex-shrink-0"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
