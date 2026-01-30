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
  {
    name: 'bold-testimonial',
    display_name: 'Bold Testimonial',
    icon_url: null,
    prompt_modifiers: `Social proof style where the customer quote IS the ad. Let real people sell your product.

CORE IDEA: The quote is the headline. Authenticity beats polish. A specific result beats a generic endorsement.

VISUAL STRUCTURE: Customer photo takes 40%+ of canvas. Large quotation marks frame the text. Photo and quote have clear visual connection. Works as a single glance.

TYPOGRAPHY: Quote in bold, readable serif or humanist sans. Customer name smaller but prominent. Specific metrics (numbers, timeframes) get visual emphasis. Attribution clear.

COLOR STRATEGY: Warm, approachable palette. Background complements customer photo. Avoid corporate blues. Brand color appears only in accent.

TONE & VOICE: Customer's authentic voice, not marketing speak. Keep contractions, imperfections. Specific beats generic ("lost 23 lbs" not "great results").

PROOF DEVICE: Real photo (not stock), real name, specific outcome. Optional: before/after, star rating, verification badge.

BRAND INTEGRATION: Logo minimal, bottom corner. Product appears if relevant to result. Company name in attribution only.

CTA: Soft CTAs that match testimonial tone ("See how" / "Join 10,000+" / "Try it yourself").

SOCIAL FIT: Square or portrait works best. Human face draws engagement. Mobile-optimized text size.

ACCESSIBILITY: High contrast for quote text. Photo cropped for focus on face. Alt text describes customer.

AVOID: Generic praise, stock photos, long paragraphs, corporate speak, logo competing with customer, vague outcomes.`,
    is_active: true,
  },
  {
    name: 'product-spotlight',
    display_name: 'Product Spotlight',
    icon_url: null,
    prompt_modifiers: `Clean product photography with minimal text. The product is the hero. Let it speak.

CORE IDEA: Product as sculpture. One perfect shot sells better than ten paragraphs. The image creates desire.

VISUAL STRUCTURE: Product centered with 70%+ negative space. Single dramatic angle. Premium studio feel. Clear shadows show depth. No visual clutter.

TYPOGRAPHY: Product name only if essential. Price displayed cleanly. One word or short phrase max. Typography is secondary to image.

COLOR STRATEGY: Background chosen to make product pop. Gradient or solid preferred. Studio lighting look. Brand color in subtle accent only.

TONE & VOICE: Visual silence. Let product quality communicate. If text exists, it's minimal ("$49" / "New" / "Shop").

PROOF DEVICE: The product itself is the proof. Quality of photography signals quality of product. Optional: bestseller badge, rating stars.

BRAND INTEGRATION: Logo as small watermark or omitted. Brand identity through product design and photo style, not graphics.

CTA: Price is the CTA. "Shop" button sufficient. No elaborate copy needed.

SOCIAL FIT: Works at any ratio. Product detail crops well. Thumb-stopping simplicity.

ACCESSIBILITY: Product clearly visible. High contrast between product and background. Simple composition.

PRODUCTION: Professional product photography essential. Consistent lighting. Subtle reflections. Clean edges.

AVOID: Multiple products, busy backgrounds, too much text, decorative elements, clip art, overlapping graphics.`,
    is_active: true,
  },
  {
    name: 'urgency-flash',
    display_name: 'Urgency Flash',
    icon_url: null,
    prompt_modifiers: `Time-sensitive promotions with real deadlines. Creates action through genuine scarcity.

CORE IDEA: Deadline is the message. Real urgency, not fake scarcity. The clock is ticking and the viewer feels it.

VISUAL STRUCTURE: Countdown or deadline as primary visual element. Numbers displayed HUGE. High-energy composition. Visual tension through color and scale.

TYPOGRAPHY: Numbers dominant (50% OFF, 24 HOURS, ENDS TONIGHT). Bold condensed faces. Stacked for impact. Deadline impossible to miss.

COLOR STRATEGY: High-energy palette: reds, oranges, electric yellows. Black for contrast. Flash sale energy. Colors create urgency before reading.

TONE & VOICE: Direct, punchy, no fluff. Active verbs: SAVE, GET, GRAB. Time references: NOW, TODAY, LAST CHANCE. Numbers everywhere.

PROOF DEVICE: Real deadline (date/time), specific savings amount, stock count if genuine. Authenticity matters.

BRAND INTEGRATION: Logo present but not competing. Brand colors adapted to urgency palette. Sale branding consistent.

CTA: Action-oriented: "Shop Now" / "Claim Yours" / "Don't Miss Out". Button prominent.

SOCIAL FIT: Works best portrait 9:16 or square. Scannable in feed. Numbers read at any size.

ACCESSIBILITY: Numbers high contrast. Deadline clearly legible. Don't rely only on color for urgency.

AVOID: Fake urgency, extended "ending soon" periods, cluttered countdown widgets, too many competing messages, illegible small print.`,
    is_active: true,
  },
  {
    name: 'lifestyle-aspiration',
    display_name: 'Lifestyle Aspiration',
    icon_url: null,
    prompt_modifiers: `Emotional brand storytelling. Sell the feeling, not the features. The lifestyle is the product.

CORE IDEA: Show the life your customer wants to live. Product is the bridge to that life. Emotion drives action.

VISUAL STRUCTURE: Lifestyle scene dominates 80%+ of canvas. Product integrated naturally, not central. Real moments, not staged poses. Aspirational but achievable.

TYPOGRAPHY: Minimal, poetic. Short phrases over headlines. Text secondary to image. Soft, elegant fonts.

COLOR STRATEGY: Warm, inviting palette. Natural tones preferred. Golden hour aesthetics. Lifestyle-appropriate mood.

TONE & VOICE: Evocative, not descriptive. Questions welcome. Future-focused ("Imagine..." / "This could be..."). Feeling over features.

PROOF DEVICE: The scene itself. Authentic moments resonate. Real people in real situations (or convincingly so).

BRAND INTEGRATION: Product visible but not hero. Logo as gentle presence. Brand values expressed through scene selection.

CTA: Soft invitations: "Discover" / "Explore" / "Learn More". No hard sell. Journey begins here.

SOCIAL FIT: Cinematic ratios work well. Square for feed impact. Story-worthy composition.

ACCESSIBILITY: Scene readable at small size. Focus on human elements. Clear focal point.

PRODUCTION: Lifestyle photography or cinematic renders. Warm lighting. Depth of field. Magazine quality.

AVOID: Product as centerpiece, hard selling, feature lists, corporate models, obvious stock photos, cluttered compositions.`,
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
