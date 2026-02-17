/**
 * Adhub Ad Presets
 * Hardcoded preset configurations for ad generation.
 * Each preset provides a prompt template with {placeholder} fields
 * that get filled from the product's extracted copy.
 */

import type { AdhubPreset } from '../types/adhub.types'

export const ADHUB_PRESETS: AdhubPreset[] = [
  {
    slug: 'product-hero',
    name: 'Product Hero',
    description: 'Bold, product-forward hero shot with headline and tagline overlay',
    icon: '🏆',
    promptTemplate: `Create a stunning product hero advertisement image.

Headline: "{headline}"
Tagline: "{tagline}"

Product value proposition: {valueProp}

Key features to emphasize visually: {features}

Target audience: {audience}`,
    styleModifiers: `Professional product photography style. Clean background with dramatic lighting. The product should be the clear focal point. Bold typography for headline text. Modern, premium aesthetic. High contrast with rich colors. Studio-quality composition.`,
    tags: ['hero', 'product', 'bold'],
  },
  {
    slug: 'social-story',
    name: 'Social Story',
    description: 'Vertical format optimized for Instagram Stories and Reels',
    icon: '📱',
    promptTemplate: `Design a vertical social media story advertisement.

Headline: "{headline}"
Tagline: "{tagline}"

Value proposition: {valueProp}

Highlight these features: {features}

Target audience: {audience}`,
    styleModifiers: `Social media story format. Eye-catching, scroll-stopping design. Vibrant colors with high saturation. Modern gradient backgrounds. Clean sans-serif typography. Instagram/TikTok aesthetic. Mobile-first design with large readable text. Trendy and youthful feel.`,
    tags: ['social', 'story', 'vertical'],
  },
  {
    slug: 'display-banner',
    name: 'Display Banner',
    description: 'Clean display ad with clear CTA and brand elements',
    icon: '🖼️',
    promptTemplate: `Create a professional display banner advertisement.

Headline: "{headline}"
Tagline: "{tagline}"

Product benefits: {valueProp}

Key selling points: {features}

Target demographic: {audience}`,
    styleModifiers: `Clean display advertising layout. Clear visual hierarchy with prominent headline. Professional and trustworthy design. Balanced white space. Strong call-to-action area. Corporate-friendly aesthetics. Readable typography at various sizes. Brand-consistent color usage.`,
    tags: ['display', 'banner', 'professional'],
  },
  {
    slug: 'lifestyle-scene',
    name: 'Lifestyle Scene',
    description: 'Product shown in an aspirational lifestyle context',
    icon: '🌿',
    promptTemplate: `Create a lifestyle advertisement showing the product in a real-world aspirational context.

Product headline: "{headline}"
Tagline: "{tagline}"

What makes this product special: {valueProp}

Features to subtly showcase: {features}

The ideal customer: {audience}`,
    styleModifiers: `Warm lifestyle photography style. Natural lighting with golden hour feel. Product integrated naturally into an aspirational scene. Soft bokeh backgrounds. Authentic, editorial quality. Emotionally engaging composition. Aspirational but relatable setting. Subtle brand integration.`,
    tags: ['lifestyle', 'editorial', 'warm'],
  },
  {
    slug: 'bold-minimal',
    name: 'Bold Minimal',
    description: 'High-impact minimal design with strong typography',
    icon: '⚡',
    promptTemplate: `Create a bold, minimalist advertisement with strong typographic impact.

Headline: "{headline}"
Tagline: "{tagline}"

Core message: {valueProp}

Supporting points: {features}

Audience: {audience}`,
    styleModifiers: `Ultra-minimal design. Maximum whitespace. Bold, oversized typography as the primary visual element. Limited color palette (2-3 colors max). Strong geometric shapes. High contrast. Swiss/Bauhaus-inspired layout. Premium luxury feel. Typography-driven composition.`,
    tags: ['minimal', 'bold', 'typography'],
  },
]

export function getPresetBySlug(slug: string): AdhubPreset | undefined {
  return ADHUB_PRESETS.find(p => p.slug === slug)
}
