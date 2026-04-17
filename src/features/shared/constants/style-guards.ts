/**
 * Shared constants for the style-sheets feature.
 * Kept in one place so UI and API stay in sync.
 *
 * These directives turn a raw style_prompt into an enforceable instruction for
 * the image model. The preceding style_prompt describes the attributes; the
 * directive tells the model to *transfer those attributes* rather than simply
 * mentioning them.
 */

/**
 * Used when a style reference IMAGE is attached to the generation.
 * The directive tells the model to match the reference's visual characteristics
 * strongly across every axis of style, while ignoring any textual content
 * painted into the reference itself.
 */
export const STYLE_REFERENCE_DIRECTIVE =
  'Render the subject entirely in this visual style: match the reference image\'s art medium, color palette, lighting and tonal range, line work and edge treatment, texture and grain, rendering technique, and compositional language. The style description above lists the attributes you must preserve. Transfer the style — not the reference\'s subject matter — and ignore any text, titles, captions, labels, or watermarks that appear within the reference image itself.'

/**
 * Used when the selected style has NO reference image (prompt-only style).
 * Still asserts that every style axis described in the preceding style_prompt
 * must be applied throughout the image, not just touched on.
 */
export const STYLE_PROMPT_DIRECTIVE =
  'Render the subject entirely in this visual style throughout the whole image: honor the described art medium, color palette, lighting, texture, line work, and rendering technique in every element of the composition.'

/**
 * @deprecated Use STYLE_REFERENCE_DIRECTIVE instead. Kept as an alias for
 * backwards compatibility with older imports during rollout.
 */
export const STYLE_REFERENCE_NO_TEXT_GUARD = STYLE_REFERENCE_DIRECTIVE

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
