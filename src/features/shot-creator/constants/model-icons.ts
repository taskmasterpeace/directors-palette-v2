/**
 * Model icon lookup — always sources from the central MODEL_CONFIGS.
 *
 * Do NOT re-introduce a local hardcoded map: the previous version drifted
 * when new models were added (gpt-image-2 fell back to 🍌 because it
 * wasn't in the local map). Let MODEL_CONFIGS be the single source of truth.
 */
import { MODEL_CONFIGS, ModelId } from '@/config'

export function getModelIcon(model?: string): string {
  if (!model) return '🍌'
  return MODEL_CONFIGS[model as ModelId]?.icon ?? '🍌'
}
