'use client'

import { useCallback } from 'react'
import { useStoryboardStore } from '../store'
import { detectChapters, mapSegmentsToChapters } from '../services/chapter-detection.service'
import { createTitleCards } from '../services/title-card.service'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { toast } from 'sonner'
import type { ClassifiedSegment, DocumentaryChapter, BRollPoolCategory } from '../types/storyboard.types'
import { logger } from '@/lib/logger'

export function useDocumentaryPipeline() {
    const {
        storyText,
        selectedModel,
        breakdownResult,
        currentStyleGuide,
        characters,
        isDocumentaryMode,
        setDocumentaryChapters,
        setIsClassifyingSegments,
        setIsGeneratingBrollPool,
        setIsGeneratingTitleCards,
    } = useStoryboardStore()

    const runPipeline = useCallback(async () => {
        if (!isDocumentaryMode || !breakdownResult) return
        const segments = breakdownResult.segments

        // Resolve style prompt
        let stylePrompt = ''
        if (currentStyleGuide?.style_prompt) {
            stylePrompt = currentStyleGuide.style_prompt
        }

        const characterDescriptions = characters
            .map((c) => `${c.name}: ${c.description || 'no description'}`)
            .join('; ')

        try {
            // === Step 1: Classify segments ===
            setIsClassifyingSegments(true)
            toast.info('Classifying segments...')

            const classifyRes = await fetch('/api/storyboard/classify-segments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    segments: segments.map((s) => ({
                        sequence: s.sequence, text: s.text,
                        start_index: s.start_index, end_index: s.end_index,
                        color: s.color,
                    })),
                    storyText,
                    model: selectedModel,
                }),
            })

            const classifyResult = await safeJsonParse<{
                success: boolean
                segments: ClassifiedSegment[]
                error?: string
            }>(classifyRes)

            if (!classifyResult.success) {
                toast.error(`Classification failed: ${classifyResult.error}`)
                setIsClassifyingSegments(false)
                return
            }

            const classifiedSegments = classifyResult.segments
            setIsClassifyingSegments(false)

            const actionCount = classifiedSegments.filter((s) => s.classification === 'action').length
            const narrationCount = classifiedSegments.filter((s) => s.classification === 'narration').length
            const transitionCount = classifiedSegments.filter((s) => s.classification === 'transition').length
            toast.success(`Classified: ${actionCount} action, ${narrationCount} narration, ${transitionCount} transition`)

            // === Step 2: Detect chapters ===
            const chapterResult = detectChapters(storyText)
            const chaptersWithSegments = mapSegmentsToChapters(chapterResult.chapters, classifiedSegments)

            // === Step 3: Name chapters via LLM ===
            toast.info('Naming chapters...')
            const namesRes = await fetch('/api/storyboard/chapter-names', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapters: chaptersWithSegments,
                    storyText,
                    model: selectedModel,
                }),
            })

            const namesResult = await safeJsonParse<{
                names: Array<{ index: number; name: string }>
            }>(namesRes)
            const chapterNames = namesResult.names ||
                chaptersWithSegments.map((ch, i) => ({ index: i, name: ch.title || `Chapter ${i + 1}` }))

            // === Step 4: Create title cards ===
            setIsGeneratingTitleCards(true)
            const titleCards = createTitleCards(chapterNames, stylePrompt)

            // === Step 5: Generate B-roll pools per chapter ===
            setIsGeneratingBrollPool(true)
            toast.info('Generating B-roll pools...')

            const documentaryChapters: DocumentaryChapter[] = []

            for (let i = 0; i < chaptersWithSegments.length; i++) {
                const chapter = chaptersWithSegments[i]
                const chapterName = chapterNames.find((n) => n.index === i)
                const chapterText = storyText.substring(chapter.startIndex, chapter.endIndex)

                // Get classified segments for this chapter
                const chapterClassified = classifiedSegments.filter((s) =>
                    chapter.segmentIndices.includes(s.sequence)
                )
                const narrationSegs = chapterClassified
                    .filter((s) => s.classification === 'narration')
                    .map((s) => ({ sequence: s.sequence, text: s.text }))

                // Generate B-roll pool
                let brollCategories: BRollPoolCategory[] = []
                try {
                    const poolRes = await fetch('/api/storyboard/broll-pool', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chapterText,
                            chapterIndex: i,
                            storyContext: storyText,
                            stylePrompt,
                            characterDescriptions,
                            narrationSegments: narrationSegs,
                            model: selectedModel,
                        }),
                    })
                    const poolResult = await safeJsonParse<{ categories: BRollPoolCategory[] }>(poolRes)
                    brollCategories = poolResult.categories || []
                } catch {
                    logger.storyboard.error('B-roll pool generation failed', { chapter: i })
                }

                // Apply B-roll assignments to classified segments
                const assignedSegments = chapterClassified.map((seg) => {
                    if (seg.classification === 'narration') {
                        const assignedCat = brollCategories.find((cat) =>
                            cat.assignedSegments.includes(seg.sequence)
                        )
                        return assignedCat ? { ...seg, brollCategoryId: assignedCat.id } : seg
                    }
                    return seg
                })

                documentaryChapters.push({
                    index: i,
                    name: chapterName?.name || chapter.title || `Chapter ${i + 1}`,
                    nameEdited: false,
                    startIndex: chapter.startIndex,
                    endIndex: chapter.endIndex,
                    titleCard: titleCards[i] || {
                        chapterIndex: i,
                        chapterName: chapterName?.name || `Chapter ${i + 1}`,
                        prompt: '',
                        status: 'pending' as const,
                    },
                    brollPool: brollCategories,
                    segments: assignedSegments,
                })
            }

            setDocumentaryChapters(documentaryChapters)
            setIsGeneratingBrollPool(false)
            setIsGeneratingTitleCards(false)

            const totalBroll = documentaryChapters.reduce((sum, ch) => sum + ch.brollPool.length, 0)
            toast.success(`Documentary pipeline complete: ${documentaryChapters.length} chapters, ${totalBroll} B-roll categories`)
        } catch (err) {
            logger.storyboard.error('Documentary pipeline error', { error: err instanceof Error ? err.message : String(err) })
            toast.error(err instanceof Error ? err.message : 'Documentary pipeline failed')
            setIsClassifyingSegments(false)
            setIsGeneratingBrollPool(false)
            setIsGeneratingTitleCards(false)
        }
    }, [
        isDocumentaryMode, breakdownResult, storyText, selectedModel,
        currentStyleGuide, characters,
        setDocumentaryChapters, setIsClassifyingSegments,
        setIsGeneratingBrollPool, setIsGeneratingTitleCards,
    ])

    return { runPipeline }
}
