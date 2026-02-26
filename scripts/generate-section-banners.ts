/**
 * Generate Section Header Banners
 *
 * Generates cinematic header banners for each navigation section
 * Uses seedream-5-lite model for quick, cost-effective generation
 *
 * Run with: npx tsx scripts/generate-section-banners.ts
 */

import 'dotenv/config'
import Replicate from 'replicate'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface SectionBanner {
  id: string
  name: string
  prompt: string
  filename: string
}

// Banner definitions with cinematic prompts
const SECTION_BANNERS: SectionBanner[] = [
  {
    id: 'shot-creator',
    name: 'Shot Creator',
    prompt: 'abstract cinematic film reel dissolving into magical golden particles and sparkles, dark moody background with subtle purple and amber gradients, professional photography lighting, ultra-wide composition, dramatic film noir aesthetic',
    filename: 'shot-creator-banner.webp'
  },
  {
    id: 'shot-animator',
    name: 'Shot Animator',
    prompt: 'flowing film strips transforming into fluid motion waves, cinematic frame sequences floating in space, dark cosmic background with blue and cyan glows, professional movie production aesthetic, ultra-wide banner composition',
    filename: 'shot-animator-banner.webp'
  },
  {
    id: 'canvas-editor',
    name: 'Canvas Editor',
    prompt: 'abstract artistic canvas with flowing paint strokes and geometric frames overlapping, professional design studio aesthetic, dark background with vibrant gradient accents of violet and teal, minimalist modern composition, ultra-wide',
    filename: 'canvas-editor-banner.webp'
  },
  {
    id: 'storyboard',
    name: 'Storyboard',
    prompt: 'elegant open sketchbook with storyboard panels floating upward, pencil sketches transforming into cinematic shots, warm amber lighting on dark background, professional filmmaking aesthetic, ultra-wide composition',
    filename: 'storyboard-banner.webp'
  },
  {
    id: 'music-lab',
    name: 'Music Lab',
    prompt: 'abstract sound waves and music notes flowing through space, equalizer bars dissolving into particles, dark studio background with vibrant pink and purple gradients, professional audio production aesthetic, ultra-wide banner',
    filename: 'music-lab-banner.webp'
  },
  {
    id: 'prompt-tools',
    name: 'Prompt Tools',
    prompt: 'glowing laboratory flask with swirling creative energy inside, abstract code and text elements floating around, dark scientific aesthetic with green and cyan accents, professional experimental atmosphere, ultra-wide composition',
    filename: 'prompt-tools-banner.webp'
  },
  {
    id: 'gallery',
    name: 'Gallery',
    prompt: 'elegant floating photo frames arranged in infinite perspective, professional gallery exhibition lighting on dark background, subtle golden and silver metallic accents, museum exhibition aesthetic, ultra-wide panoramic composition',
    filename: 'gallery-banner.webp'
  },
  {
    id: 'community',
    name: 'Community',
    prompt: 'abstract network of connected glowing nodes representing community, collaborative creative energy flowing between points, dark background with warm amber and social purple gradients, professional social platform aesthetic, ultra-wide',
    filename: 'community-banner.webp'
  },
  {
    id: 'help',
    name: 'Help & Manual',
    prompt: 'elegant open book with glowing pages and floating question marks transforming into lightbulbs, helpful guidance aesthetic, dark background with soft blue and white gradients, professional documentation aesthetic, ultra-wide banner',
    filename: 'help-banner.webp'
  }
]

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'banners')

async function generateBanner(section: SectionBanner): Promise<string | null> {
  console.log(`\n🎨 Generating banner for: ${section.name}`)
  console.log(`   Prompt: ${section.prompt.substring(0, 60)}...`)

  try {
    const output = await replicate.run(
      'bytedance/seedream-5-lite' as `${string}/${string}`,
      {
        input: {
          prompt: section.prompt,
          aspect_ratio: '21:9',
          output_format: 'webp',
          output_quality: 90
        }
      }
    )

    // Get image data from output - handle FileOutput objects
    let buffer: Buffer | null = null

    // Cast output to unknown first for safer type narrowing
    const result = output as unknown

    // FileOutput has a read() method that returns the blob
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      // Check if it's a FileOutput with read() method
      if ('read' in result && typeof (result as { read: () => Promise<Blob> }).read === 'function') {
        const blob = await (result as { read: () => Promise<Blob> }).read()
        buffer = Buffer.from(await blob.arrayBuffer())
        console.log(`   📦 Read from FileOutput blob, size: ${buffer.length}`)
      }
      // Check for url() method
      else if ('url' in result && typeof (result as { url: () => URL }).url === 'function') {
        const imageUrl = (result as { url: () => URL }).url().toString()
        const response = await fetch(imageUrl)
        if (response.ok) {
          buffer = Buffer.from(await response.arrayBuffer())
        }
      }
    }
    // Handle string URL
    else if (typeof result === 'string') {
      const response = await fetch(result)
      if (response.ok) {
        buffer = Buffer.from(await response.arrayBuffer())
      }
    }
    // Handle array (list of URLs)
    else if (Array.isArray(result) && result.length > 0) {
      const firstItem = result[0]
      if (typeof firstItem === 'string') {
        const response = await fetch(firstItem)
        if (response.ok) {
          buffer = Buffer.from(await response.arrayBuffer())
        }
      } else if (firstItem && typeof firstItem === 'object' && 'read' in firstItem) {
        const blob = await (firstItem as { read: () => Promise<Blob> }).read()
        buffer = Buffer.from(await blob.arrayBuffer())
      }
    }

    if (!buffer) {
      console.error(`   ❌ Could not extract image data`)
      return null
    }
    const outputPath = path.join(OUTPUT_DIR, section.filename)
    fs.writeFileSync(outputPath, buffer)

    console.log(`   ✅ Saved: ${section.filename}`)
    return outputPath
  } catch (error) {
    console.error(`   ❌ Error:`, error instanceof Error ? error.message : error)
    return null
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║   Director\'s Palette - Banner Generator       ║')
  console.log('╚════════════════════════════════════════════════╝')

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log(`\n📁 Created output directory: ${OUTPUT_DIR}`)
  }

  console.log(`\n📊 Generating ${SECTION_BANNERS.length} banners...`)
  console.log(`   Cost: ~${SECTION_BANNERS.length * 4} points (4 pts each with seedream-5-lite)`)

  const results: { section: string; path: string | null }[] = []

  for (const section of SECTION_BANNERS) {
    const result = await generateBanner(section)
    results.push({ section: section.name, path: result })
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════')
  console.log('📊 Generation Summary:')
  const successful = results.filter(r => r.path !== null)
  const failed = results.filter(r => r.path === null)

  console.log(`   ✅ Successful: ${successful.length}`)
  if (failed.length > 0) {
    console.log(`   ❌ Failed: ${failed.length}`)
    failed.forEach(f => console.log(`      - ${f.section}`))
  }

  console.log('\n🎬 Done!')
}

main().catch(console.error)
