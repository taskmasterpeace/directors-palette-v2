/**
 * Model icon mapping — must match icons in src/config/index.ts MODEL_CONFIGS
 */

export const MODEL_ICONS: Record<string, string> = {
  'nano-banana-2': '🍌',
  'z-image-turbo': '⚡',
}

export function getModelIcon(model?: string): string {
  if (!model) return '🍌'
  return MODEL_ICONS[model] || '🍌'
}
