/**
 * Animation Prompt Service
 *
 * Client-side service for generating animation prompts from images.
 * Uses GPT-4o-mini vision to analyze the image + original prompt
 * and generate natural motion descriptions.
 */

export interface AnimationPromptRequest {
    imageUrl: string
    originalPrompt: string
}

export interface AnimationPromptResponse {
    animationPrompt: string
    originalPrompt: string
    imageUrl: string
}

export interface AnimationPromptError {
    error: string
}

/**
 * Generate an animation prompt from an image and its original generation prompt
 *
 * @param imageUrl - URL of the image to analyze
 * @param originalPrompt - The prompt that was used to generate the image
 * @returns Animation direction prompt suitable for video generation
 *
 * @example
 * const result = await generateAnimationPrompt(
 *   'https://replicate.delivery/xxx/image.png',
 *   'A warrior standing on a cliff at sunset'
 * )
 * // result.animationPrompt: "Gentle camera push-in, cape billows in the wind, clouds drift slowly"
 */
export async function generateAnimationPrompt(
    imageUrl: string,
    originalPrompt: string
): Promise<AnimationPromptResponse> {
    const response = await fetch('/api/animation-prompt/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            imageUrl,
            originalPrompt,
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
 * @param items - Array of { imageUrl, originalPrompt } objects
 * @returns Array of results with either animationPrompt or error for each
 */
export async function generateAnimationPromptsBatch(
    items: AnimationPromptRequest[]
): Promise<Array<{ success: true; data: AnimationPromptResponse } | { success: false; error: string }>> {
    const results = await Promise.allSettled(
        items.map(item => generateAnimationPrompt(item.imageUrl, item.originalPrompt))
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
