/**
 * B-Roll Sheet Service
 * Generates a 3x3 grid image with 9 B-roll shot variations, then slices it
 *
 * Unlike the Contact Sheet (which shows different camera ANGLES of the same scene),
 * B-Roll generates different scene ELEMENTS that maintain visual continuity:
 * - Environment shots (establishing, foreground, background)
 * - Detail shots (object, texture, action)
 * - Atmospheric shots (ambient life, symbol, context frame)
 *
 * Uses the Runway-style prompt pattern:
 * "Change the image completely to [description]. Use the provided image as reference.
 *  Make sure the color, lighting, and setting match the original image."
 */

import { imageGenerationService } from '@/features/shot-creator/services/image-generation.service'
import {
    BRollShotType,
    BROLL_PROMPTS,
    DEFAULT_BROLL_CONFIG,
    BROLL_NAMES
} from '../types/storyboard.types'
import { logger } from '@/lib/logger'

export interface BRollSheetConfig {
    aspectRatio: string
    resolution: '1K' | '2K' | '4K'
}

export interface BRollVariant {
    position: number // 1-9
    shotType: BRollShotType
    description: string
    cinematicHint: string
    fullPrompt: string
    predictionId?: string
    imageUrl?: string
    status: 'pending' | 'generating' | 'completed' | 'failed'
    error?: string
}

export interface BRollSheetResult {
    referenceImageUrl: string
    variants: BRollVariant[]
    gridImageUrl?: string // Full 3x3 grid image
}

export interface BRollSheetProgress {
    total: number
    current: number
    status: 'idle' | 'generating' | 'slicing' | 'completed' | 'failed'
    currentShotType?: BRollShotType
    error?: string
}

// Re-export names for use in components
export { BROLL_NAMES }

/**
 * Build the Runway-style B-roll prompt for a single shot type
 */
function buildBRollPrompt(shotType: BRollShotType): string {
    const { description, cinematicHint } = BROLL_PROMPTS[shotType]

    // Runway-style prompt structure for visual continuity
    return `Change the image completely to ${description}. Use the provided image as reference. Make sure the color, lighting, and setting match the original image. ${cinematicHint}`
}

/**
 * Build a prompt that instructs the AI to generate a 3x3 B-roll grid
 * All 9 shots maintain visual continuity with the reference image
 */
function buildBRollGridPrompt(): string {
    const config = DEFAULT_BROLL_CONFIG

    // Get descriptions for each row
    const row1Shots = config.rows.row_1.map(t => BROLL_PROMPTS[t].description.split(',')[0]).join(', ')
    const row2Shots = config.rows.row_2.map(t => BROLL_PROMPTS[t].description.split(',')[0]).join(', ')
    const row3Shots = config.rows.row_3.map(t => BROLL_PROMPTS[t].description.split(',')[0]).join(', ')

    return `A 3x3 grid collage of 9 different B-roll shots that complement and extend the provided reference image.

IMPORTANT: Use the provided reference image to match the exact color palette, lighting conditions, and visual setting. All 9 cells should feel like they belong to the same scene.

The grid layout is:
TOP ROW (Environment): ${row1Shots}
MIDDLE ROW (Details): ${row2Shots}
BOTTOM ROW (Atmosphere): ${row3Shots}

Each cell shows a different element from the same visual world - not different angles of the same subject, but different subjects that share the same look and feel. Clear separation between cells with thin borders. Professional cinematography B-roll reference sheet style.

The color temperature, lighting direction, and overall mood must match across all 9 cells, creating a cohesive visual palette.`
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

export class BRollSheetService {
    private progress: BRollSheetProgress = {
        total: 2, // 1 for generation, 1 for slicing
        current: 0,
        status: 'idle'
    }

    private onProgressUpdate?: (progress: BRollSheetProgress) => void

    setProgressCallback(callback: (progress: BRollSheetProgress) => void) {
        this.onProgressUpdate = callback
    }

    private updateProgress(updates: Partial<BRollSheetProgress>) {
        this.progress = { ...this.progress, ...updates }
        this.onProgressUpdate?.(this.progress)
    }

    /**
     * Get all 9 B-roll shot types in grid order (left to right, top to bottom)
     */
    getShotTypesInOrder(): BRollShotType[] {
        const config = DEFAULT_BROLL_CONFIG
        return [
            ...config.rows.row_1,
            ...config.rows.row_2,
            ...config.rows.row_3
        ]
    }

    /**
     * Build preview variants (before generation)
     */
    buildPreviewVariants(): BRollVariant[] {
        const shotTypes = this.getShotTypesInOrder()

        return shotTypes.map((shotType, index) => {
            const { description, cinematicHint } = BROLL_PROMPTS[shotType]
            return {
                position: index + 1,
                shotType,
                description,
                cinematicHint,
                fullPrompt: buildBRollPrompt(shotType),
                status: 'pending' as const
            }
        })
    }

    /**
     * Generate a 3x3 B-roll grid from a reference image
     * Uses the single-image-then-slice approach for cost efficiency
     */
    async generateBRollGrid(
        referenceImageUrl: string,
        config: BRollSheetConfig
    ): Promise<BRollSheetResult> {
        this.updateProgress({
            total: 2,
            current: 0,
            status: 'generating'
        })

        // Build the grid prompt
        const gridPrompt = buildBRollGridPrompt()

        // Reference image is the key input for B-roll
        const referenceImages = [referenceImageUrl]

        // Generate the single grid image
        this.updateProgress({ current: 1 })

        let gridImageUrl: string | undefined
        let predictionId: string | undefined

        try {
            const response = await imageGenerationService.generateImage({
                model: 'nano-banana-pro',
                prompt: gridPrompt,
                modelSettings: {
                    aspectRatio: '16:9', // Widescreen for cinematic B-roll grid
                    resolution: config.resolution
                },
                referenceImages
            })

            predictionId = response.predictionId
            gridImageUrl = response.imageUrl
        } catch (error) {
            this.updateProgress({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Generation failed'
            })
            throw error
        }

        // Slice the grid image into 9 cells
        this.updateProgress({ current: 2, status: 'slicing' })

        const shotTypes = this.getShotTypesInOrder()
        const variants: BRollVariant[] = shotTypes.map((shotType, index) => {
            const { description, cinematicHint } = BROLL_PROMPTS[shotType]
            return {
                position: index + 1,
                shotType,
                description,
                cinematicHint,
                fullPrompt: buildBRollPrompt(shotType),
                predictionId,
                status: 'pending' as const
            }
        })

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
                this.updateProgress({ status: 'completed' })
            } catch (error) {
                // If slicing fails (CORS issue), still mark as completed with grid URL
                // The full grid is available even if we can't slice it
                logger.storyboard.warn('Grid slicing failed (likely CORS), using full grid', { error: error instanceof Error ? error.message : String(error) })
                variants.forEach((v) => {
                    // Use the full grid URL - user can see the grid even if not sliced
                    v.imageUrl = gridImageUrl
                    v.status = 'completed'
                    v.error = 'View full grid (slicing unavailable)'
                })
                this.updateProgress({ status: 'completed' })
            }
        } else {
            variants.forEach(v => {
                v.status = 'failed'
                v.error = 'No grid image generated'
            })
            this.updateProgress({ status: 'failed' })
        }

        return {
            referenceImageUrl,
            variants,
            gridImageUrl // Include the full grid for reference
        }
    }

    getProgress(): BRollSheetProgress {
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

export const brollSheetService = new BRollSheetService()
