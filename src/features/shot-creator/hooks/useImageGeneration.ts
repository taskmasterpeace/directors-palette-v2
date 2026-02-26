'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { imageGenerationService } from '../services/image-generation.service'
import { useShotCreatorStore } from '../store/shot-creator.store'
import { useUnifiedGalleryStore } from '../store/unified-gallery-store'
import { useWildCardStore } from '../store/wildcard.store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { getClient, TypedSupabaseClient } from '@/lib/db/client'
import { parseDynamicPrompt } from '../helpers/prompt-syntax-feedback'
import { parseReferenceTags } from '../helpers/parse-reference-tags'
import { getRandomFromCategory } from '../services/reference-selection.service'
import { uploadImageToStorage } from '../helpers/image-resize.helper'
import { ImageGenerationRequest, ImageModel, ImageModelSettings } from "../types/image-generation.types"
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCustomStylesStore } from '../store/custom-styles.store'
import { getModelConfig } from '@/config'
import { logger } from '@/lib/logger'

export interface GenerationProgress {
    status: 'idle' | 'starting' | 'processing' | 'waiting' | 'succeeded' | 'failed'
    predictionId?: string
    galleryId?: string
    error?: string
}

/**
 * Wait for an image to be completed in the gallery (for pipe chaining)
 * @param supabase Supabase client
 * @param galleryId Gallery ID to wait for
 * @param maxWaitTime Maximum time to wait in milliseconds (default: 2 minutes)
 * @returns The public URL of the completed image, or throws error with details
 */
async function waitForImageCompletion(
    supabase: TypedSupabaseClient,
    galleryId: string,
    maxWaitTime: number = 120000 // 2 minutes
): Promise<string> {
    return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null
        let subscription: RealtimeChannel | null = null
        let pollInterval: NodeJS.Timeout | null = null

        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId)
            if (pollInterval) clearInterval(pollInterval)
            if (subscription) subscription.unsubscribe()
        }

        // Set timeout
        timeoutId = setTimeout(async () => {
            cleanup()

            // Check final status before timing out
            const { data: finalCheck } = await supabase
                .from('gallery')
                .select('status, public_url, error_message, metadata')
                .eq('id', galleryId)
                .single()

            const status = finalCheck?.status || 'unknown'
            const errorMsg = finalCheck?.error_message || (finalCheck?.metadata as { error?: string })?.error

            reject(new Error(
                `Timeout after ${maxWaitTime / 1000}s. Status: ${status}. ` +
                (errorMsg ? `Error: ${errorMsg}` : 'No public URL received from webhook.')
            ))
        }, maxWaitTime)

        // Poll every 2 seconds as backup to realtime subscription
        const checkStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('gallery')
                    .select('public_url, status, error_message, metadata')
                    .eq('id', galleryId)
                    .single()

                if (error) {
                    // Check if it's a network error (contains "Failed to fetch" or similar)
                    const isNetworkError = error.message?.toLowerCase().includes('failed to fetch') ||
                        error.message?.toLowerCase().includes('network') ||
                        error.code === ''

                    if (isNetworkError) {
                        // Log but don't fail - realtime subscription will continue
                        logger.shotCreator.warn('Network error in polling (will retry)', { message: error.message })
                        return
                    }

                    logger.shotCreator.error('Error checking gallery status', { error: error })
                    return
                }

                // Check for successful completion - must be Supabase URL (not temporary Replicate URL)
                if (data.public_url) {
                    // Only resolve if it's a permanent Supabase URL, not a temporary Replicate URL
                    const isSupabaseUrl = data.public_url.includes('supabase.co')
                    if (isSupabaseUrl) {
                        cleanup()
                        resolve(data.public_url)
                        return
                    } else {
                        // Replicate URL found - keep waiting for Supabase upload to complete
                        logger.shotCreator.info('[Pipe Chain] Found temporary Replicate URL, waiting for Supabase upload...')
                    }
                }

                // Check for failure
                if (data.status === 'failed') {
                    cleanup()
                    const errorMsg = data.error_message || (data.metadata as { error?: string })?.error || 'Generation failed'
                    reject(new Error(`Generation failed: ${errorMsg}`))
                    return
                }

                // Check for cancellation
                if (data.status === 'canceled') {
                    cleanup()
                    reject(new Error('Generation was canceled'))
                    return
                }
            } catch (err) {
                logger.shotCreator.error('Error in polling', { error: err instanceof Error ? err.message : String(err) })
            }
        }

        // Start polling immediately and every 2 seconds
        checkStatus()
        pollInterval = setInterval(checkStatus, 2000)

        // Subscribe to gallery updates for real-time notifications
        subscription = supabase
            .channel(`wait-gallery-${galleryId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'gallery',
                    filter: `id=eq.${galleryId}`
                },
                (payload) => {
                    const updatedRecord = payload.new as {
                        public_url?: string
                        status?: string
                        error_message?: string
                        metadata?: { error?: string }
                    }

                    // Check if image is ready - must be Supabase URL (not temporary Replicate URL)
                    if (updatedRecord.public_url) {
                        const isSupabaseUrl = updatedRecord.public_url.includes('supabase.co')
                        if (isSupabaseUrl) {
                            cleanup()
                            resolve(updatedRecord.public_url)
                        }
                        // If Replicate URL, keep waiting for Supabase upload
                    } else if (updatedRecord.status === 'failed') {
                        cleanup()
                        const errorMsg = updatedRecord.error_message || updatedRecord.metadata?.error || 'Generation failed'
                        reject(new Error(`Generation failed: ${errorMsg}`))
                    } else if (updatedRecord.status === 'canceled') {
                        cleanup()
                        reject(new Error('Generation was canceled'))
                    }
                }
            )
            .subscribe()
    })
}

/**
 * Converts reference images to HTTPS URLs for Replicate API
 * Handles data URLs, blob URLs, and File objects
 */
async function prepareReferenceImagesForAPI(referenceImages: string[]): Promise<string[]> {
    const uploadedUrls: string[] = []

    for (const imageUrl of referenceImages) {
        // If already HTTPS URL, use as-is
        if (imageUrl.startsWith('https://')) {
            uploadedUrls.push(imageUrl)
            continue
        }

        // If data URL or blob URL, need to upload
        if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
            try {
                // Convert to Blob
                const response = await fetch(imageUrl)
                const blob = await response.blob()

                // Convert Blob to File
                const file = new File([blob], `reference-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' })

                // Upload to Replicate
                const httpsUrl = await uploadImageToStorage(file)
                uploadedUrls.push(httpsUrl)
            } catch (error) {
                logger.shotCreator.error('Failed to upload reference image', { error: error instanceof Error ? error.message : String(error) })
                throw new Error(`Failed to upload reference image: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        } else {
            // Unknown format, skip it
            logger.shotCreator.warn('Unknown image URL format', { imageUrl: imageUrl })
        }
    }

    return uploadedUrls
}

export function useImageGeneration() {
    const { toast } = useToast()
    const [_progress, setProgress] = useState<GenerationProgress>({ status: 'idle' })
    const { setShotCreatorProcessing, settings } = useShotCreatorStore()
    const { wildcards, loadWildCards } = useWildCardStore()
    const { fetchBalance } = useCreditsStore()
    const [activeGalleryId, setActiveGalleryId] = useState<string | null>(null)
    // Track when pipe chain is in progress (blocks concurrent generations)
    const [isPipeChaining, setIsPipeChaining] = useState(false)
    // Track current prediction ID for cancel functionality
    const [currentPredictionId, setCurrentPredictionId] = useState<string | null>(null)

    // Load wildcards on mount
    useEffect(() => {
        void loadWildCards()
    }, [loadWildCards])

    // Subscribe to real-time updates AND poll for completion of the active gallery entry.
    // Polling is essential because the Supabase subscription is set up async (after getClient + channel setup),
    // so fast webhook completions can fire before the subscription is listening.
    useEffect(() => {
        if (!activeGalleryId) return

        let subscription: { unsubscribe: () => void } | null = null
        let timeoutId: NodeJS.Timeout | null = null
        let pollIntervalId: NodeJS.Timeout | null = null
        let resolved = false // Prevent double-handling from subscription + poll racing

        const handleCompletion = () => {
            if (resolved) return
            resolved = true

            if (timeoutId) clearTimeout(timeoutId)
            if (pollIntervalId) clearInterval(pollIntervalId)

            setProgress({ status: 'succeeded' })
            setShotCreatorProcessing(false)
            setActiveGalleryId(null)

            // Remove pending placeholder then refresh to load the completed image from DB
            useUnifiedGalleryStore.getState().removePendingByGalleryId(activeGalleryId)
            useUnifiedGalleryStore.getState().refreshGallery()

            toast({
                title: 'Image Ready!',
                description: 'Your image has been saved to the gallery.',
            })
        }

        const handleError = (errorMsg: string) => {
            if (resolved) return
            resolved = true

            if (timeoutId) clearTimeout(timeoutId)
            if (pollIntervalId) clearInterval(pollIntervalId)

            setProgress({ status: 'failed', error: errorMsg })
            setShotCreatorProcessing(false)

            useUnifiedGalleryStore.getState().updatePendingImage(activeGalleryId, {
                status: 'failed',
                metadata: {
                    createdAt: new Date().toISOString(),
                    creditsUsed: 1,
                    error: errorMsg
                }
            })
            setActiveGalleryId(null)

            toast({
                title: 'Generation Failed',
                description: errorMsg,
                variant: 'destructive',
            })
        }

        const setupSubscriptionAndPolling = async () => {
            const supabase = await getClient()
            if (!supabase || resolved) return

            // Set up real-time subscription
            subscription = supabase
                .channel(`gallery-item-${activeGalleryId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'gallery',
                        filter: `id=eq.${activeGalleryId}`
                    },
                    (payload) => {
                        const updatedRecord = payload.new
                        if (updatedRecord.public_url) {
                            handleCompletion()
                        } else if (updatedRecord.metadata?.error) {
                            handleError(updatedRecord.metadata.error)
                        }
                    }
                )
                .subscribe()

            // Poll DB every 3 seconds as fallback (catches events the subscription missed)
            const pollCheck = async () => {
                if (resolved) return
                try {
                    const { data } = await supabase
                        .from('gallery')
                        .select('public_url, status, error_message, metadata')
                        .eq('id', activeGalleryId)
                        .single()

                    if (!data || resolved) return

                    if (data.public_url) {
                        logger.shotCreator.info('Poll detected completed image', { galleryId: activeGalleryId })
                        handleCompletion()
                    } else if (data.status === 'failed') {
                        const errorMsg = data.error_message
                            || (data.metadata as { error?: string })?.error
                            || 'Generation failed'
                        logger.shotCreator.info('Poll detected failed image', { galleryId: activeGalleryId, errorMsg })
                        handleError(errorMsg)
                    }
                } catch {
                    // Silently ignore polling errors — subscription or next poll will catch it
                }
            }

            // Immediate check: image might already be done by the time we subscribed
            await pollCheck()

            // Then poll every 3 seconds
            if (!resolved) {
                pollIntervalId = setInterval(pollCheck, 3000)
            }

            // After initial fast polling (3s), slow down to 5s polling
            // No hard timeout — keep polling until Replicate returns a terminal status
            if (!resolved) {
                timeoutId = setTimeout(() => {
                    if (resolved || !pollIntervalId) return
                    // Switch from 3s to 5s polling after 60s
                    clearInterval(pollIntervalId)
                    pollIntervalId = setInterval(pollCheck, 5000)
                }, 60000)
            }
        }

        setupSubscriptionAndPolling()

        return () => {
            resolved = true
            if (subscription) subscription.unsubscribe()
            if (timeoutId) clearTimeout(timeoutId)
            if (pollIntervalId) clearInterval(pollIntervalId)
        }
    }, [activeGalleryId, setShotCreatorProcessing, toast])

    const generateImage = useCallback(async (
        model: ImageModel,
        prompt: string,
        referenceImages: string[] = [],
        modelSettings: ImageModelSettings,
        recipeInfo?: { recipeId: string; recipeName: string },
    ) => {
        try {
            // Get user ID from Supabase
            const supabase = await getClient()
            if (!supabase) {
                throw new Error('Supabase client not available')
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError) {
                logger.shotCreator.error('Authentication error', { authError: authError })
                throw new Error(`Authentication failed: ${authError.message}`)
            }
            if (!user) {
                throw new Error('User not authenticated. Please log in.')
            }

            // Parse @reference tags from the prompt and auto-attach tagged images
            const parsedRefs = parseReferenceTags(prompt)
            const autoReferencedImages: string[] = []
            // Map @tag → image URL for prompt rewriting (tag-to-index mapping)
            const tagToUrlMap = new Map<string, string>()

            // 1. Handle specific references (e.g., @hero, @villain)
            if (parsedRefs.specificReferences.length > 0) {
                const specificImages = useUnifiedGalleryStore.getState().getImagesByReferences(parsedRefs.specificReferences)
                const specificUrls = specificImages.map(img => img.url)
                autoReferencedImages.push(...specificUrls)

                // Build tag → URL mapping for prompt rewriting
                for (const img of specificImages) {
                    if (img.reference) {
                        tagToUrlMap.set(img.reference.toLowerCase(), img.url)
                    }
                }

                logger.shotCreator.info('🏷️ Found [length] specific reference(s)', { length: parsedRefs.specificReferences.length, specificReferences: parsedRefs.specificReferences })
                logger.shotCreator.info('Auto-attached images from specific tags', { count: specificImages.length })

                // Warn about missing specific references
                if (specificImages.length < parsedRefs.specificReferences.length) {
                    const missingTags = parsedRefs.specificReferences.filter(
                        tag => !specificImages.some(img => img.reference?.toLowerCase() === tag.toLowerCase())
                    )
                    logger.shotCreator.warn('⚠️ No images found for tag(s)', { missingTags })
                    toast({
                        title: 'Some references not found',
                        description: `Could not find images for: ${missingTags.join(', ')}`,
                        variant: 'destructive',
                    })
                }
            }

            // 2. Handle category references (e.g., @people, @places) - random selection
            if (parsedRefs.categoryReferences.length > 0) {
                logger.shotCreator.info('🎲 Found [length] category reference(s)', { length: parsedRefs.categoryReferences.length, categoryReferences: parsedRefs.categoryReferences })

                for (const category of parsedRefs.categoryReferences) {
                    const randomImage = await getRandomFromCategory(category)

                    if (randomImage) {
                        autoReferencedImages.push(randomImage.url)
                        // Map category tag to its resolved URL
                        tagToUrlMap.set(`@${category}`, randomImage.url)
                        logger.shotCreator.info('✅ Random selection from [category]', { category, detail: randomImage.reference || randomImage.id })
                    } else {
                        logger.shotCreator.warn('No images found in category', { category })
                        toast({
                            title: `No ${category} found`,
                            description: `Add images to the "${category}" category in your reference library first.`,
                            variant: 'destructive',
                        })
                    }
                }
            }

            // Merge auto-referenced images with manually provided reference images
            const allReferenceImages = [
                ...referenceImages,
                ...autoReferencedImages
            ]

            // Remove duplicates
            let uniqueReferenceImages = [...new Set(allReferenceImages)]

            // Log summary
            if (parsedRefs.allReferences.length > 0) {
                logger.shotCreator.info('References processed', { totalRefs: parsedRefs.allReferences.length, totalImages: uniqueReferenceImages.length })
            }

            // ✅ STYLE INJECTION: Check for selected style (preset or custom)
            let promptWithStyle = prompt
            const selectedStyleId = settings.selectedStyle
            if (selectedStyleId) {
                // Use custom styles store to find both preset and custom styles
                const selectedStyle = useCustomStylesStore.getState().getStyleById(selectedStyleId)
                if (selectedStyle) {
                    // Inject style prompt at the end of user's prompt
                    promptWithStyle = `${prompt}, ${selectedStyle.stylePrompt}`

                    // Auto-attach style reference image
                    const styleImageUrl = selectedStyle.imagePath
                    // Handle data URLs (custom styles), full URLs, and local paths (presets)
                    if (typeof window !== 'undefined') {
                        const fullStyleUrl = styleImageUrl.startsWith('data:') || styleImageUrl.startsWith('http')
                            ? styleImageUrl
                            : `${window.location.origin}${styleImageUrl}`
                        uniqueReferenceImages = [fullStyleUrl, ...uniqueReferenceImages]
                    }

                    logger.shotCreator.info('Style applied', { style: selectedStyle.name, prompt: selectedStyle.stylePrompt, reference: styleImageUrl.startsWith('data:') ? '[data URL]' : styleImageUrl })
                }
            }

            // Also map reference slot tags (manual uploads with tags like "hero")
            // This handles images uploaded to slots and tagged, not just library references
            const slotImages = useShotCreatorStore.getState().shotCreatorReferenceImages
            for (const slot of slotImages) {
                const slotUrl = slot.url || slot.preview
                if (!slotUrl || slot.tags.length === 0) continue
                for (const tag of slot.tags) {
                    const normalizedTag = `@${tag.toLowerCase().replace(/^@/, '')}`
                    // Only add if not already mapped by library lookup (library takes priority)
                    if (!tagToUrlMap.has(normalizedTag)) {
                        tagToUrlMap.set(normalizedTag, slotUrl)
                    }
                }
            }

            // Expand bracket variations using existing prompt parser
            // OR bypass parsing if Raw Prompt Mode is enabled
            let variations: string[]
            let totalVariations: number
            let isPipeChaining: boolean

            if (settings.rawPromptMode) {
                // Raw mode: send prompt as-is without any processing
                logger.shotCreator.info('🔤 Raw Prompt Mode: Bypassing syntax parsing')
                variations = [promptWithStyle]
                totalVariations = 1
                isPipeChaining = false
            } else {
                // Normal mode: parse brackets, pipes, and wildcards (respecting granular disable settings)
                // Detect recipe mode: read FRESH from store to avoid stale closure value
                // (stageReferenceImages is set just before generateImage is called, but the closure has the old value)
                const freshStageRefs = useShotCreatorStore.getState().stageReferenceImages
                const isRecipeMode = freshStageRefs && freshStageRefs.length > 0
                if (isRecipeMode) {
                    logger.shotCreator.info('🍳 Recipe mode detected - forcing pipe syntax enabled')
                    logger.shotCreator.info('Stage refs found', { stages: freshStageRefs.length })
                }
                logger.shotCreator.info('Parsing prompt with wildcards', { wildcardCount: wildcards.length })
                const promptResult = parseDynamicPrompt(promptWithStyle, {
                    disablePipeSyntax: isRecipeMode ? false : settings.disablePipeSyntax,
                    disableBracketSyntax: settings.disableBracketSyntax,
                    disableWildcardSyntax: settings.disableWildcardSyntax
                }, wildcards)

                // Check validity and abort gracefully with user feedback (e.g., missing wildcards)
                if (!promptResult.isValid) {
                    setShotCreatorProcessing(false)
                    const errorMessage = promptResult.warnings?.join('. ') || 'Invalid prompt syntax'
                    toast({
                        title: 'Cannot Generate',
                        description: errorMessage,
                        variant: 'destructive',
                    })
                    return {
                        success: false,
                        error: errorMessage,
                    }
                }

                variations = promptResult.expandedPrompts
                totalVariations = promptResult.totalCount
                isPipeChaining = promptResult.hasPipes

                // Log wildcard usage
                if (promptResult.hasWildCards) {
                    logger.shotCreator.info('Wildcard expansion', { names: promptResult.wildCardNames, totalVariations })
                    if (promptResult.warnings && promptResult.warnings.length > 0) {
                        promptResult.warnings.forEach(warning => logger.shotCreator.warn(warning))
                    }
                }
            }

            // ✅ REFERENCE TAG REWRITING: Append indexed reference tokens to @tags
            // Done AFTER bracket/pipe expansion so tokens don't conflict with prompt syntax
            // e.g., "@hero fighting @villain" → "@hero (REF:IMG_3) fighting @villain (REF:IMG_4)"
            // Keeps @name for character sheet continuity, adds token so AI maps name → image
            if (tagToUrlMap.size > 0) {
                variations = variations.map(v => {
                    let rewritten = v
                    for (const [tag, url] of tagToUrlMap) {
                        const imageIndex = uniqueReferenceImages.indexOf(url)
                        if (imageIndex === -1) continue
                        const replacement = `${tag} (REF:IMG_${imageIndex + 1})`
                        // Match the @tag and append the token (case-insensitive)
                        const tagRegex = new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
                        rewritten = rewritten.replace(tagRegex, replacement)
                    }
                    return rewritten
                })
                logger.shotCreator.info('🔗 Prompt rewritten with reference tokens')
                logger.shotCreator.info('Prompt rewritten sample', { sample: variations[0]?.slice(0, 120) })
            }

            // Strip reference images for text-only models (e.g., Z-Image Turbo)
            // Style injection may have added refs that the model can't accept
            const modelConfig = getModelConfig(model)
            if (modelConfig && modelConfig.maxReferenceImages === 0 && uniqueReferenceImages.length > 0) {
                logger.shotCreator.info('Text-only model, stripping reference images', { model: modelConfig.displayName, strippedCount: uniqueReferenceImages.length })
                uniqueReferenceImages = []
            }

            // Upload reference images to Replicate first (convert data URLs / blob URLs to HTTPS URLs)
            let uploadedReferenceImages: string[] = []
            if (uniqueReferenceImages.length > 0) {
                toast({
                    title: 'Preparing Reference Images',
                    description: `Uploading ${uniqueReferenceImages.length} reference image${uniqueReferenceImages.length > 1 ? 's' : ''}...`,
                })
                try {
                    uploadedReferenceImages = await prepareReferenceImagesForAPI(uniqueReferenceImages)
                } catch (uploadError) {
                    setShotCreatorProcessing(false)
                    setProgress({ status: 'failed', error: uploadError instanceof Error ? uploadError.message : 'Failed to upload reference images' })
                    toast({
                        title: 'Upload Failed',
                        description: uploadError instanceof Error ? uploadError.message : 'Failed to upload reference images',
                        variant: 'destructive',
                    })
                    return
                }
            }

            // Set processing state
            setShotCreatorProcessing(true)
            setProgress({ status: 'starting' })

            // Block concurrent generations ONLY during pipe chaining
            if (isPipeChaining) {
                setIsPipeChaining(true)
            }

            toast({
                title: 'Starting Generation',
                description: isPipeChaining
                    ? `Chaining ${totalVariations} sequential steps...`
                    : totalVariations > 1
                        ? `Generating ${totalVariations} variations...`
                        : 'Your image is being created...',
            })

            const results = []
            let previousImageUrl: string | undefined = undefined

            // Generate all variations
            for (let i = 0; i < variations.length; i++) {
                const variationPrompt = variations[i]
                const isFirstStep = i === 0
                const isLastStep = i === variations.length - 1

                // Get stage-specific reference images (for recipe pipe chaining)
                // CRITICAL: Read FRESH from store - closure value is stale when setStageReferenceImages is called just before generateImage
                const freshStageRefs = useShotCreatorStore.getState().stageReferenceImages
                const stageRefs = freshStageRefs?.[i] || []

                // CRITICAL: Convert stage refs to HTTPS URLs that Replicate can access
                // Stage refs could be data URLs, local paths, or blob URLs - Replicate can't use these
                let preparedStageRefs: string[] = []
                if (stageRefs.length > 0) {
                    try {
                        preparedStageRefs = await prepareReferenceImagesForAPI(stageRefs)
                        logger.shotCreator.info('Pipe chain stage refs prepared', { stage: i, uploadedCount: preparedStageRefs.length })
                    } catch (uploadError) {
                        logger.shotCreator.error('[Pipe Chain] Failed to prepare stage [i] refs', { i, uploadError })
                        // Continue without stage refs rather than failing entirely
                    }
                }

                // Determine input images for this step
                // For pipe chaining: combine previous output + this stage's specific references
                // For non-pipe: use uploaded references
                let inputImages: string[] | undefined
                if (isPipeChaining) {
                    if (isFirstStep) {
                        // First step: use stage 0's refs, or fall back to uploaded refs
                        inputImages = preparedStageRefs.length > 0
                            ? preparedStageRefs
                            : (uploadedReferenceImages.length > 0 ? uploadedReferenceImages : undefined)
                    } else {
                        // Subsequent steps: combine previous output + this stage's refs
                        const refs: string[] = []
                        if (previousImageUrl) refs.push(previousImageUrl)
                        refs.push(...preparedStageRefs)
                        inputImages = refs.length > 0 ? refs : undefined
                    }
                } else {
                    inputImages = uploadedReferenceImages.length > 0 ? uploadedReferenceImages : undefined
                }

                // Debug logging for pipe chaining
                if (isPipeChaining) {
                    logger.shotCreator.info("Pipe chain step", { step: i + 1, total: variations.length, isFirstStep, rawStageRefs: stageRefs.length, preparedStageRefs: preparedStageRefs.length, inputImages: inputImages?.length || 0 })
                }

                // Use current model settings (pipe chaining doesn't use img2img for Nano Banana models)
                const currentModelSettings: ImageModelSettings = { ...modelSettings }
                const request: ImageGenerationRequest = {
                    model,
                    prompt: variationPrompt,
                    referenceImages: inputImages,
                    modelSettings: currentModelSettings,
                    // Recipe tracking
                    recipeId: recipeInfo?.recipeId,
                    recipeName: recipeInfo?.recipeName,
                    // user_id removed - now extracted server-side from session cookie
                }
                toast({
                    title: isPipeChaining ? `Step ${i + 1}/${totalVariations}` : 'Generating',
                    description: variationPrompt.slice(0, 60) + (variationPrompt.length > 60 ? '...' : ''),
                })
                const response = await imageGenerationService.generateImage(request)

                // Track current prediction for cancel functionality
                if (response.predictionId) {
                    setCurrentPredictionId(response.predictionId)
                }

                // Add pending placeholder to gallery immediately after API responds with galleryId
                if (response.galleryId) {
                    useUnifiedGalleryStore.getState().addPendingPlaceholder(
                        response.galleryId,
                        variationPrompt,
                        model,
                        modelSettings.aspectRatio || '16:9'
                    )
                }

                // If the API returned multiple images (Seedream sequential_image_generation),
                // refresh gallery so additional DB rows appear immediately
                if (response.imageCount && response.imageCount > 1) {
                    logger.shotCreator.info('Multi-image response, refreshing gallery', { imageCount: response.imageCount })
                    useUnifiedGalleryStore.getState().refreshGallery()
                }

                results.push(response)
                // For pipe chaining, wait for the image to complete before proceeding to next step for pipe previous result
                if (isPipeChaining) {
                    toast({
                        title: `Waiting for Step ${i + 1}/${totalVariations}`,
                        description: 'Processing image...',
                    })
                    // Wait for the image URL from webhook/Supabase
                    try {
                        const imageUrl = await waitForImageCompletion(supabase, response.galleryId)
                        previousImageUrl = imageUrl
                        logger.shotCreator.info('[Pipe Chain] Step [detail] completed. Setting previousImageUrl to', { detail: i + 1, imageUrl })
                        toast({
                            title: `Step ${i + 1}/${totalVariations} Complete`,
                            description: isLastStep ? 'All images saved to gallery!' : 'Moving to next step...',
                        })
                    } catch (waitError) {
                        const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error'
                        logger.shotCreator.error('Step [detail] failed', { detail: i + 1, errorMsg })
                        throw new Error(`Step ${i + 1} failed: ${errorMsg}`)
                    }
                }
                if (isLastStep) {
                    setActiveGalleryId(response.galleryId)
                }
            }

            // For pipe chaining: all steps are done, mark as succeeded and stop spinner
            // For regular generation: keep spinner going until real-time subscription confirms image is ready
            if (isPipeChaining) {
                setProgress({
                    status: 'succeeded',
                    predictionId: results[results.length - 1].predictionId,
                    galleryId: results[results.length - 1].galleryId,
                })
                setShotCreatorProcessing(false)
                toast({
                    title: 'Chain Complete!',
                    description: `All ${totalVariations} images saved to gallery!`,
                })
            } else {
                setProgress({
                    status: 'waiting',
                    predictionId: results[results.length - 1].predictionId,
                    galleryId: results[results.length - 1].galleryId,
                })
                // Don't clear processing here — the real-time subscription will clear it
                // when the webhook confirms the image is ready (line ~261)
                toast({
                    title: 'Generation Started!',
                    description: totalVariations > 1
                        ? `${totalVariations} images will appear in the gallery when ready.`
                        : 'Your image will appear in the gallery when ready.',
                })
            }
            setIsPipeChaining(false) // Always reset pipe chaining state

            // Refresh credits balance to show deduction
            void fetchBalance(true)

            return {
                success: true,
                predictionId: results[results.length - 1].predictionId,
                galleryId: results[results.length - 1].galleryId,
                totalVariations,
            }
        } catch (error) {
            logger.shotCreator.error('Image generation failed', { error: error instanceof Error ? error.message : String(error) })

            // Check if this is an insufficient credits error
            const isCreditsError = error && typeof error === 'object' && 'isInsufficientCredits' in error
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate image'

            setProgress({ status: 'failed', error: errorMessage })
            setShotCreatorProcessing(false)
            setIsPipeChaining(false) // Reset pipe state on error
            setActiveGalleryId(null)

            if (isCreditsError) {
                // Open the purchase dialog automatically
                useCreditsStore.getState().openPurchaseDialog()

                toast({
                    title: 'Not Enough Points',
                    description: 'Get more points to continue creating.',
                    variant: 'destructive',
                })
            } else {
                toast({
                    title: 'Generation Failed',
                    description: errorMessage,
                    variant: 'destructive',
                })
            }

            return {
                success: false,
                error: errorMessage,
                isCreditsError,
            }
        }
    }, [toast, setShotCreatorProcessing, settings, wildcards, fetchBalance])

    const resetProgress = useCallback(() => {
        setProgress({ status: 'idle' })
        setActiveGalleryId(null)
        setCurrentPredictionId(null)
    }, [])

    // Cancel the current generation
    const cancelGeneration = useCallback(async () => {
        if (!currentPredictionId) {
            toast({
                title: 'No Active Generation',
                description: 'There is no generation to cancel.',
                variant: 'destructive',
            })
            return { success: false, error: 'No active prediction' }
        }

        try {
            const response = await fetch(`/api/generation/cancel/${currentPredictionId}`, {
                method: 'POST',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to cancel')
            }

            // Reset state
            setShotCreatorProcessing(false)
            setIsPipeChaining(false)
            setCurrentPredictionId(null)
            setProgress({ status: 'idle' })

            toast({
                title: 'Generation Canceled',
                description: 'Your image generation has been stopped.',
            })

            return { success: true }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to cancel'
            toast({
                title: 'Cancel Failed',
                description: errorMessage,
                variant: 'destructive',
            })
            return { success: false, error: errorMessage }
        }
    }, [currentPredictionId, toast, setShotCreatorProcessing])

    return {
        generateImage,
        resetProgress,
        cancelGeneration,
        currentPredictionId,
        // Only block during pipe chaining - regular generations can run concurrently
        isGenerating: isPipeChaining,
    }
}
