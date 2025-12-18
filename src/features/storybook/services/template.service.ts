/**
 * Storybook Template Service
 *
 * Manages system and user templates stored in Supabase Storage.
 * Templates are used as reference images for AI generation.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tarohelkwuurakbxjyxm.supabase.co'

/**
 * System templates - built-in templates for common use cases
 * Stored in Supabase Storage: templates/system/
 */
export const SYSTEM_TEMPLATES = {
  characterSheet: {
    /** Basic character sheet with 6 expressions */
    basic: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-basic.png`,
    /** Advanced template with 15 expressions + accessories */
    advanced: `${SUPABASE_URL}/storage/v1/object/public/templates/system/character-sheets/charactersheet-advanced.webp`,
  },
  grids: {
    /** 2x3 wardrobe/outfit variations grid */
    wardrobe: `${SUPABASE_URL}/storage/v1/object/public/templates/system/grids/wardrobe-2x3.png`,
  },
} as const

/**
 * Get the full URL for a system template
 */
export function getSystemTemplateUrl(
  category: keyof typeof SYSTEM_TEMPLATES,
  template: string
): string | undefined {
  const categoryTemplates = SYSTEM_TEMPLATES[category]
  if (!categoryTemplates) return undefined
  return (categoryTemplates as Record<string, string>)[template]
}

/**
 * Build a user template URL
 * User templates are stored in: templates/user/{userId}/{category}/{filename}
 */
export function getUserTemplateUrl(
  userId: string,
  category: 'character-sheets' | 'styles' | 'grids',
  filename: string
): string {
  return `${SUPABASE_URL}/storage/v1/object/public/templates/user/${userId}/${category}/${filename}`
}

/**
 * Template categories for reference image selection
 */
export const TEMPLATE_CATEGORIES = {
  'character-sheets': {
    label: 'Character Sheets',
    description: 'Templates for character reference sheets with expressions and poses',
  },
  'grids': {
    label: 'Grid Layouts',
    description: 'Templates for multi-image grids (3x3, 2x3, etc.)',
  },
  'styles': {
    label: 'Style Guides',
    description: 'User-saved style reference images',
  },
} as const
