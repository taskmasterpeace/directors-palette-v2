/**
 * Upload LoRAs to Supabase Storage and create community items
 * Run: node scripts/upload-loras.js
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'directors-palette'
const DOWNLOADS = 'C:/Users/taskm/Downloads'

const LORAS = [
  {
    name: 'Poster Movie',
    slug: 'poster-movie',
    triggerWord: 'Poster Movie.',
    referenceTag: 'poster-movie',
    weightsFile: '[ZImage.Turbo]PosterMovie_Redmond.safetensors',
    thumbnailFile: null, // No thumbnail provided
    category: 'style',
    description: 'Cinematic movie poster style. Creates dramatic, professional-looking movie poster compositions with bold typography-ready layouts.',
    defaultLoraScale: 1.0,
    defaultGuidanceScale: 1.0,
  },
  {
    name: 'Childish',
    slug: 'childish',
    triggerWord: 'a childish crayon drawing',
    referenceTag: 'childish',
    weightsFile: 'Childish01_CE_ZIMGT_AIT3k.safetensors',
    thumbnailFile: 'images/af55524d-f399-4c96-8b19-7153cdb34ee5.png',
    category: 'style',
    description: 'Childlike crayon drawing style. Transforms images into charming, hand-drawn crayon artwork with a playful, innocent quality.',
    defaultLoraScale: 1.0,
    defaultGuidanceScale: 1.0,
  },
  {
    name: 'Impressionism',
    slug: 'impressionism',
    triggerWord: 'ArsMJStyle, Impressionism',
    referenceTag: 'impressionism',
    weightsFile: 'ImpressionismZ_3000.safetensors',
    thumbnailFile: null, // No thumbnail provided
    category: 'style',
    description: 'Impressionist painting style. Visible effects start at 0.4+, works great in the 0.6-1.5 range. Quality tags and negatives reduce the effect.',
    defaultLoraScale: 0.8,
    defaultGuidanceScale: 1.0,
  },
  {
    name: 'C64 Pixel Art',
    slug: 'c64-pixel-art',
    triggerWord: 'C64style pixel art',
    referenceTag: 'c64',
    weightsFile: 'C64style_Z-Image_Turbo.safetensors',
    thumbnailFile: 'images/c64.png',
    category: 'style',
    description: 'Commodore 64 retro pixel art style. Creates authentic 8-bit pixel art reminiscent of classic C64 computer graphics.',
    defaultLoraScale: 1.0,
    defaultGuidanceScale: 1.0,
  },
  {
    name: 'Sat Morn Cartoon',
    slug: 'sat-morn-cartoon',
    triggerWord: 'smcstyle cartoon',
    referenceTag: 'smc',
    weightsFile: 'SaturdayMorningCartoons-Style-ZIT-Lora.safetensors',
    thumbnailFile: null, // No thumbnail provided
    category: 'style',
    description: 'Saturday morning cartoon style. Recreates the classic hand-drawn animation look of 80s/90s Saturday morning cartoons. Use "smcstyle" as additional trigger.',
    defaultLoraScale: 1.0,
    defaultGuidanceScale: 1.0,
  },
]

async function uploadFile(localPath, storagePath, contentType) {
  console.log(`   Uploading ${path.basename(localPath)} (${(fs.statSync(localPath).size / 1024 / 1024).toFixed(1)}MB)...`)
  const fileBuffer = fs.readFileSync(localPath)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    console.error(`   FAILED: ${error.message}`)
    return null
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  console.log(`   OK: ${urlData.publicUrl.slice(0, 80)}...`)
  return urlData.publicUrl
}

async function main() {
  console.log('=== LoRA Upload Script ===\n')

  for (const lora of LORAS) {
    console.log(`\n--- ${lora.name} ---`)

    // 1. Upload weights
    const weightsPath = path.join(DOWNLOADS, lora.weightsFile)
    if (!fs.existsSync(weightsPath)) {
      console.error(`   Weights file not found: ${weightsPath}`)
      continue
    }

    const weightsUrl = await uploadFile(
      weightsPath,
      `loras/${lora.slug}/${lora.slug}_weights.safetensors`,
      'application/octet-stream'
    )
    if (!weightsUrl) continue

    // 2. Upload thumbnail if exists
    let thumbnailUrl = null
    if (lora.thumbnailFile) {
      const thumbPath = path.join(DOWNLOADS, lora.thumbnailFile)
      if (fs.existsSync(thumbPath)) {
        thumbnailUrl = await uploadFile(
          thumbPath,
          `loras/${lora.slug}/${lora.slug}_thumbnail.png`,
          'image/png'
        )
      } else {
        console.log(`   No thumbnail file found at ${thumbPath}`)
      }
    } else {
      console.log('   No thumbnail provided, skipping')
    }

    // 3. Insert community item (approved, admin-submitted)
    const communityItem = {
      type: 'lora',
      name: lora.name,
      description: lora.description,
      category: lora.category,
      tags: ['style', 'z-image-turbo', lora.slug],
      content: {
        loraType: 'style',
        triggerWord: lora.triggerWord,
        referenceTag: lora.referenceTag,
        weightsUrl,
        thumbnailUrl,
        defaultGuidanceScale: lora.defaultGuidanceScale,
        defaultLoraScale: lora.defaultLoraScale,
      },
      submitted_by: null,
      submitted_by_name: 'Director\'s Palette',
      status: 'approved',
      approved_at: new Date().toISOString(),
      is_featured: false,
      add_count: 0,
      rating_sum: 0,
      rating_count: 0,
    }

    const { data, error } = await supabase
      .from('community_items')
      .insert(communityItem)
      .select('id, name, type')
      .single()

    if (error) {
      console.error(`   DB insert FAILED: ${error.message}`)
      continue
    }

    console.log(`   Community item created: ${data.id} (${data.name})`)
  }

  console.log('\n=== Done! ===')
}

main().catch(e => console.error('Fatal:', e.message))
