/**
 * Seed Adhub Templates
 * Run with: npx tsx scripts/seed-adhub-templates.ts
 *
 * Creates 4 public starter templates for Adhub
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// System user ID for public templates (null user_id for system templates)
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000'

interface TemplateField {
  field_type: 'text' | 'image'
  field_name: string
  field_label: string
  is_required: boolean
  placeholder?: string
  field_order: number
}

interface SeedTemplate {
  name: string
  goal_prompt: string
  is_public: boolean
  fields: TemplateField[]
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: 'Quick Sale Promo',
    goal_prompt: `Create a promotional ad for {{product_name}} with {{discount_percent}}% off.
The ad should create urgency and drive immediate action.
Use the product image as the hero element.
CTA: {{cta_text}}`,
    is_public: true,
    fields: [
      {
        field_type: 'text',
        field_name: 'product_name',
        field_label: 'Product Name',
        is_required: true,
        placeholder: 'e.g., Premium Wireless Headphones',
        field_order: 0,
      },
      {
        field_type: 'text',
        field_name: 'discount_percent',
        field_label: 'Discount Percentage',
        is_required: true,
        placeholder: 'e.g., 25',
        field_order: 1,
      },
      {
        field_type: 'text',
        field_name: 'cta_text',
        field_label: 'Call to Action',
        is_required: false,
        placeholder: 'e.g., Shop Now, Get Yours, Claim Deal',
        field_order: 2,
      },
      {
        field_type: 'image',
        field_name: 'product_image',
        field_label: 'Product Image',
        is_required: false,
        placeholder: 'Upload or paste product image URL',
        field_order: 3,
      },
    ],
  },
  {
    name: 'Testimonial Card',
    goal_prompt: `Create a testimonial-style ad featuring a customer quote.
Quote: "{{customer_quote}}"
Customer: {{customer_name}}
Result: {{result_metric}}
The customer photo should be prominent and the quote should feel authentic and specific.`,
    is_public: true,
    fields: [
      {
        field_type: 'text',
        field_name: 'customer_quote',
        field_label: 'Customer Quote',
        is_required: true,
        placeholder: 'e.g., This product changed my morning routine completely!',
        field_order: 0,
      },
      {
        field_type: 'text',
        field_name: 'customer_name',
        field_label: 'Customer Name',
        is_required: true,
        placeholder: 'e.g., Sarah M., Austin TX',
        field_order: 1,
      },
      {
        field_type: 'text',
        field_name: 'result_metric',
        field_label: 'Result/Metric (optional)',
        is_required: false,
        placeholder: 'e.g., Lost 23 lbs in 3 months',
        field_order: 2,
      },
      {
        field_type: 'image',
        field_name: 'customer_photo',
        field_label: 'Customer Photo',
        is_required: false,
        placeholder: 'Upload customer photo for authenticity',
        field_order: 3,
      },
    ],
  },
  {
    name: 'Product Launch',
    goal_prompt: `Create a product launch announcement ad for {{product_name}}.
Key benefit: {{key_benefit}}
Launch date: {{launch_date}}
Build anticipation and excitement. The product should be showcased prominently with premium feel.`,
    is_public: true,
    fields: [
      {
        field_type: 'text',
        field_name: 'product_name',
        field_label: 'Product Name',
        is_required: true,
        placeholder: 'e.g., AirPods Max 2',
        field_order: 0,
      },
      {
        field_type: 'text',
        field_name: 'key_benefit',
        field_label: 'Key Benefit',
        is_required: true,
        placeholder: 'e.g., 40-hour battery life',
        field_order: 1,
      },
      {
        field_type: 'text',
        field_name: 'launch_date',
        field_label: 'Launch Date',
        is_required: false,
        placeholder: 'e.g., Coming March 15',
        field_order: 2,
      },
      {
        field_type: 'image',
        field_name: 'product_image',
        field_label: 'Product Image',
        is_required: false,
        placeholder: 'Upload product image',
        field_order: 3,
      },
    ],
  },
  {
    name: 'Brand Awareness',
    goal_prompt: `Create a brand awareness ad that evokes emotion and aspiration.
Tagline: {{tagline}}
Value proposition: {{value_prop}}
Focus on lifestyle and feeling rather than features. The hero image should dominate and the product/brand should be subtly integrated.`,
    is_public: true,
    fields: [
      {
        field_type: 'text',
        field_name: 'tagline',
        field_label: 'Tagline',
        is_required: true,
        placeholder: 'e.g., Live Your Best Life',
        field_order: 0,
      },
      {
        field_type: 'text',
        field_name: 'value_prop',
        field_label: 'Value Proposition',
        is_required: false,
        placeholder: 'e.g., Premium comfort meets sustainable style',
        field_order: 1,
      },
      {
        field_type: 'image',
        field_name: 'hero_image',
        field_label: 'Hero/Lifestyle Image',
        is_required: false,
        placeholder: 'Upload aspirational lifestyle image',
        field_order: 2,
      },
    ],
  },
]

async function seedTemplates() {
  console.log('Seeding Adhub templates...\n')

  for (const template of SEED_TEMPLATES) {
    // Check if template already exists by name (for public templates)
    const { data: existing } = await supabase
      .from('adhub_templates')
      .select('id')
      .eq('name', template.name)
      .eq('is_public', true)
      .maybeSingle()

    if (existing) {
      console.log(`⏭️  Template "${template.name}" already exists, updating...`)

      // Update existing template
      const { error: updateError } = await supabase
        .from('adhub_templates')
        .update({
          goal_prompt: template.goal_prompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error(`  Error updating template: ${updateError.message}`)
        continue
      }

      // Delete existing fields and re-create
      await supabase
        .from('adhub_template_fields')
        .delete()
        .eq('template_id', existing.id)

      // Insert updated fields
      const fieldsToInsert = template.fields.map(field => ({
        ...field,
        template_id: existing.id,
      }))

      const { error: fieldsError } = await supabase
        .from('adhub_template_fields')
        .insert(fieldsToInsert)

      if (fieldsError) {
        console.error(`  Error updating fields: ${fieldsError.message}`)
      } else {
        console.log(`  ✓ Updated with ${template.fields.length} fields`)
      }
    } else {
      // Create new template
      const { data: newTemplate, error: insertError } = await supabase
        .from('adhub_templates')
        .insert({
          user_id: SYSTEM_USER_ID,
          name: template.name,
          goal_prompt: template.goal_prompt,
          is_public: template.is_public,
        })
        .select('id')
        .single()

      if (insertError || !newTemplate) {
        console.error(`❌ Error creating template "${template.name}": ${insertError?.message}`)
        continue
      }

      console.log(`✓ Created template: ${template.name}`)

      // Insert fields
      const fieldsToInsert = template.fields.map(field => ({
        ...field,
        template_id: newTemplate.id,
      }))

      const { error: fieldsError } = await supabase
        .from('adhub_template_fields')
        .insert(fieldsToInsert)

      if (fieldsError) {
        console.error(`  Error creating fields: ${fieldsError.message}`)
      } else {
        console.log(`  ✓ Added ${template.fields.length} fields`)
      }
    }
  }

  console.log('\n✅ Template seeding complete!')

  // Show summary
  const { data: templates } = await supabase
    .from('adhub_templates')
    .select('id, name, is_public')
    .eq('is_public', true)

  console.log(`\nPublic templates available: ${templates?.length || 0}`)
  templates?.forEach(t => console.log(`  - ${t.name}`))
}

seedTemplates().catch(console.error)
