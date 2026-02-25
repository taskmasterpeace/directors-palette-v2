/**
 * Segment Classification Service
 * Classifies story segments as action/narration/transition for documentary mode.
 * Processes segments in batches to respect LLM context limits.
 */

import type { ShotBreakdownSegment, ClassifiedSegment, SegmentClassification } from '../types/storyboard.types'
import { createOpenRouterService } from './openrouter.service'

const CLASSIFICATION_BATCH_SIZE = 20

export interface ClassificationConfig {
    apiKey: string
    model: string
    segments: ShotBreakdownSegment[]
    storyText: string
}

export interface ClassificationResult {
    success: boolean
    segments: ClassifiedSegment[]
    error?: string
}

/**
 * Classify story segments as action, narration, or transition.
 * Processes in batches of 20 segments, then merges results back.
 */
export async function classifySegments(config: ClassificationConfig): Promise<ClassificationResult> {
    const { apiKey, model, segments, storyText } = config

    try {
        const service = createOpenRouterService(apiKey, model)

        // Build a classification map from all batches
        const classificationMap = new Map<number, SegmentClassification>()

        // Process segments in batches
        for (let i = 0; i < segments.length; i += CLASSIFICATION_BATCH_SIZE) {
            const batch = segments.slice(i, i + CLASSIFICATION_BATCH_SIZE)
            const batchInput = batch.map(s => ({ sequence: s.sequence, text: s.text }))

            const classifications = await service.classifySegments(batchInput, storyText)

            for (const c of classifications) {
                classificationMap.set(c.sequence, c.classification)
            }
        }

        // Merge classifications into segments, defaulting to 'action' if missing
        const classifiedSegments: ClassifiedSegment[] = segments.map(segment => ({
            ...segment,
            classification: classificationMap.get(segment.sequence) ?? 'action'
        }))

        return {
            success: true,
            segments: classifiedSegments
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown classification error'
        return {
            success: false,
            segments: segments.map(segment => ({
                ...segment,
                classification: 'action' as SegmentClassification
            })),
            error: message
        }
    }
}
