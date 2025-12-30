'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { imageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import { useStoryCreatorStore } from '../store/story-creator.store'
import { useUnifiedGalleryStore } from '@/features/shot-creator/store/unified-gallery-store'
import { getClient } from '@/lib/db/client'
import { parseDynamicPrompt } from '@/features/shot-creator/helpers/prompt-syntax-feedback'
import { parseReferenceTags } from '@/features/shot-creator/helpers/parse-reference-tags'
import { getRandomFromCategory } from '@/features/shot-creator/services/reference-selection.service'
import { getVariationCount } from '../helpers/bracket-prompt.helper'
import { uploadImageToStorage } from '@/features/shot-creator/helpers/image-resize.helper'
import { StoryProjectService } from '../services/story-project.service'
import { QueueRecoveryService } from '../services/queue-recovery.service'
import type { ImageGenerationRequest, ImageModel, ImageModelSettings } from '@/features/shot-creator/types/image-generation.types'
import type { StoryShot } from '../types/story.types'

export interface StoryGenerationProgress {
    status: 'idle' | 'processing' | 'paused' | 'completed' | 'failed'
    currentShotIndex: number
    totalShots: number
    currentVariation: number
    totalVariations: number
    imagesGenerated: number
    totalImages: number
    error?: string
}

/**
 * Converts reference images to HTTPS URLs for Replicate API
 * Reused from Shot Creator pattern
 */
async function prepareReferenceImagesForAPI(referenceImages: string[]): Promise<string[]> {
    const uploadedUrls: string[] = []

    for (const imageUrl of referenceImages) {
        if (imageUrl.startsWith('https://')) {
            uploadedUrls.push(imageUrl)
            continue
        }

        if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
            try {
                const response = await fetch(imageUrl)
                const blob = await response.blob()
                const file = new File([blob], `reference-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })
                const httpsUrl = await uploadImageToStorage(file)
                uploadedUrls.push(httpsUrl)
            } catch (error) {
                console.error('Failed to upload reference image:', error)
                throw new Error(`Failed to upload reference image: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        } else {
            console.warn('Unknown image URL format:', imageUrl)
        }
    }

    return uploadedUrls
}

export function useStoryGeneration() {
    const { toast } = useToast()
    const [progress, setProgress] = useState<StoryGenerationProgress>({
        status: 'idle',
        currentShotIndex: 0,
        totalShots: 0,
        currentVariation: 0,
        totalVariations: 0,
        imagesGenerated: 0,
        totalImages: 0
    })

    const { currentQueue, setCurrentQueue, updateShot } = useStoryCreatorStore()

    const generateShot = useCallback(async (
        shot: StoryShot,
        model: ImageModel,
        modelSettings: ImageModelSettings
    ) => {
        try {
            const supabase = await getClient()
            if (!supabase) {
                throw new Error('Supabase client not available')
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                throw new Error('User not authenticated. Please log in.')
            }

            // Parse @reference tags from the prompt
            const parsedRefs = parseReferenceTags(shot.prompt)
            const autoReferencedImages: string[] = []

            // Handle specific references (@hero, @villain, etc.)
            if (parsedRefs.specificReferences.length > 0) {
                const specificImages = useUnifiedGalleryStore.getState().getImagesByReferences(parsedRefs.specificReferences)
                const specificUrls = specificImages.map(img => img.url)
                autoReferencedImages.push(...specificUrls)

                if (specificImages.length < parsedRefs.specificReferences.length) {
                    const missingTags = parsedRefs.specificReferences.filter(
                        tag => !specificImages.some(img => img.reference?.toLowerCase() === tag.toLowerCase())
                    )
                    console.warn('Missing reference tags:', missingTags)
                }
            }

            // Handle category references (@people, @places) - random selection
            if (parsedRefs.categoryReferences.length > 0) {
                for (const category of parsedRefs.categoryReferences) {
                    const randomImage = await getRandomFromCategory(category)
                    if (randomImage) {
                        autoReferencedImages.push(randomImage.url)
                    }
                }
            }

            // Upload reference images to HTTPS
            let uploadedReferenceImages: string[] = []
            if (autoReferencedImages.length > 0) {
                uploadedReferenceImages = await prepareReferenceImagesForAPI(autoReferencedImages)
            }

            // Expand bracket variations using existing prompt parser
            const promptResult = parseDynamicPrompt(shot.prompt)
            const variations = promptResult.expandedPrompts
            const totalVariations = promptResult.totalCount

            if (totalVariations > 1) {
                toast({
                    title: `Shot ${shot.sequence_number}`,
                    description: `Generating ${totalVariations} variations...`,
                })
            }

            const generatedGalleryIds: string[] = []

            // Generate all variations
            for (let i = 0; i < variations.length; i++) {
                const variationPrompt = variations[i]

                setProgress(prev => ({
                    ...prev,
                    currentVariation: i + 1,
                    totalVariations
                }))

                const request: ImageGenerationRequest = {
                    model,
                    prompt: variationPrompt,
                    referenceImages: uploadedReferenceImages.length > 0 ? uploadedReferenceImages : undefined,
                    modelSettings,
                }

                if (totalVariations > 1) {
                    toast({
                        title: `Variation ${i + 1}/${totalVariations}`,
                        description: variationPrompt.slice(0, 60) + (variationPrompt.length > 60 ? '...' : ''),
                    })
                }

                const response = await imageGenerationService.generateImage(request)
                generatedGalleryIds.push(response.galleryId)
            }

            // Update shot with first gallery ID (others are in gallery too)
            await StoryProjectService.updateShot(shot.id, {
                status: 'completed',
                gallery_id: generatedGalleryIds[0],
                metadata: {
                    ...shot.metadata,
                    generated_at: new Date().toISOString(),
                    gallery_ids: generatedGalleryIds,
                    variation_count: totalVariations
                }
            })

            updateShot(shot.id, {
                status: 'completed',
                gallery_id: generatedGalleryIds[0]
            })

            return {
                success: true,
                galleryIds: generatedGalleryIds,
                totalVariations
            }
        } catch (error) {
            console.error('Shot generation failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'

            // Update shot status to failed
            await StoryProjectService.updateShot(shot.id, {
                status: 'failed',
                metadata: {
                    ...shot.metadata,
                    error: errorMessage
                }
            })

            updateShot(shot.id, {
                status: 'failed'
            })

            throw error
        }
    }, [toast, updateShot])

    const processQueue = useCallback(async (
        shots: StoryShot[],
        model: ImageModel = 'nano-banana',
        modelSettings: ImageModelSettings = {}
    ) => {
        if (!currentQueue || currentQueue.status !== 'pending') {
            console.warn('No active queue to process')
            return
        }

        // Calculate total images including all bracket variations
        const totalImages = shots.reduce((total, shot) => {
            return total + getVariationCount(shot.prompt)
        }, 0)

        setProgress({
            status: 'processing',
            currentShotIndex: 0,
            totalShots: shots.length,
            currentVariation: 0,
            totalVariations: 0,
            imagesGenerated: 0,
            totalImages
        })

        try {
            // Update queue status to processing
            await StoryProjectService.updateQueueProgress(currentQueue.id, {
                status: 'processing',
                progress: 0,
                current_shot_index: 0
            })

            setCurrentQueue({
                ...currentQueue,
                status: 'processing',
                progress: 0,
                current_shot_index: 0
            })

            // Save initial checkpoint
            QueueRecoveryService.saveCheckpoint({
                queueId: currentQueue.id,
                projectId: currentQueue.project_id,
                currentShotIndex: 0,
                totalShots: shots.length,
                shotIds: shots.map(s => s.id)
            })

            toast({
                title: 'Starting Generation',
                description: `Processing ${shots.length} shots (${totalImages} total images)...`,
            })

            let imagesGeneratedSoFar = 0

            // Process each shot
            for (let i = 0; i < shots.length; i++) {
                const shot = shots[i]

                // Refresh queue status from store to check for pauses
                const latestQueue = useStoryCreatorStore.getState().currentQueue
                if (latestQueue && latestQueue.status === 'paused') {
                    toast({
                        title: 'Generation Paused',
                        description: 'Resume when ready',
                    })
                    return
                }

                setProgress(prev => ({
                    ...prev,
                    currentShotIndex: i,
                    currentVariation: 0,
                    totalVariations: 0
                }))

                toast({
                    title: `Shot ${i + 1}/${shots.length}`,
                    description: shot.prompt.slice(0, 60) + (shot.prompt.length > 60 ? '...' : ''),
                })

                try {
                    const result = await generateShot(shot, model, modelSettings)

                    // Update images generated count
                    imagesGeneratedSoFar += result.totalVariations

                    // Update queue progress based on images generated, not shots
                    const progressPercent = (imagesGeneratedSoFar / totalImages) * 100
                    await StoryProjectService.updateQueueProgress(currentQueue.id, {
                        status: 'processing',
                        progress: progressPercent,
                        current_shot_index: i + 1
                    })

                    setCurrentQueue({
                        ...currentQueue,
                        status: 'processing',
                        progress: progressPercent,
                        current_shot_index: i + 1
                    })

                    // Update progress state
                    setProgress(prev => ({
                        ...prev,
                        imagesGenerated: imagesGeneratedSoFar
                    }))

                    // Update checkpoint
                    QueueRecoveryService.updateProgress(currentQueue.id, i + 1)

                    if (result.totalVariations > 1) {
                        toast({
                            title: 'Shot Complete',
                            description: `Generated ${result.totalVariations} variations (${imagesGeneratedSoFar}/${totalImages} total images)`,
                        })
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                    console.error(`Shot ${i + 1} failed:`, errorMessage)

                    toast({
                        title: `Shot ${i + 1} Failed`,
                        description: errorMessage,
                        variant: 'destructive',
                    })

                    // Continue with next shot instead of stopping entire queue
                    continue
                }
            }

            // Mark queue as completed
            await StoryProjectService.updateQueueProgress(currentQueue.id, {
                status: 'completed',
                progress: 100,
                current_shot_index: shots.length
            })

            setCurrentQueue({
                ...currentQueue,
                status: 'completed',
                progress: 100,
                current_shot_index: shots.length
            })

            setProgress({
                status: 'completed',
                currentShotIndex: shots.length,
                totalShots: shots.length,
                currentVariation: 0,
                totalVariations: 0,
                imagesGenerated: totalImages,
                totalImages
            })

            // Clear checkpoint on successful completion
            QueueRecoveryService.clearCheckpoint()

            toast({
                title: 'Generation Complete!',
                description: `Generated ${totalImages} images from ${shots.length} shots. Check the gallery!`,
            })
        } catch (error) {
            console.error('Queue processing failed:', error)
            const errorMessage = error instanceof Error ? error.message : 'Queue processing failed'

            setProgress(prev => ({
                ...prev,
                status: 'failed',
                error: errorMessage
            }))

            // Update queue status
            await StoryProjectService.updateQueueProgress(currentQueue.id, {
                status: 'failed',
                progress: progress.currentShotIndex > 0 ? ((progress.currentShotIndex / shots.length) * 100) : 0,
                current_shot_index: progress.currentShotIndex,
                error_message: errorMessage
            })

            setCurrentQueue({
                ...currentQueue,
                status: 'failed',
                progress: progress.currentShotIndex > 0 ? ((progress.currentShotIndex / shots.length) * 100) : 0,
                current_shot_index: progress.currentShotIndex,
                error_message: errorMessage
            })

            // Don't clear checkpoint on failure - allow resume
            toast({
                title: 'Generation Failed',
                description: errorMessage,
                variant: 'destructive',
            })
        }
    }, [currentQueue, generateShot, setCurrentQueue, toast])

    /**
     * Check for missing reference images before starting generation
     * Returns array of tags that are missing references
     */
    const checkMissingReferences = useCallback((shots: StoryShot[]) => {
        const galleryImages = useUnifiedGalleryStore.getState().images

        // Get all reference tags from gallery
        const assignedTags = new Set(
            galleryImages
                .filter(img => img.reference)
                .map(img => img.reference!.toLowerCase())
        )

        // Find all @tags used in shot prompts
        const tagsUsage = new Map<string, number[]>()

        shots.forEach((shot) => {
            const tagMatches = shot.prompt.match(/@[a-z0-9_]+/gi)
            if (tagMatches) {
                tagMatches.forEach((tag) => {
                    const normalizedTag = tag.toLowerCase()
                    if (!assignedTags.has(normalizedTag)) {
                        const shotNumbers = tagsUsage.get(normalizedTag) || []
                        shotNumbers.push(shot.sequence_number)
                        tagsUsage.set(normalizedTag, shotNumbers)
                    }
                })
            }
        })

        // Convert to array and sort by number of shots affected
        return Array.from(tagsUsage.entries())
            .map(([tag, shotNumbers]) => ({
                tag,
                shotNumbers: shotNumbers.sort((a, b) => a - b)
            }))
            .sort((a, b) => b.shotNumbers.length - a.shotNumbers.length)
    }, [])

    return {
        generateShot,
        processQueue,
        checkMissingReferences,
        progress,
        isGenerating: progress.status === 'processing',
        // Queue recovery helpers
        loadCheckpoint: QueueRecoveryService.loadCheckpoint,
        clearCheckpoint: QueueRecoveryService.clearCheckpoint,
        getRecoveryMessage: QueueRecoveryService.getRecoveryMessage
    }
}
