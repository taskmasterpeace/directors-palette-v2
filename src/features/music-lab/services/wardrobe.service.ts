/**
 * Wardrobe Service
 * 
 * Client-side service for wardrobe generation APIs.
 */

export interface WardrobePreviewRequest {
    artistImageUrl: string
    wardrobeDescription: string
    aspectRatio?: string
    seed?: number
}

export interface WardrobePreviewResponse {
    success: boolean
    previewUrl?: string
    wardrobeDescription?: string
    error?: string
}

export interface WardrobeReferenceRequest {
    wardrobeName: string
    wardrobeDescription: string
    aspectRatio?: string
}

export interface WardrobeReferenceResponse {
    success: boolean
    referenceUrl?: string
    wardrobeName?: string
    wardrobeDescription?: string
    error?: string
}

class WardrobeService {
    /**
     * Generate a preview of the artist wearing a specific wardrobe
     * Uses P-Edit to composite wardrobe onto artist image
     */
    async generatePreview(request: WardrobePreviewRequest): Promise<WardrobePreviewResponse> {
        try {
            const response = await fetch('/api/wardrobe/generate-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            })

            if (!response.ok) {
                const error = await response.json()
                return { success: false, error: error.error || 'Preview generation failed' }
            }

            return await response.json()
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            }
        }
    }

    /**
     * Generate a white-background wardrobe reference image
     * For lookbook display without person
     */
    async generateReference(request: WardrobeReferenceRequest): Promise<WardrobeReferenceResponse> {
        try {
            const response = await fetch('/api/wardrobe/generate-reference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            })

            if (!response.ok) {
                const error = await response.json()
                return { success: false, error: error.error || 'Reference generation failed' }
            }

            return await response.json()
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            }
        }
    }

    /**
     * Build a wardrobe description from components
     */
    buildDescription(components: {
        top?: string
        bottom?: string
        outerwear?: string
        footwear?: string
        accessories?: string[]
    }): string {
        const parts: string[] = []

        if (components.outerwear) parts.push(components.outerwear)
        if (components.top) parts.push(components.top)
        if (components.bottom) parts.push(components.bottom)
        if (components.footwear) parts.push(components.footwear)
        if (components.accessories?.length) {
            parts.push(components.accessories.join(', '))
        }

        return parts.join(', ')
    }
}

export const wardrobeService = new WardrobeService()
