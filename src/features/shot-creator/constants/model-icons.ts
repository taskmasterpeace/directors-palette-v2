/**
 * Model icon and color mapping
 * Based on model-config.ts model definitions
 */

export const MODEL_ICONS: Record<string, string> = {
  'nano-banana': '🍌',
  'nano-banana-pro': '🔥',
  'z-image-turbo': '💨',
  'qwen-image-2512': '🎨',
  'gpt-image-low': '🤖',
  'gpt-image-medium': '🤖',
  'gpt-image-high': '🤖',
  'seedream-4.5': '🌱',
  'riverflow-2-pro': '🔤',
}

export function getModelIcon(model?: string): string {
  if (!model) return '🍌'
  return MODEL_ICONS[model] || '🍌'
}
