import { getModelCost, type ModelId } from '@/config'

/** Default fallback cost in tokens per image (used when model unknown) */
export const TOKENS_PER_IMAGE = 20

/**
 * Get actual cost per image in tokens (points) for the given model + resolution.
 * Falls back to TOKENS_PER_IMAGE if model is not provided.
 */
export function getImageCostTokens(model?: ModelId | string, resolution?: string): number {
    if (!model) return TOKENS_PER_IMAGE
    const costDollars = getModelCost(model as ModelId, resolution)
    return Math.ceil(costDollars * 100)
}
