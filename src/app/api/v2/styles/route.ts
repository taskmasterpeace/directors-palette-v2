/**
 * API v2: Style Sheets
 * GET /api/v2/styles — List all available premade styles
 *
 * Returns system style sheets (Muppet, Anime, etc.) that users can
 * reference when generating images. Use the style_prompt in your
 * image generation prompt to apply a consistent visual style.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../_lib/middleware'
import { successResponse, errors } from '../_lib/response'

export async function GET(request: NextRequest) {
  const auth = await validateV2ApiKey(request)
  if (!isAuthContext(auth)) return auth

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('style_guides')
      .select('id, name, description, style_prompt, image_url, created_at')
      .eq('is_system', true)
      .order('name')

    if (error) {
      return errors.internal('Failed to fetch styles')
    }

    const styles = (data || []).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      style_prompt: s.style_prompt,
      preview_image: s.image_url,
      created_at: s.created_at,
    }))

    return successResponse({ styles, total: styles.length })
  } catch {
    return errors.internal('Failed to fetch styles')
  }
}
