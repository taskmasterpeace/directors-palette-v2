'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Play, Pause, CheckCircle, AlertCircle, SplitSquareVertical, Wand2, CheckSquare, Square, Sparkles, X, Coins, Images } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useStoryboardStore } from '../../store'
import { useEffectiveStyleGuide } from '../../hooks/useEffectiveStyleGuide'
import { Input } from '@/components/ui/input'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, Settings2 } from 'lucide-react'
import { type WildCard } from '@/features/shot-creator/helpers/wildcard/parser'
import {
    ensurePresetWildcards,
    getAvailableWildcards
} from '../../services/wildcard-integration.service'
import { HighlightedPrompt } from '../shared'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { TOKENS_PER_IMAGE } from '../../constants/generation.constants'
import { useGenerationOrchestration } from '../../hooks/useGenerationOrchestration'
import { getAvailableModels, type ModelId } from '@/config'

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
        storyText,
        generatedPrompts,
        promptsGenerated,
        chapters,
        generationSettings,
        globalPromptPrefix,
        globalPromptSuffix,
        setInternalTab,
        setGenerationSettings,
        setGlobalPromptPrefix,
        setGlobalPromptSuffix
    } = useStoryboardStore()

    // Get effective style guide - preset takes precedence, then custom styles, then user style guide
    const effectiveStyleGuide = useEffectiveStyleGuide()

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

    const [selectedShots, setSelectedShots] = useState<Set<number>>(new Set())
    const [showPrefixSuffix, setShowPrefixSuffix] = useState(false)

    // Use persisted settings from store
    const { aspectRatio, resolution, imageModel } = generationSettings

    // Get available image generation models
    const imageModels = useMemo(() => getAvailableModels().filter(m => m.type === 'generation'), [])

    // Wildcard state
    const [wildcardsEnabled, setWildcardsEnabled] = useState(false)
    const [wildcards, setWildcards] = useState<WildCard[]>([])
    const [wildcardsLoading, setWildcardsLoading] = useState(false)
    const [wildcardsInitialized, setWildcardsInitialized] = useState(false)

    // Generation orchestration hook
    const {
        startGeneration,
        cancelGeneration,
        pauseGeneration,
        resumeGeneration,
        isGenerating,
        isPaused,
        progress,
        results,
        lastCompletedImageUrl
    } = useGenerationOrchestration({
        chapterIndex,
        selectedShots,
        wildcardsEnabled,
        wildcards
    })

    // Clear selection when chapter changes so the initializer below can pick up the new chapter's shots
    useEffect(() => {
        setSelectedShots(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally only trigger on chapter change
    }, [chapterIndex])

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

    // Fetch balance on mount for early cost warning
    useEffect(() => {
        fetchBalance().catch(() => {})
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Calculate estimated cost in tokens
    const estimatedCost = useMemo(() => {
        return selectedShots.size * TOKENS_PER_IMAGE
    }, [selectedShots.size])

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
                <span className="text-sm text-muted-foreground">Settings:</span>
                <Select value={aspectRatio} onValueChange={(v) => setGenerationSettings({ aspectRatio: v })}>
                    <SelectTrigger className="h-8 w-[100px] text-sm">
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
                    <SelectTrigger className="h-8 w-[70px] text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1K">1K</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                </Select>

                {/* Model Selector */}
                <Select value={imageModel || 'nano-banana-pro'} onValueChange={(v) => setGenerationSettings({ imageModel: v as ModelId })}>
                    <SelectTrigger className="h-8 w-[180px] text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {imageModels.map(model => (
                            <SelectItem key={model.id} value={model.id}>
                                <div className="flex items-center gap-1.5">
                                    <span>{model.name}</span>
                                    <span className="text-xs text-muted-foreground">({Math.round(model.costPerImage * 100)} pts)</span>
                                </div>
                            </SelectItem>
                        ))}
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
                                <Badge variant="secondary" className="text-xs py-0 px-1.5">
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
                        <p className="text-xs text-muted-foreground">
                            These will be applied to all {selectedShots.size} selected shots during generation.
                        </p>
                    )}
                </CollapsibleContent>
            </Collapsible>

            {/* Cost Banner */}
            <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                balance > 0 && balance < estimatedCost
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-muted/30'
            }`}>
                <Coins className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span>
                        <span className="text-muted-foreground">Selected:</span>{' '}
                        <span className="font-medium">{selectedShots.size} shots</span>{' '}
                        <span className="text-muted-foreground">=</span>{' '}
                        <span className="font-medium">~{estimatedCost} tokens</span>
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span>
                        <span className="text-muted-foreground">Balance:</span>{' '}
                        <span className="font-medium">{balance} tokens</span>
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span>
                        <span className="text-muted-foreground">Remaining:</span>{' '}
                        <span className={`font-medium ${balance - estimatedCost < 0 ? 'text-red-500' : ''}`}>
                            {balance - estimatedCost} tokens
                        </span>
                    </span>
                </div>
                {balance > 0 && balance < estimatedCost && (
                    <Badge variant="destructive" className="text-xs ml-auto">
                        Insufficient credits
                    </Badge>
                )}
            </div>

            {/* Selection Controls */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Select:</span>
                <Button variant="outline" size="sm" className="h-7 text-sm px-2" onClick={selectAll}>
                    <CheckSquare className="w-3.5 h-3.5 mr-1" /> All
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-sm px-2" onClick={selectNone}>
                    <Square className="w-3.5 h-3.5 mr-1" /> None
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-sm px-2" onClick={() => selectRange(5)}>
                    First 5
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-sm px-2" onClick={() => selectRange(10)}>
                    First 10
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-sm px-2" onClick={() => selectRange(20)}>
                    First 20
                </Button>
                <div className="flex-1" />
                <Badge variant={selectedShots.size > 20 ? "destructive" : "outline"} className="text-sm font-medium">
                    {selectedShots.size} selected ~ {estimatedCost} tokens
                </Badge>
            </div>

            {/* Shot List with Checkboxes */}
            <Card>
                <CardContent className="p-3 space-y-3">
                    {/* Progress with Live Preview */}
                    {isGenerating && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span>
                                    {isPaused ? 'Paused' : 'Generating'} shot {progress.current} of {progress.total}
                                    {isPaused && ' (will resume from next shot)'}
                                </span>
                                <span>{Math.round(progressPercent)}%</span>
                            </div>
                            <Progress value={progressPercent} />
                            {/* Live preview strip */}
                            {lastCompletedImageUrl && (
                                <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-md">
                                    <img
                                        src={lastCompletedImageUrl}
                                        alt="Last completed shot"
                                        className="w-16 h-10 object-cover rounded border"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        Shot {progress.current > 0 ? progress.current : 1} completed
                                        {progress.current < progress.total && ` \u2022 Generating shot ${progress.current + 1}...`}
                                    </span>
                                </div>
                            )}
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
                            {successCount > 0 && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="ml-auto"
                                    onClick={() => setInternalTab('gallery')}
                                >
                                    <Images className="w-4 h-4 mr-2" />
                                    View {successCount} Shot{successCount !== 1 ? 's' : ''} in Gallery
                                </Button>
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
                                                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${SHOT_TYPE_COLORS[shot.shotType] || 'bg-gray-500'}`}
                                            >
                                                {shot.sequence}
                                            </div>
                                            <Badge variant="outline" className="text-xs capitalize py-0">
                                                {shot.shotType}
                                            </Badge>
                                            {shot.characterRefs.length > 0 && (
                                                <Badge variant="secondary" className="text-xs py-0">
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
                                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1 ml-9">
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
                            onClick={startGeneration}
                            disabled={isGenerating || selectedShots.size === 0 || (balance > 0 && balance < estimatedCost)}
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
                        {isGenerating && !isPaused && (
                            <Button
                                variant="outline"
                                size="default"
                                onClick={pauseGeneration}
                                className="flex-shrink-0"
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                        )}
                        {isGenerating && isPaused && (
                            <Button
                                variant="outline"
                                size="default"
                                onClick={resumeGeneration}
                                className="flex-shrink-0"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Resume
                            </Button>
                        )}
                        {isGenerating && (
                            <Button
                                variant="destructive"
                                size="default"
                                onClick={cancelGeneration}
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
