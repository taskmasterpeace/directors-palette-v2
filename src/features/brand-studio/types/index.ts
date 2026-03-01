// Brand Studio Types

export interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  tagline: string | null
  industry: string | null
  audience_json: BrandAudience | null
  voice_json: BrandVoice | null
  visual_identity_json: BrandVisualIdentity | null
  music_json: BrandMusic | null
  visual_style_json: BrandVisualStyle | null
  brand_guide_image_url: string | null
  raw_company_info: string | null
  created_at: string
  updated_at: string
}

export interface BrandAudience {
  primary: string
  secondary: string
  psychographics: string
}

export interface BrandVoice {
  tone: string[]
  avoid: string[]
  persona: string
}

export interface BrandVisualIdentity {
  colors: BrandColor[]
  typography: BrandTypography
}

export interface BrandColor {
  name: string
  hex: string
  role: 'primary' | 'secondary' | 'accent' | 'background' | 'text'
}

export interface BrandTypography {
  heading_font: string
  body_font: string
  weights: string[]
  heading_sizes: string
}

export interface BrandMusic {
  genres: string[]
  moods: string[]
  bpm_range: { min: number; max: number }
}

export interface BrandVisualStyle {
  photography_tone: string
  subjects: string[]
  composition: string
}

export type BrandStudioTab = 'brand' | 'library' | 'create' | 'campaigns'

export type CreateSubTab = 'image' | 'video' | 'voice' | 'music' | 'script' | 'assemble'
