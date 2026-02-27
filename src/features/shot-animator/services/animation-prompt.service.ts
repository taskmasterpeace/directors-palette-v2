/**
 * Animation Prompt Service
 *
 * Client-side service for generating animation prompts from images.
 * Uses Gemini Flash vision to analyze the image and generate
 * natural motion descriptions.
 *
 * Supports two modes:
 * - generate: Create prompt from image analysis (empty prompt box)
 * - enhance: Refine existing user text (has text in prompt box)
 */

export interface AnimationPromptOptions {
    originalPrompt?: string
    existingPrompt?: string
    mode: 'generate' | 'enhance'
    promptStyle?: 'specific' | 'reasoning'
    audioEnabled?: boolean
    multiShot?: boolean
    lastFrameUrl?: string
}

export interface AnimationPromptRequest {
    imageUrl: string
    originalPrompt?: string
    existingPrompt?: string
    mode: 'generate' | 'enhance'
    promptStyle?: 'specific' | 'reasoning'
    audioEnabled?: boolean
    multiShot?: boolean
    lastFrameUrl?: string
}

export interface AnimationPromptResponse {
    animationPrompt: string
    originalPrompt: string
    imageUrl: string
    mode: 'generate' | 'enhance'
}

export interface AnimationPromptError {
    error: string
}

/**
 * Generate or enhance an animation prompt from an image
 *
 * @param imageUrl - URL of the image to analyze
 * @param options - Mode, prompt style, and optional prompts
 * @returns Animation direction prompt suitable for video generation
 */
export async function generateAnimationPrompt(
    imageUrl: string,
    options: AnimationPromptOptions
): Promise<AnimationPromptResponse> {
    const response = await fetch('/api/animation-prompt/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            imageUrl,
            originalPrompt: options.originalPrompt,
            existingPrompt: options.existingPrompt,
            mode: options.mode,
            promptStyle: options.promptStyle,
            audioEnabled: options.audioEnabled,
            multiShot: options.multiShot,
            lastFrameUrl: options.lastFrameUrl,
        }),
    })

    if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
            const errorData: AnimationPromptError = await response.json()
            throw new Error(errorData.error || 'Failed to generate animation prompt')
        } else {
            throw new Error(`Request failed (HTTP ${response.status})`)
        }
    }

    return response.json()
}

/**
 * Generate animation prompts for multiple images in parallel
 *
 * @param items - Array of { imageUrl, ...options } objects
 * @returns Array of results with either animationPrompt or error for each
 */
export async function generateAnimationPromptsBatch(
    items: AnimationPromptRequest[]
): Promise<Array<{ success: true; data: AnimationPromptResponse } | { success: false; error: string }>> {
    const results = await Promise.allSettled(
        items.map(item => generateAnimationPrompt(item.imageUrl, {
            originalPrompt: item.originalPrompt,
            existingPrompt: item.existingPrompt,
            mode: item.mode,
            promptStyle: item.promptStyle,
        }))
    )

    return results.map(result => {
        if (result.status === 'fulfilled') {
            return { success: true as const, data: result.value }
        } else {
            return {
                success: false as const,
                error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
            }
        }
    })
}
