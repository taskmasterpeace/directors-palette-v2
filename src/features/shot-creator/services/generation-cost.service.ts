/**
 * Generation Cost Service
 * Pure functions for calculating image generation costs
 *
 * Extracted from PromptActions.tsx to improve code organization
 * and enable reuse across the application.
 */

import { getModelConfig, type ModelId } from '@/config';
import { parseDynamicPrompt } from '../helpers/prompt-syntax-feedback';
import type { WildCard } from '../helpers/wildcard/parser';

export interface GenerationCostInput {
  model: string;
  prompt: string;
  referenceImageCount: number;
  selectedStyle: string | null;
  enableAnchorTransform: boolean;
  disablePipeSyntax: boolean;
  disableBracketSyntax: boolean;
  disableWildcardSyntax: boolean;
  wildcards: WildCard[];
}

export interface GenerationCostResult {
  imageCount: number;
  totalCost: number;
  tokenCost: number;
  costPerImage: number;
  isAnchorMode: boolean;
}

/**
 * Calculate the cost of generating images based on model, settings, and prompt
 */
export function calculateGenerationCost(input: GenerationCostInput): GenerationCostResult {
  const {
    model,
    prompt,
    referenceImageCount,
    selectedStyle,
    enableAnchorTransform,
    disablePipeSyntax,
    disableBracketSyntax,
    disableWildcardSyntax,
    wildcards,
  } = input;

  const modelConfig = getModelConfig(model as ModelId);

  const costPerImage = modelConfig?.costPerImage ?? 0;

  // Check for anchor transform mode
  const isAnchorMode = enableAnchorTransform;

  let imageCount: number;

  if (isAnchorMode) {
    // Calculate based on inputs (total - 1 anchor)
    const totalImages = referenceImageCount + (selectedStyle ? 1 : 0);
    imageCount = Math.max(totalImages - 1, 0);
  } else {
    // Normal mode: parse the prompt to get image count
    const parsedPrompt = parseDynamicPrompt(prompt, {
      disablePipeSyntax,
      disableBracketSyntax,
      disableWildcardSyntax,
    }, wildcards);
    imageCount = parsedPrompt.totalCount || 1;
  }

  const totalCost = imageCount * costPerImage;

  // Convert dollar cost to tokens (1 token = $0.01)
  const tokenCost = Math.ceil(totalCost * 100);

  return {
    imageCount,
    totalCost,
    tokenCost,
    costPerImage,
    isAnchorMode,
  };
}

/**
 * Format cost as a human-readable string
 */
export function formatCost(costInDollars: number): string {
  if (costInDollars < 0.01) {
    return 'Free';
  }
  return `$${costInDollars.toFixed(2)}`;
}

/**
 * Format token cost as points
 */
export function formatTokenCost(tokens: number): string {
  if (tokens === 0) {
    return '0 pts';
  }
  return `${tokens} pts`;
}
