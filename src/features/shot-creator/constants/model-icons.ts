/**
 * Model icon mapping — must match icons in src/config/index.ts MODEL_CONFIGS
 */

export const MODEL_ICONS: Record<string, string> = {
  'nano-banana': '🍌',
  'nano-banana-pro': '🔥',
  'z-image-turbo': '⚡',
  'gpt-image-low': '🎨',
  'gpt-image-medium': '🎨',
  'gpt-image-high': '✨',
  'seedream-5-lite': '🌿',
  'riverflow-2-pro': '🌊',
}

export function getModelIcon(model?: string): string {
  if (!model) return '🍌'
  return MODEL_ICONS[model] || '🍌'
}
