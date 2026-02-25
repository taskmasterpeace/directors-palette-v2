/**
 * Model Settings Builder Service
 * Pure functions for constructing model-specific settings objects
 *
 * Extracted from PromptActions.tsx to improve code organization
 * and enable reuse across the application.
 */

import type { RiverflowState } from '../components/RiverflowOptionsPanel';

export interface ShotCreatorSettings {
  model: string;
  aspectRatio?: string;
  outputFormat?: string;
  resolution?: string;
  safetyFilterLevel?: string;
  sequentialGeneration?: boolean;
  maxImages?: number;
  // ... other settings may be added
  [key: string]: unknown;
}

export type ModelSettings = Record<string, unknown>;

/**
 * Build model-specific settings from shot creator settings
 */
export function buildModelSettings(
  settings: ShotCreatorSettings,
  riverflowState?: RiverflowState | null
): ModelSettings {
  const model = settings.model || 'nano-banana';

  // Base settings
  const modelSettings: ModelSettings = {};

  switch (model) {
    case 'nano-banana':
      modelSettings.aspectRatio = settings.aspectRatio;
      modelSettings.outputFormat = settings.outputFormat || 'jpg';
      break;

    case 'nano-banana-pro':
      modelSettings.aspectRatio = settings.aspectRatio;
      modelSettings.outputFormat = settings.outputFormat || 'jpg';
      modelSettings.resolution = settings.resolution;
      modelSettings.safetyFilterLevel = settings.safetyFilterLevel || 'block_only_high';
      break;

    case 'z-image-turbo':
      modelSettings.aspectRatio = settings.aspectRatio;
      modelSettings.outputFormat = settings.outputFormat || 'jpg';
      // numInferenceSteps and guidanceScale use config defaults (8 and 0)
      break;

    case 'seedream-5-lite':
      modelSettings.aspectRatio = settings.aspectRatio;
      modelSettings.outputFormat = settings.outputFormat || 'png';
      modelSettings.resolution = settings.resolution || '2K';
      // Sequential generation settings
      if (settings.sequentialGeneration) {
        modelSettings.sequentialGeneration = true;
        modelSettings.maxImages = settings.maxImages || 3;
      }
      break;

    case 'gpt-image-low':
    case 'gpt-image-medium':
    case 'gpt-image-high':
      modelSettings.aspectRatio = settings.aspectRatio;
      modelSettings.outputFormat = settings.outputFormat || 'webp';
      break;

    case 'riverflow-2-pro':
      modelSettings.aspectRatio = settings.aspectRatio;
      // Riverflow-specific settings from panel state
      if (riverflowState) {
        modelSettings.resolution = riverflowState.resolution;
        modelSettings.transparency = riverflowState.transparency;
        modelSettings.enhancePrompt = riverflowState.enhancePrompt;
        modelSettings.maxIterations = riverflowState.maxIterations;
        modelSettings.outputFormat = riverflowState.transparency ? 'png' : 'webp';
      } else {
        // Defaults if panel hasn't been opened
        modelSettings.resolution = '2K';
        modelSettings.transparency = false;
        modelSettings.enhancePrompt = true;
        modelSettings.maxIterations = 3;
        modelSettings.outputFormat = 'webp';
      }
      break;

    default:
      // Unknown model - copy basic settings
      modelSettings.aspectRatio = settings.aspectRatio;
      modelSettings.outputFormat = settings.outputFormat || 'jpg';
  }

  return modelSettings;
}

/**
 * Get default output format for a model
 */
export function getDefaultOutputFormat(model: string): string {
  switch (model) {
    case 'nano-banana':
    case 'nano-banana-pro':
    case 'z-image-turbo':
      return 'jpg';
    case 'seedream-5-lite':
      return 'png';
    case 'gpt-image-low':
    case 'gpt-image-medium':
    case 'gpt-image-high':
    case 'riverflow-2-pro':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * Check if a model supports resolution settings
 */
export function supportsResolution(model: string): boolean {
  return ['nano-banana-pro', 'seedream-5-lite', 'riverflow-2-pro'].includes(model);
}

/**
 * Check if a model supports sequential generation
 */
export function supportsSequentialGeneration(model: string): boolean {
  return model === 'seedream-5-lite';
}
