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
import { Settings2 } from 'lucide-react'
import { type WildCard } from '@/features/shot-creator/helpers/wildcard/parser'
import {
    ensurePresetWildcards,
    getAvailableWildcards
} from '../../services/wildcard-integration.service'
import { HighlightedPrompt } from '../shared'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { useGenerationOrchestration } from '../../hooks/useGenerationOrchestration'
import { getAvailableModels, getModelCost, type ModelId } from '@/config'
import { logger } from '@/lib/logger'

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
    }, [chapterIndex]) // setSelectedShots is a stable zustand action

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
                logger.storyboard.error('Failed to initialize wildcards', { error: error instanceof Error ? error.message : String(error) })
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

    // Calculate estimated cost in tokens based on actual model + resolution
    const estimatedCost = useMemo(() => {
        const model = imageModel || 'nano-banana-2'
        const costDollars = getModelCost(model, resolution)
        const costPerImagePts = Math.ceil(costDollars * 100)
        return selectedShots.size * costPerImagePts
    }, [selectedShots.size, imageModel, resolution])

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
        <div className="space-y-2">
            {/* Compact Settings Row */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border flex-wrap">
                <Select value={imageModel || 'nano-banana-2'} onValueChange={(v) => setGenerationSettings({ imageModel: v as ModelId })}>
                    <SelectTrigger className="h-7 w-[160px] text-xs">
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
                <Select value={aspectRatio} onValueChange={(v) => setGenerationSettings({ aspectRatio: v })}>
                    <SelectTrigger className="h-7 w-[80px] text-xs">
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
                    <SelectTrigger className="h-7 w-[60px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1K">1K</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                </Select>

                {/* Wildcard Toggle */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 border-l pl-2 ml-1">
                                <Sparkles className={`w-3 h-3 ${wildcardsEnabled ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                <Switch
                                    checked={wildcardsEnabled}
                                    onCheckedChange={setWildcardsEnabled}
                                    disabled={wildcardsLoading || wildcards.length === 0}
                                    className="scale-[0.65]"
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

                {/* Prefix/Suffix toggle */}
                <button
                    onClick={() => setShowPrefixSuffix(!showPrefixSuffix)}
                    className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border transition-colors ${
                        showPrefixSuffix || globalPromptPrefix || globalPromptSuffix
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Settings2 className="w-3 h-3" />
                    {(globalPromptPrefix || globalPromptSuffix) ? 'Prefix/Suffix Active' : 'Prefix/Suffix'}
                </button>

                <div className="flex-1" />

                {/* Inline cost info */}
                <div className="flex items-center gap-2 text-xs">
                    <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{selectedShots.size} shots</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-medium">~{estimatedCost} tokens</span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className={`font-medium ${balance - estimatedCost < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {balance} bal
                    </span>
                    {balance > 0 && balance < estimatedCost && (
                        <Badge variant="destructive" className="text-[10px] py-0 px-1">
                            Low
                        </Badge>
                    )}
                </div>
                {effectiveStyleGuide && (
                    <Badge variant="secondary" className="text-[10px] py-0">
                        {effectiveStyleGuide.name}
                    </Badge>
                )}
            </div>

            {/* Prefix/Suffix - collapsible inline */}
            {showPrefixSuffix && (
                <div className="grid grid-cols-2 gap-2 p-2 bg-muted/20 rounded-lg border">
                    <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Prefix</label>
                        <Input
                            placeholder="e.g., cinematic lighting, 4K quality,"
                            value={globalPromptPrefix}
                            onChange={(e) => setGlobalPromptPrefix(e.target.value)}
                            className="h-7 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Suffix</label>
                        <Input
                            placeholder="e.g., , professional photography"
                            value={globalPromptSuffix}
                            onChange={(e) => setGlobalPromptSuffix(e.target.value)}
                            className="h-7 text-xs"
                        />
                    </div>
                </div>
            )}

            {/* Selection Controls - single compact row */}
            <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={selectAll}>
                    <CheckSquare className="w-3 h-3 mr-1" /> All
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={selectNone}>
                    <Square className="w-3 h-3 mr-1" /> None
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-1.5" onClick={() => selectRange(5)}>5</Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-1.5" onClick={() => selectRange(10)}>10</Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-1.5" onClick={() => selectRange(20)}>20</Button>
            </div>

            {/* Progress Banner - prominent when generating */}
            {isGenerating && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <LoadingSpinner size="sm" color="primary" />
                            <span className="text-sm font-medium">
                                {isPaused ? 'Paused' : 'Generating'} — Shot {progress.current} of {progress.total}
                            </span>
                        </div>
                        <span className="text-lg font-bold text-primary">{Math.round(progressPercent)}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    {lastCompletedImageUrl && (
                        <div className="flex items-center gap-3">
                            <img
                                src={lastCompletedImageUrl}
                                alt="Last completed shot"
                                className="w-14 h-9 object-cover rounded border"
                            />
                            <span className="text-xs text-muted-foreground">
                                {progress.current} of {progress.total} complete
                                {failedCount > 0 && ` • ${failedCount} failed`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Results Summary */}
            {results.length > 0 && !isGenerating && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-1.5 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{successCount}</span>
                    </div>
                    {failedCount > 0 && (
                        <div className="flex items-center gap-1.5 text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{failedCount}</span>
                        </div>
                    )}
                    {successCount > 0 && (
                        <Button
                            variant="default"
                            size="sm"
                            className="ml-auto h-7 text-xs"
                            onClick={() => setInternalTab('gallery')}
                        >
                            <Images className="w-3.5 h-3.5 mr-1.5" />
                            View Results
                        </Button>
                    )}
                </div>
            )}

            {/* Shot List with Checkboxes */}
            <Card>
                <CardContent className="p-3 space-y-2">

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
