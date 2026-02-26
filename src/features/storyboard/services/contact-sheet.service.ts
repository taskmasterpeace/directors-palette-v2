/**
 * Contact Sheet Service
 * Generates a 3x3 grid image with 9 cinematic angle variations, then slices it
 *
 * NEW ARCHITECTURE (v2):
 * - Generate ONE 3x3 grid image with all angles in a single API call
 * - Slice the grid into 9 separate images client-side
 * - Cost: ~$0.14 instead of ~$1.26 (9 separate calls)
 */

import { imageGenerationService, ImageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import {
    CinematicAngle,
    ANGLE_PROMPTS,
    DEFAULT_CONTACT_SHEET_CONFIG,
    GeneratedShotPrompt,
    StyleGuide
} from '../types/storyboard.types'
import { logger } from '@/lib/logger'

// Path to the contact sheet template reference image
export const CONTACT_SHEET_TEMPLATE_PATH = '/storyboard-assets/templates/contact-sheet-grid.png'

export interface ContactSheetConfig {
    aspectRatio: string
    resolution: '1K' | '2K' | '4K'
    useTemplateReference: boolean
}

export interface ContactSheetVariant {
    position: number // 1-9
    angle: CinematicAngle
    anglePrompt: string
    fullPrompt: string
    predictionId?: string
    imageUrl?: string
    status: 'pending' | 'generating' | 'completed' | 'failed'
    error?: string
}

export interface ContactSheetResult {
    baseShotSequence: number
    variants: ContactSheetVariant[]
    gridImageUrl?: string // Full 3x3 grid image (for the V2 single-image approach)
}

export interface ContactSheetProgress {
    total: number
    current: number
    status: 'idle' | 'generating' | 'completed' | 'failed'
    currentAngle?: CinematicAngle
    error?: string
}

/**
 * Friendly names for cinematic angles
 */
export const ANGLE_NAMES: Record<CinematicAngle, string> = {
    wide_distant: 'Wide Distant',
    wide_full_body: 'Full Body',
    wide_medium_long: 'Medium-Long',
    core_waist_up: 'Waist-Up',
    core_chest_up: 'Chest-Up',
    core_tight_face: 'Tight Face',
    detail_macro: 'Macro Detail',
    detail_low_angle: 'Low Angle',
    detail_high_angle: 'High Angle'
}

export class ContactSheetService {
    private progress: ContactSheetProgress = {
        total: 9,
        current: 0,
        status: 'idle'
    }

    private onProgressUpdate?: (progress: ContactSheetProgress) => void

    setProgressCallback(callback: (progress: ContactSheetProgress) => void) {
        this.onProgressUpdate = callback
    }

    private updateProgress(updates: Partial<ContactSheetProgress>) {
        this.progress = { ...this.progress, ...updates }
        this.onProgressUpdate?.(this.progress)
    }

    /**
     * Get all 9 angles in grid order (left to right, top to bottom)
     */
    getAnglesInOrder(): CinematicAngle[] {
        const config = DEFAULT_CONTACT_SHEET_CONFIG
        return [
            ...config.rows.row_1,
            ...config.rows.row_2,
            ...config.rows.row_3
        ]
    }

    /**
     * Build prompts for all 9 angles based on a base shot
     */
    buildContactSheetPrompts(
        baseShot: GeneratedShotPrompt,
        styleGuide?: StyleGuide
    ): ContactSheetVariant[] {
        const angles = this.getAnglesInOrder()

        return angles.map((angle, index) => {
            const anglePrompt = ANGLE_PROMPTS[angle]

            // Combine angle prompt with the base shot prompt
            let fullPrompt = `${anglePrompt}, ${baseShot.prompt}`

            // Add style if present
            if (styleGuide?.style_prompt) {
                fullPrompt = `${fullPrompt}, ${styleGuide.style_prompt}`
            }

            return {
                position: index + 1,
                angle,
                anglePrompt,
                fullPrompt,
                status: 'pending' as const
            }
        })
    }

    /**
     * Generate all 9 contact sheet images
     */
    async generateContactSheet(
        baseShot: GeneratedShotPrompt,
        config: ContactSheetConfig,
        styleGuide?: StyleGuide
    ): Promise<ContactSheetResult> {
        const variants = this.buildContactSheetPrompts(baseShot, styleGuide)

        this.updateProgress({
            total: 9,
            current: 0,
            status: 'generating'
        })

        // Get reference images from the base shot's character refs
        const referenceImages: string[] = []
        for (const charRef of baseShot.characterRefs) {
            if (charRef.reference_image_url) {
                referenceImages.push(charRef.reference_image_url)
            }
        }
        if (baseShot.locationRef?.reference_image_url) {
            referenceImages.push(baseShot.locationRef.reference_image_url)
        }

        // Add template reference if enabled
        if (config.useTemplateReference) {
            // The template is a local file, needs to be served or converted
            // For now, we'll use the public path directly if the image gen service supports it
            referenceImages.push(CONTACT_SHEET_TEMPLATE_PATH)
        }

        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i]

            this.updateProgress({
                current: i + 1,
                currentAngle: variant.angle
            })

            variant.status = 'generating'

            try {
                // Validate input
                const validationResult = ImageGenerationService.validateInput({
                    prompt: variant.fullPrompt,
                    model: 'nano-banana-2',
                    modelSettings: {
                        aspectRatio: config.aspectRatio,
                        resolution: config.resolution
                    },
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                    userId: ''
                })

                if (!validationResult.valid) {
                    variant.status = 'failed'
                    variant.error = validationResult.errors.join(', ')
                    continue
                }

                // Generate the image
                const response = await imageGenerationService.generateImage({
                    model: 'nano-banana-2',
                    prompt: variant.fullPrompt,
                    modelSettings: {
                        aspectRatio: config.aspectRatio,
                        resolution: config.resolution
                    },
                    referenceImages: referenceImages.length > 0 ? referenceImages : undefined
                })

                variant.predictionId = response.predictionId
                variant.status = 'completed'
            } catch (error) {
                variant.status = 'failed'
                variant.error = error instanceof Error ? error.message : 'Generation failed'
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        const hasFailures = variants.some(v => v.status === 'failed')
        this.updateProgress({
            status: hasFailures ? 'failed' : 'completed'
        })

        return {
            baseShotSequence: baseShot.sequence,
            variants
        }
    }

    /**
     * Generate a single angle variant
     */
    async generateSingleVariant(
        baseShot: GeneratedShotPrompt,
        angle: CinematicAngle,
        config: ContactSheetConfig,
        styleGuide?: StyleGuide
    ): Promise<ContactSheetVariant> {
        const anglePrompt = ANGLE_PROMPTS[angle]
        let fullPrompt = `${anglePrompt}, ${baseShot.prompt}`

        if (styleGuide?.style_prompt) {
            fullPrompt = `${fullPrompt}, ${styleGuide.style_prompt}`
        }

        const variant: ContactSheetVariant = {
            position: this.getAnglesInOrder().indexOf(angle) + 1,
            angle,
            anglePrompt,
            fullPrompt,
            status: 'generating'
        }

        // Get reference images
        const referenceImages: string[] = []
        for (const charRef of baseShot.characterRefs) {
            if (charRef.reference_image_url) {
                referenceImages.push(charRef.reference_image_url)
            }
        }
        if (baseShot.locationRef?.reference_image_url) {
            referenceImages.push(baseShot.locationRef.reference_image_url)
        }
        if (config.useTemplateReference) {
            referenceImages.push(CONTACT_SHEET_TEMPLATE_PATH)
        }

        try {
            const response = await imageGenerationService.generateImage({
                model: 'nano-banana-2',
                prompt: fullPrompt,
                modelSettings: {
                    aspectRatio: config.aspectRatio,
                    resolution: config.resolution
                },
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined
            })

            variant.predictionId = response.predictionId
            variant.status = 'completed'
        } catch (error) {
            variant.status = 'failed'
            variant.error = error instanceof Error ? error.message : 'Generation failed'
        }

        return variant
    }

    getProgress(): ContactSheetProgress {
        return this.progress
    }

    resetProgress() {
        this.progress = {
            total: 9,
            current: 0,
            status: 'idle'
        }
        this.onProgressUpdate?.(this.progress)
    }
}

/**
 * Build a prompt that instructs the AI to generate a 3x3 grid
 * with all 9 camera angles in specific positions
 */
function buildGridPrompt(basePrompt: string, stylePrompt?: string): string {
    const config = DEFAULT_CONTACT_SHEET_CONFIG

    // Get angle labels for the grid description
    const row1Desc = config.rows.row_1.map(a => ANGLE_PROMPTS[a].split(',')[0]).join(', ')
    const row2Desc = config.rows.row_2.map(a => ANGLE_PROMPTS[a].split(',')[0]).join(', ')
    const row3Desc = config.rows.row_3.map(a => ANGLE_PROMPTS[a].split(',')[0]).join(', ')

    // Build a comprehensive prompt for a 3x3 collage/grid
    let gridPrompt = `A 3x3 grid collage of 9 different camera angles showing the same scene: ${basePrompt}.

The grid layout is:
TOP ROW: ${row1Desc}
MIDDLE ROW: ${row2Desc}
BOTTOM ROW: ${row3Desc}

Each cell shows the same subject from a different perspective. Clear separation between cells with thin borders. Professional cinematography reference sheet style.`

    if (stylePrompt) {
        gridPrompt = `${gridPrompt} ${stylePrompt}`
    }

    return gridPrompt
}

/**
 * Slice a grid image into 9 equal parts
 * Returns array of data URLs for each cell
 */
async function sliceGridImage(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const cellWidth = Math.floor(img.width / 3)
            const cellHeight = Math.floor(img.height / 3)
            const cells: string[] = []

            // Create canvas for each cell
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const canvas = document.createElement('canvas')
                    canvas.width = cellWidth
                    canvas.height = cellHeight
                    const ctx = canvas.getContext('2d')

                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'))
                        return
                    }

                    // Draw the specific cell from the grid
                    ctx.drawImage(
                        img,
                        col * cellWidth,
                        row * cellHeight,
                        cellWidth,
                        cellHeight,
                        0,
                        0,
                        cellWidth,
                        cellHeight
                    )

                    cells.push(canvas.toDataURL('image/png'))
                }
            }

            resolve(cells)
        }

        img.onerror = () => reject(new Error('Failed to load image for slicing'))
        img.src = imageUrl
    })
}

export class ContactSheetServiceV2 {
    private progress: ContactSheetProgress = {
        total: 2, // 1 for generation, 1 for slicing
        current: 0,
        status: 'idle'
    }

    private onProgressUpdate?: (progress: ContactSheetProgress) => void

    setProgressCallback(callback: (progress: ContactSheetProgress) => void) {
        this.onProgressUpdate = callback
    }

    private updateProgress(updates: Partial<ContactSheetProgress>) {
        this.progress = { ...this.progress, ...updates }
        this.onProgressUpdate?.(this.progress)
    }

    /**
     * Get all 9 angles in grid order (left to right, top to bottom)
     */
    getAnglesInOrder(): CinematicAngle[] {
        const config = DEFAULT_CONTACT_SHEET_CONFIG
        return [
            ...config.rows.row_1,
            ...config.rows.row_2,
            ...config.rows.row_3
        ]
    }

    /**
     * Generate a 3x3 grid contact sheet using the new single-image approach
     * MUCH cheaper than generating 9 separate images
     */
    async generateGridContactSheet(
        baseShot: GeneratedShotPrompt,
        config: ContactSheetConfig,
        styleGuide?: StyleGuide
    ): Promise<ContactSheetResult> {
        this.updateProgress({
            total: 2,
            current: 0,
            status: 'generating'
        })

        // Build the grid prompt
        const gridPrompt = buildGridPrompt(
            baseShot.prompt,
            styleGuide?.style_prompt
        )

        // Get reference images
        const referenceImages: string[] = []
        for (const charRef of baseShot.characterRefs) {
            if (charRef.reference_image_url) {
                referenceImages.push(charRef.reference_image_url)
            }
        }
        if (baseShot.locationRef?.reference_image_url) {
            referenceImages.push(baseShot.locationRef.reference_image_url)
        }
        if (config.useTemplateReference) {
            referenceImages.push(CONTACT_SHEET_TEMPLATE_PATH)
        }

        // Generate the single grid image
        this.updateProgress({ current: 1 })

        let gridImageUrl: string | undefined
        let predictionId: string | undefined

        try {
            const validationResult = ImageGenerationService.validateInput({
                prompt: gridPrompt,
                model: 'nano-banana-2',
                modelSettings: {
                    aspectRatio: '1:1', // Square for 3x3 grid
                    resolution: config.resolution
                },
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
                userId: ''
            })

            if (!validationResult.valid) {
                throw new Error(validationResult.errors.join(', '))
            }

            const response = await imageGenerationService.generateImage({
                model: 'nano-banana-2',
                prompt: gridPrompt,
                modelSettings: {
                    aspectRatio: '1:1', // Square for 3x3 grid
                    resolution: config.resolution
                },
                referenceImages: referenceImages.length > 0 ? referenceImages : undefined
            })

            predictionId = response.predictionId
            gridImageUrl = response.imageUrl
        } catch (error) {
            this.updateProgress({ status: 'failed', error: error instanceof Error ? error.message : 'Generation failed' })
            throw error
        }

        // Slice the grid image into 9 cells
        this.updateProgress({ current: 2 })

        const angles = this.getAnglesInOrder()
        const variants: ContactSheetVariant[] = angles.map((angle, index) => ({
            position: index + 1,
            angle,
            anglePrompt: ANGLE_PROMPTS[angle],
            fullPrompt: gridPrompt,
            predictionId,
            status: 'pending' as const
        }))

        if (gridImageUrl) {
            try {
                const cellImages = await sliceGridImage(gridImageUrl)

                // Assign sliced images to variants
                cellImages.forEach((cellUrl, index) => {
                    if (variants[index]) {
                        variants[index].imageUrl = cellUrl
                        variants[index].status = 'completed'
                    }
                })
            } catch (error) {
                // If slicing fails, mark all as failed but provide the grid image URL
                variants.forEach(v => {
                    v.status = 'failed'
                    v.error = 'Failed to slice grid image'
                })
                logger.storyboard.error('Grid slicing error', { error: error instanceof Error ? error.message : String(error) })
            }
        } else {
            variants.forEach(v => {
                v.status = 'failed'
                v.error = 'No grid image generated'
            })
        }

        const hasFailures = variants.some(v => v.status === 'failed')
        this.updateProgress({ status: hasFailures ? 'failed' : 'completed' })

        return {
            baseShotSequence: baseShot.sequence,
            variants,
            gridImageUrl // Include the full grid for reference
        }
    }

    getProgress(): ContactSheetProgress {
        return this.progress
    }

    resetProgress() {
        this.progress = {
            total: 2,
            current: 0,
            status: 'idle'
        }
        this.onProgressUpdate?.(this.progress)
    }
}

export const contactSheetService = new ContactSheetService()
export const contactSheetServiceV2 = new ContactSheetServiceV2()
