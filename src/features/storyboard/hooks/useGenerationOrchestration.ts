'use client'

import { useState, useRef, useEffect } from 'react'
import { useStoryboardStore } from '../store'
import { storyboardGenerationService } from '../services/storyboard-generation.service'
import { useEffectiveStyle } from './useEffectiveStyleGuide'
import { processPromptsWithWildcards } from '../services/wildcard-integration.service'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { TOKENS_PER_IMAGE } from '../constants/generation.constants'
import { toast } from 'sonner'
import type { WildCard } from '@/features/shot-creator/helpers/wildcard/parser'
import type { ModelId } from '@/config'

interface GenerationResult {
    shotNumber: number
    predictionId: string
    imageUrl?: string
    error?: string
}

interface UseGenerationOrchestrationParams {
    chapterIndex: number
    selectedShots: Set<number>
    wildcardsEnabled: boolean
    wildcards: WildCard[]
}

export function useGenerationOrchestration({
    chapterIndex,
    selectedShots,
    wildcardsEnabled,
    wildcards
}: UseGenerationOrchestrationParams) {
    const {
        selectedPresetStyle,
        characters,
        locations,
        generatedPrompts,
        promptsGenerated,
        chapters,
        generationSettings,
        globalPromptPrefix,
        globalPromptSuffix,
        setGeneratedImage,
        clearGeneratedImages,
        setInternalTab
    } = useStoryboardStore()

    const { styleGuide: effectiveStyleGuide, presetStyle: effectivePresetStyle } = useEffectiveStyle()
    const { fetchBalance } = useCreditsStore()

    const { aspectRatio, resolution, imageModel } = generationSettings

    const [isGenerating, setIsGenerating] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const isPausedRef = useRef(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [results, setResults] = useState<GenerationResult[]>([])
    const [lastCompletedImageUrl, setLastCompletedImageUrl] = useState<string | null>(null)

    const abortControllerRef = useRef<AbortController | null>(null)

    // Set up progress callback
    useEffect(() => {
        storyboardGenerationService.setProgressCallback((p) => {
            setProgress({ current: p.current, total: p.total })
        })
    }, [])

    const startGeneration = async () => {
        if (!promptsGenerated || !generatedPrompts.length || selectedShots.size === 0) return

        // Credit check - use fresh balance after fetch
        const totalCost = selectedShots.size * TOKENS_PER_IMAGE

        try {
            await fetchBalance()
        } catch {
            // Continue anyway, API will catch it
        }
        const currentBalance = useCreditsStore.getState().balance

        if (currentBalance < totalCost) {
            toast.error(
                `Insufficient credits. You need ${totalCost} tokens but only have ${currentBalance}. Purchase more credits to continue.`,
                { duration: 5000 }
            )
            return
        }

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
        setIsPaused(false)
        isPausedRef.current = false
        setResults([])
        setLastCompletedImageUrl(null)
        clearGeneratedImages()

        try {
            const selectedModel: ModelId = imageModel || 'nano-banana-pro'
            const generationResults = await storyboardGenerationService.generateShotsFromPrompts(
                shotsToGenerate,
                {
                    model: selectedModel,
                    aspectRatio,
                    resolution
                },
                effectiveStyleGuide || undefined,
                characters,
                locations,
                abortControllerRef.current?.signal,
                () => isPausedRef.current,
                effectivePresetStyle || undefined
            )

            setResults(generationResults)

            // Store results in the global store with enhanced metadata
            const activeChapter = chapters[chapterIndex]
            const generationTimestamp = new Date().toISOString()

            for (const result of generationResults) {
                const shotPrompt = shotsToGenerate.find(p => p.sequence === result.shotNumber)

                // Track last completed image for live preview
                if (result.imageUrl && !result.error) {
                    setLastCompletedImageUrl(result.imageUrl)
                }

                setGeneratedImage(result.shotNumber, {
                    predictionId: result.predictionId,
                    status: result.error ? 'failed' : 'completed',
                    error: result.error,
                    imageUrl: result.imageUrl,
                    chapterIndex: chapterIndex,
                    chapterTitle: activeChapter?.title || `Chapter ${(activeChapter?.sequence || 0) + 1}`,
                    originalPrompt: shotPrompt?.metadata?.originalPromptWithWildcards || shotPrompt?.prompt,
                    finalPrompt: shotPrompt?.prompt,
                    appliedWildcards: shotPrompt?.metadata?.appliedWildcards,
                    styleGuideUsed: effectiveStyleGuide ? {
                        id: effectiveStyleGuide.id,
                        name: effectiveStyleGuide.name,
                        isPreset: selectedPresetStyle !== null,
                        presetId: selectedPresetStyle || undefined
                    } : undefined,
                    generationConfig: {
                        aspectRatio,
                        resolution,
                        model: selectedModel
                    },
                    generationTimestamp
                })
            }

            // Auto-navigate to gallery on completion
            if (generationResults.length > 0 && !generationResults.some(r => r.error)) {
                setTimeout(() => setInternalTab('gallery'), 500)
            }
        } catch (error) {
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

    const cancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsGenerating(false)
            setIsPaused(false)
            isPausedRef.current = false
            setProgress({ current: 0, total: 0 })
            toast.info('Generation cancelled')
        }
    }

    const pauseGeneration = () => {
        setIsPaused(true)
        isPausedRef.current = true
        toast.info('Generation paused after current shot')
    }

    const resumeGeneration = () => {
        setIsPaused(false)
        isPausedRef.current = false
        toast.info('Generation resumed')
    }

    return {
        startGeneration,
        cancelGeneration,
        pauseGeneration,
        resumeGeneration,
        isGenerating,
        isPaused,
        progress,
        results,
        lastCompletedImageUrl
    }
}
