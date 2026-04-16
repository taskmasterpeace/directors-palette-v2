/**
 * Shared constants for the style-sheets feature.
 * Kept in one place so UI and API stay in sync.
 */

export const STYLE_REFERENCE_NO_TEXT_GUARD =
  'Apply only the visual style (colors, textures, medium, technique) from the style reference image — ignore any text, titles, captions, or labels that appear within the reference itself.'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
