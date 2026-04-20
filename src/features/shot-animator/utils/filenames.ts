/**
 * Filename helpers for Shot Animator downloads.
 *
 * Standardizes the generated filename across the two places that currently
 * download videos (ShotAnimatorView direct-download path, AnimatorUnifiedGallery
 * blob download) so users get meaningful names instead of `video_<timestamp>.mp4`.
 */

import type { AnimationModel } from '../types'

const MAX_PROMPT_CHARS = 24

/** Collapse a string to a url-safe slug: lowercase, alnum + dashes, trimmed. */
function slug(input: string | undefined | null, maxLen = 40): string {
  if (!input) return ''
  return input
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i, '') // drop file extensions
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
}

/**
 * Build a download filename like `wide-shot-02_seedance-2-0-fast_neon-street-rain.mp4`.
 * Falls back to `video_<timestamp>.mp4` if all inputs are empty.
 */
export function videoDownloadFilename(params: {
  shotName?: string
  model?: AnimationModel | string
  prompt?: string
}): string {
  const parts = [
    slug(params.shotName),
    slug(params.model, 24),
    slug(params.prompt, MAX_PROMPT_CHARS),
  ].filter(Boolean)

  if (parts.length === 0) {
    return `video_${Date.now()}.mp4`
  }
  return `${parts.join('_')}.mp4`
}
