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
                        console.warn('Network error in polling (will retry):', error.message)
                        return
                    }

                    console.error('Error checking gallery status:', error)
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
                        console.log('[Pipe Chain] Found temporary Replicate URL, waiting for Supabase upload...')
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
                console.error('Error in polling:', err)
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
                console.error('Failed to upload reference image:', error)
                throw new Error(`Failed to upload reference image: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        } else {
            // Unknown format, skip it
            console.warn('Unknown image URL format:', imageUrl)
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

    // Subscribe to real-time updates for the active gallery entry
    useEffect(() => {
        if (!activeGalleryId) return

        let subscription: { unsubscribe: () => void } | null = null
        let timeoutId: NodeJS.Timeout | null = null

        const setupSubscription = async () => {
            const supabase = await getClient()
            if (!supabase) {
                console.warn('Supabase client not available for subscription')
                return
            }
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

                        // Check if the image has been processed by webhook
                        if (updatedRecord.public_url) {
                            if (timeoutId) clearTimeout(timeoutId)
                            setProgress({ status: 'succeeded' })
                            setShotCreatorProcessing(false)
                            setActiveGalleryId(null)

                            // Refresh gallery to update the pending placeholder with the completed image
                            useUnifiedGalleryStore.getState().refreshGallery()

                            toast({
                                title: 'Image Ready!',
                                description: 'Your image has been saved to the gallery.',
                            })
                        } else if (updatedRecord.metadata?.error) {
                            if (timeoutId) clearTimeout(timeoutId)
                            setProgress({
                                status: 'failed',
                                error: updatedRecord.metadata.error
                            })
                            setShotCreatorProcessing(false)

                            // Update the pending placeholder to show failed state
                            if (activeGalleryId) {
                                useUnifiedGalleryStore.getState().updatePendingImage(activeGalleryId, {
                                    status: 'failed',
                                    metadata: {
                                        createdAt: new Date().toISOString(),
                                        creditsUsed: 1,
                                        error: updatedRecord.metadata.error
                                    }
                                })
                            }
                            setActiveGalleryId(null)

                            toast({
                                title: 'Generation Failed',
                                description: updatedRecord.metadata.error,
                                variant: 'destructive',
                            })
                        }
                    }
                )
                .subscribe()

            // Set timeout fallback (1 minute)
            timeoutId = setTimeout(() => {
                setProgress({ status: 'succeeded' })
                setShotCreatorProcessing(false)
                setActiveGalleryId(null)

                toast({
                    title: 'Processing...',
                    description: 'Your image is still being generated. Check the gallery in a few moments.',
                })
            }, 60000) // 1 minute
        }

        setupSubscription()

        return () => {
            if (subscription) {
                subscription.unsubscribe()
            }
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [activeGalleryId, setShotCreatorProcessing, toast])

    const generateImage = useCallback(async (
        model: ImageModel,
        prompt: string,
        referenceImages: string[] = [],
        modelSettings: ImageModelSettings,
        recipeInfo?: { recipeId: string; recipeName: string },
        riverflowInputs?: {
            detailRefImages?: string[]
            fontUrls?: string[]
            fontTexts?: string[]
        }
    ) => {
        try {
            // Get user ID from Supabase
            const supabase = await getClient()
            if (!supabase) {
                throw new Error('Supabase client not available')
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError) {
                console.error('Authentication error:', authError)
                throw new Error(`Authentication failed: ${authError.message}`)
            }
            if (!user) {
                throw new Error('User not authenticated. Please log in.')
            }

            // Parse @reference tags from the prompt and auto-attach tagged images
            const parsedRefs = parseReferenceTags(prompt)
            const autoReferencedImages: string[] = []

            // 1. Handle specific references (e.g., @hero, @villain)
            if (parsedRefs.specificReferences.length > 0) {
                const specificImages = useUnifiedGalleryStore.getState().getImagesByReferences(parsedRefs.specificReferences)
                const specificUrls = specificImages.map(img => img.url)
                autoReferencedImages.push(...specificUrls)

                console.log(`🏷️ Found ${parsedRefs.specificReferences.length} specific reference(s):`, parsedRefs.specificReferences)
                console.log(`📸 Auto-attached ${specificImages.length} image(s) from specific tags`)

                // Warn about missing specific references
                if (specificImages.length < parsedRefs.specificReferences.length) {
                    const missingTags = parsedRefs.specificReferences.filter(
                        tag => !specificImages.some(img => img.reference?.toLowerCase() === tag.toLowerCase())
                    )
                    console.warn(`⚠️ No images found for tag(s):`, missingTags)
                    toast({
                        title: 'Some references not found',
                        description: `Could not find images for: ${missingTags.join(', ')}`,
                        variant: 'destructive',
                    })
                }
            }

            // 2. Handle category references (e.g., @people, @places) - random selection
            if (parsedRefs.categoryReferences.length > 0) {
                console.log(`🎲 Found ${parsedRefs.categoryReferences.length} category reference(s):`, parsedRefs.categoryReferences)

                for (const category of parsedRefs.categoryReferences) {
                    const randomImage = await getRandomFromCategory(category)

                    if (randomImage) {
                        autoReferencedImages.push(randomImage.url)
                        console.log(`✅ Random selection from ${category}:`, randomImage.reference || randomImage.id)
                    } else {
                        console.warn(`⚠️ No images found in category: ${category}`)
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
                console.log(`📊 Total references processed: ${parsedRefs.allReferences.length}`)
                console.log(`🖼️ Total images attached: ${uniqueReferenceImages.length}`)
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

                    const isCustom = 'isCustom' in selectedStyle && selectedStyle.isCustom
                    console.log(`🎨 Style applied: ${selectedStyle.name}${isCustom ? ' (custom)' : ''}`)
                    console.log(`📝 Style prompt injected: "${selectedStyle.stylePrompt}"`)
                    console.log(`🖼️ Style reference added: ${styleImageUrl.startsWith('data:') ? '[data URL]' : styleImageUrl}`)
                }
            }

            // Expand bracket variations using existing prompt parser
            // OR bypass parsing if Raw Prompt Mode is enabled
            let variations: string[]
            let totalVariations: number
            let isPipeChaining: boolean

            if (settings.rawPromptMode) {
                // Raw mode: send prompt as-is without any processing
                console.log('🔤 Raw Prompt Mode: Bypassing syntax parsing')
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
                    console.log('🍳 Recipe mode detected - forcing pipe syntax enabled')
                    console.log(`   Stage refs found: ${freshStageRefs.length} stages`)
                }
                console.log(`🎲 Parsing prompt with ${wildcards.length} available wildcards`)
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
                    console.log(`🎲 Wildcard expansion: ${promptResult.wildCardNames?.join(', ')} → ${totalVariations} variations`)
                    if (promptResult.warnings && promptResult.warnings.length > 0) {
                        promptResult.warnings.forEach(warning => console.warn(`⚠️ ${warning}`))
                    }
                }
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
                        console.log(`[Pipe Chain] Stage ${i} refs prepared: ${preparedStageRefs.length} images uploaded`)
                    } catch (uploadError) {
                        console.error(`[Pipe Chain] Failed to prepare stage ${i} refs:`, uploadError)
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
                    console.log(`[Pipe Chain] Step ${i + 1}/${variations.length}:`, {
                        isFirstStep,
                        previousImageUrl: previousImageUrl || '(none)',
                        rawStageRefs: stageRefs.length ? `${stageRefs.length} raw ref(s)` : '(none)',
                        preparedStageRefs: preparedStageRefs.length ? `${preparedStageRefs.length} prepared ref(s)` : '(none)',
                        inputImages: inputImages?.length ? `${inputImages.length} image(s)` : '(none)',
                        prompt: variationPrompt.slice(0, 50)
                    })
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
                    // Riverflow-specific inputs
                    detailRefImages: riverflowInputs?.detailRefImages,
                    fontUrls: riverflowInputs?.fontUrls,
                    fontTexts: riverflowInputs?.fontTexts,
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
                    console.log(`[Multi-Image] ${response.imageCount} images returned, refreshing gallery`)
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
                        console.log(`[Pipe Chain] Step ${i + 1} completed. Setting previousImageUrl to:`, imageUrl)
                        toast({
                            title: `Step ${i + 1}/${totalVariations} Complete`,
                            description: isLastStep ? 'All images saved to gallery!' : 'Moving to next step...',
                        })
                    } catch (waitError) {
                        const errorMsg = waitError instanceof Error ? waitError.message : 'Unknown error'
                        console.error(`Step ${i + 1} failed:`, errorMsg)
                        throw new Error(`Step ${i + 1} failed: ${errorMsg}`)
                    }
                }
                if (isLastStep) {
                    setActiveGalleryId(response.galleryId)
                }
            }

            // Mark as waiting and stop the loader after API calls succeed
            setProgress({
                status: isPipeChaining ? 'succeeded' : 'waiting',
                predictionId: results[results.length - 1].predictionId,
                galleryId: results[results.length - 1].galleryId,
            })
            setShotCreatorProcessing(false)
            setIsPipeChaining(false) // Always reset pipe chaining state

            toast({
                title: isPipeChaining ? 'Chain Complete!' : 'Generation Started!',
                description: isPipeChaining
                    ? `All ${totalVariations} images saved to gallery!`
                    : totalVariations > 1
                        ? `${totalVariations} images will appear in the gallery when ready.`
                        : 'Your image will appear in the gallery when ready.',
            })

            // Refresh credits balance to show deduction
            void fetchBalance(true)

            return {
                success: true,
                predictionId: results[results.length - 1].predictionId,
                galleryId: results[results.length - 1].galleryId,
                totalVariations,
            }
        } catch (error) {
            console.error('Image generation failed:', error)

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
