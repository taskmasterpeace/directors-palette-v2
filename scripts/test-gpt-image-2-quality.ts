/**
 * GPT Image 2 quality tier comparison
 *
 * Runs the same prompt at low / medium / high in parallel on Replicate,
 * saves the outputs side-by-side, and logs timing + cost per tier.
 *
 * Replicate pricing (openai/gpt-image-2, verified 2026-04-22):
 *   low    ~ $0.01
 *   medium ~ $0.05
 *   high   ~ $0.19
 *
 * Usage:
 *   npx tsx scripts/test-gpt-image-2-quality.ts "your prompt here"
 *   npx tsx scripts/test-gpt-image-2-quality.ts "your prompt" --aspect 3:2
 *
 * Outputs to test-assets/gpt-image-2-quality/<slug>-<tier>.<ext>
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.join(process.cwd(), '.env.local') })

import Replicate from 'replicate'
import fs from 'fs'
import https from 'https'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

type Quality = 'low' | 'medium' | 'high'
const TIERS: Quality[] = ['low', 'medium', 'high']

const REPLICATE_COST: Record<Quality, number> = {
  low: 0.01,
  medium: 0.05,
  high: 0.19,
}

// Parse CLI args
const args = process.argv.slice(2)
const prompt = args.find((a) => !a.startsWith('--'))
const aspectIdx = args.indexOf('--aspect')
const aspect = aspectIdx >= 0 ? args[aspectIdx + 1] : '3:2'

if (!prompt) {
  console.error('Usage: npx tsx scripts/test-gpt-image-2-quality.ts "your prompt" [--aspect 1:1|3:2|2:3]')
  process.exit(1)
}

const outDir = path.join(process.cwd(), 'test-assets', 'gpt-image-2-quality')
fs.mkdirSync(outDir, { recursive: true })

// Filename slug from prompt (first 5 words, sanitized)
const slug = prompt
  .split(/\s+/)
  .slice(0, 5)
  .join('-')
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '')
  .slice(0, 50)

function download(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    https
      .get(url, (response) => {
        response.pipe(file)
        file.on('finish', () => file.close(() => resolve()))
      })
      .on('error', (err) => {
        fs.unlinkSync(destPath)
        reject(err)
      })
  })
}

async function runTier(quality: Quality) {
  const startedAt = Date.now()
  console.log(`[${quality}] starting…`)

  try {
    const output = await replicate.run('openai/gpt-image-2', {
      input: {
        prompt,
        aspect_ratio: aspect,
        quality,
        output_format: 'png',
        number_of_images: 1,
      },
    })

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)

    // Replicate SDK returns FileOutput[] for this model — pull the URL
    const urls: string[] = Array.isArray(output)
      ? output.map((o: unknown) => (typeof o === 'string' ? o : (o as { url: () => URL }).url().toString()))
      : [typeof output === 'string' ? output : (output as { url: () => URL }).url().toString()]

    const imageUrl = urls[0]
    const ext = (imageUrl.split('.').pop() || 'png').split('?')[0]
    const destPath = path.join(outDir, `${slug}-${quality}.${ext}`)
    await download(imageUrl, destPath)

    const sizeKb = (fs.statSync(destPath).size / 1024).toFixed(1)
    console.log(`[${quality}] ✓ ${elapsed}s  $${REPLICATE_COST[quality].toFixed(2)}  ${sizeKb}KB  ${destPath}`)

    return { quality, elapsed: Number(elapsed), path: destPath, sizeKb: Number(sizeKb), url: imageUrl }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${quality}] ✗ FAILED: ${msg}`)
    return { quality, error: msg }
  }
}

async function main() {
  console.log(`\nPrompt: "${prompt}"`)
  console.log(`Aspect: ${aspect}`)
  console.log(`Output: ${outDir}\n`)

  const results = await Promise.all(TIERS.map(runTier))

  console.log('\n─── Summary ───')
  const totalCost = results.reduce((sum, r) => {
    return 'error' in r ? sum : sum + REPLICATE_COST[r.quality]
  }, 0)
  console.log(`Total Replicate cost: $${totalCost.toFixed(2)}`)
  console.log(`Files saved to: ${outDir}`)

  // Print side-by-side opens hint for Windows
  const successful = results.filter((r): r is Extract<typeof r, { path: string }> => 'path' in r)
  if (successful.length > 0) {
    console.log('\nOpen all three:')
    console.log(`  start "" "${successful.map((r) => r.path).join('" "')}"`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
