/**
 * Seed Adhub Styles
 * Run with: npx tsx scripts/seed-adhub-styles.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SEED_STYLES = [
  {
    name: 'concept-punch-minimalism',
    display_name: 'Concept-Punch Minimalism',
    icon_url: null,
    prompt_modifiers: `A zero-fluff, one-idea ad style that lands a single insight with a visual gag or contrast. Wins by being faster than the scroll and smarter than the average post.

CORE IDEA: One sentence of truth that can be seen without reading. If the line vanished, the visual would still deliver the concept.

VISUAL STRUCTURE: Ultra-simple composition (1–2 elements max). Big subject. Big negative space. Clear figure/ground separation. Works at phone-lock size.

TYPOGRAPHY: One heavyweight display face. 3 sizes max (hook / support / logo). Brutal hierarchy. No italics, no letter-jumble tricks.

COLOR STRATEGY: High-contrast palette with 1 brand accent. Prefer flat backgrounds. Colors signal the emotion (speed, urgency, warmth) before the words do.

TONE & VOICE: Dry wit or simple certainty. Short sentences. Prefer verbs over adjectives. No qualifiers.

HOOK MECHANICS: Uses a twist, double-meaning, or time/scale comparison the brain resolves in under 1 second. The hook is the ad.

PROOF DEVICE: A tiny data point, timestamp, icon, or UI fragment that shows the claim (not a paragraph).

BRAND INTEGRATION: Logo as a stamp, not a decoration. Lands in the final 10% of the canvas. Product/feature appears only if it sharpens the idea.

CTA: One imperative verb. 2–3 words. Must read even if the viewer blinks.

SOCIAL FIT: Crops clean at 9:16 and 1:1. Legible with sound off. Works as a thumbnail.

ACCESSIBILITY: WCAG-strong contrast. No text smaller than safe-mobile minimum.

PRODUCTION: Vector silhouettes, large bitmap subject, reusable background color, grid for vertical/horizontal swaps.

AVOID: More than one idea, too many words, clever that needs explaining, weak contrast, logo fighting the hook.`,
    is_active: true,
  },
]

async function seedStyles() {
  console.log('Seeding Adhub styles...')

  for (const style of SEED_STYLES) {
    // Check if style already exists
    const { data: existing } = await supabase
      .from('adhub_styles')
      .select('id')
      .eq('name', style.name)
      .maybeSingle()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('adhub_styles')
        .update({
          display_name: style.display_name,
          icon_url: style.icon_url,
          prompt_modifiers: style.prompt_modifiers,
          is_active: style.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`Error updating style ${style.name}:`, error)
      } else {
        console.log(`✓ Updated style: ${style.display_name}`)
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('adhub_styles')
        .insert(style)

      if (error) {
        console.error(`Error inserting style ${style.name}:`, error)
      } else {
        console.log(`✓ Created style: ${style.display_name}`)
      }
    }
  }

  console.log('Done!')
}

seedStyles().catch(console.error)
