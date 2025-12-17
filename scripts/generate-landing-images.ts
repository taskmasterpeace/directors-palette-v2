/**
 * Generate Landing Page Images using Nano-Banana model
 *
 * This script generates showcase images for the landing page
 * Run with: npx ts-node scripts/generate-landing-images.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface GenerationResult {
  predictionId: string
  galleryId: string
  status: string
  imageUrl?: string
}

// Landing page image prompts
const landingImages = [
  {
    name: 'style-cinematic',
    prompt: 'Cinematic wide shot of a lone figure standing on a cliff overlooking a vast ocean at golden hour, dramatic lighting, film grain, anamorphic lens flare, professional cinematography',
    aspectRatio: '16:9',
    outputPath: 'public/landing/style-cinematic.png'
  },
  {
    name: 'style-anime',
    prompt: 'Anime style portrait of a young samurai warrior with flowing black hair, cherry blossoms falling, Studio Ghibli inspired, soft lighting, detailed eyes, vibrant colors',
    aspectRatio: '1:1',
    outputPath: 'public/landing/style-anime.png'
  },
  {
    name: 'style-noir',
    prompt: 'Film noir style detective in a rainy city alley at night, dramatic shadows, venetian blind lighting, high contrast black and white, 1940s aesthetic, fedora hat, cigarette smoke',
    aspectRatio: '16:9',
    outputPath: 'public/landing/style-noir.png'
  },
  {
    name: 'style-fantasy',
    prompt: 'Epic fantasy landscape with floating islands, magical waterfalls cascading into clouds, ancient ruins, dragons in the distance, volumetric god rays, matte painting style',
    aspectRatio: '16:9',
    outputPath: 'public/landing/style-fantasy.png'
  },
  {
    name: 'style-scifi',
    prompt: 'Cyberpunk city street at night, neon signs in Japanese, rain reflections on wet pavement, holographic advertisements, flying vehicles, Blade Runner inspired, atmospheric fog',
    aspectRatio: '16:9',
    outputPath: 'public/landing/style-scifi.png'
  },
  {
    name: 'style-portrait',
    prompt: 'Professional portrait of a confident businesswoman in modern office, soft natural window light, shallow depth of field, warm tones, editorial photography style',
    aspectRatio: '3:4',
    outputPath: 'public/landing/style-portrait.png'
  },
  {
    name: 'hero-storyboard',
    prompt: 'Behind the scenes of a film production, director looking at storyboard sketches, film equipment visible, professional studio lighting, documentary style',
    aspectRatio: '16:9',
    outputPath: 'public/landing/hero-storyboard.png'
  },
  {
    name: 'showcase-1',
    prompt: 'Close-up portrait of an elderly man with weathered face, wise eyes, dramatic Rembrandt lighting, photorealistic, cinematic color grading',
    aspectRatio: '1:1',
    outputPath: 'public/landing/showcase-1.png'
  },
  {
    name: 'showcase-2',
    prompt: 'Medium shot of a young woman in vintage 1950s dress walking through a sunlit meadow, soft focus background, film photography aesthetic, warm golden tones',
    aspectRatio: '16:9',
    outputPath: 'public/landing/showcase-2.png'
  },
  {
    name: 'showcase-3',
    prompt: 'Wide establishing shot of a small coastal village at dawn, fishing boats in harbor, morning mist, pastel colors, peaceful atmosphere, travel photography',
    aspectRatio: '16:9',
    outputPath: 'public/landing/showcase-3.png'
  }
]

async function generateImage(prompt: string, aspectRatio: string): Promise<string | null> {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      prompt,
      model: 'nano-banana',
      aspectRatio,
      numImages: 1
    })

    const url = new URL(`${API_BASE}/api/generation/image`)
    const isHttps = url.protocol === 'https:'
    const httpModule = isHttps ? https : http

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        // You'll need to add auth header for production
        // 'Authorization': `Bearer ${process.env.API_KEY}`
      }
    }

    console.log(`Generating: ${prompt.slice(0, 50)}...`)

    const req = httpModule.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => body += chunk)
      res.on('end', () => {
        try {
          const result: GenerationResult = JSON.parse(body)
          if (result.imageUrl) {
            console.log(`✓ Generated: ${result.imageUrl}`)
            resolve(result.imageUrl)
          } else {
            console.log(`⏳ Generation started: ${result.predictionId}`)
            // In production, would poll for completion
            resolve(null)
          }
        } catch (e) {
          console.error('Parse error:', e)
          resolve(null)
        }
      })
    })

    req.on('error', (e) => {
      console.error('Request error:', e)
      resolve(null)
    })

    req.write(data)
    req.end()
  })
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const fullPath = path.join(process.cwd(), outputPath)
    const dir = path.dirname(fullPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const file = fs.createWriteStream(fullPath)
    const httpModule = url.startsWith('https') ? https : http

    httpModule.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        console.log(`✓ Saved: ${outputPath}`)
        resolve(true)
      })
    }).on('error', (err) => {
      fs.unlink(fullPath, () => {})
      console.error(`✗ Download failed: ${err.message}`)
      resolve(false)
    })
  })
}

async function main() {
  console.log('🎬 Directors Palette - Landing Image Generator')
  console.log('=' .repeat(50))
  console.log('')

  // Ensure output directory exists
  const landingDir = path.join(process.cwd(), 'public/landing')
  if (!fs.existsSync(landingDir)) {
    fs.mkdirSync(landingDir, { recursive: true })
  }

  console.log('Note: This script requires authentication to work.')
  console.log('For local testing, generate images manually in the app.')
  console.log('')
  console.log('Prompts to use:')
  console.log('-'.repeat(50))

  for (const image of landingImages) {
    console.log(`\n📸 ${image.name}`)
    console.log(`   Aspect: ${image.aspectRatio}`)
    console.log(`   Output: ${image.outputPath}`)
    console.log(`   Prompt: ${image.prompt}`)
  }

  console.log('\n')
  console.log('=' .repeat(50))
  console.log('Copy these prompts into Shot Creator to generate images!')
  console.log('Use nano-banana model for fast, high-quality results.')
}

main().catch(console.error)
