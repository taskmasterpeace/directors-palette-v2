/**
 * Generate diverse, whimsical background images for storybook wizard steps
 *
 * Run with: node scripts/generate-storybook-backgrounds.js
 */

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const https = require('https')
const path = require('path')

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

if (!REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN not found in .env.local')
  process.exit(1)
}

// Image prompts for each step - featuring diverse children in whimsical settings
const IMAGE_PROMPTS = [
  {
    name: 'step-character',
    prompt: 'Whimsical children\'s book illustration, a young Black girl with natural curly hair and a young Asian boy reading a magical glowing book together in a cozy treehouse, warm golden lighting, soft watercolor style, dreamy atmosphere, diverse children, heartwarming scene, storybook aesthetic, pastel colors with pops of gold',
  },
  {
    name: 'step-category',
    prompt: 'Whimsical children\'s book illustration, diverse group of children exploring - a Black boy with an afro looking through a telescope, an Asian girl with pigtails holding a magnifying glass, surrounded by floating books and stars, magical learning environment, soft pastel colors, dreamy educational scene, watercolor illustration style',
  },
  {
    name: 'step-topic',
    prompt: 'Whimsical children\'s book illustration, a young Black girl with braids discovering a magical forest with friendly cartoon animals - rabbits, deer, butterflies, and birds, enchanted woodland setting, soft dappled sunlight, watercolor style, nature exploration theme, diverse child protagonist, magical realism',
  },
  {
    name: 'step-settings',
    prompt: 'Whimsical children\'s book illustration, a mixed-race child with curly hair sitting at a magical desk with floating pages and sparkles, configuring a glowing storybook, cozy room with warm lamplight, books floating around, creative workspace, soft watercolor style, dreamy atmosphere',
  },
  {
    name: 'step-approach',
    prompt: 'Whimsical children\'s book illustration, an Asian girl with short black hair and a Black boy with locs brainstorming ideas together, lightbulbs and stars floating above their heads, magical thinking caps, colorful thought bubbles with story scenes, creative imagination theme, soft pastel watercolor style',
  },
  {
    name: 'step-review',
    prompt: 'Whimsical children\'s book illustration, a young Black girl with natural hair reading a large magical book that glows with golden light, comfortable reading nook with pillows and blankets, fairy lights, cozy atmosphere, diverse child protagonist, soft watercolor illustration, peaceful reading scene',
  },
  {
    name: 'step-style',
    prompt: 'Whimsical children\'s book illustration, diverse children painting at easels - an Asian boy, a Black girl with puffs, creating colorful artwork, paint splatters floating magically, art studio with rainbow colors, creative expression theme, soft watercolor style, joyful artistic scene',
  },
  {
    name: 'step-characters-new',
    prompt: 'Whimsical children\'s book illustration, a young Black boy with a big smile designing a character on a glowing tablet, surrounded by friendly cartoon character sketches floating around him, creative character design studio, magical sparkles, soft watercolor style, diverse protagonist',
  },
  {
    name: 'step-pages',
    prompt: 'Whimsical children\'s book illustration, an Asian girl with long black hair and a mixed-race boy watching magical illustrated pages fly around them like butterflies, each page showing a different colorful scene, enchanted library setting, soft golden light, watercolor style, sense of wonder',
  },
  {
    name: 'step-preview',
    prompt: 'Whimsical children\'s book illustration, diverse group of children - Black girl, Asian boy, mixed-race child - proudly holding up a finished glowing storybook together, magical sparkles and stars around them, celebration scene, soft watercolor style, achievement and joy theme, warm golden lighting',
  },
]

async function createPrediction(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      input: {
        prompt: prompt,
        aspect_ratio: '16:9',
        output_format: 'jpg',
        safety_filter_level: 'block_only_high',
      }
    })

    const options = {
      hostname: 'api.replicate.com',
      port: 443,
      path: '/v1/models/google/nano-banana-pro/predictions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      }
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function getPrediction(id) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.replicate.com',
      port: 443,
      path: `/v1/predictions/${id}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
      }
    }

    const req = https.request(options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      fs.unlink(filepath, () => {})
      reject(err)
    })
  })
}

async function waitForPrediction(id, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const prediction = await getPrediction(id)

    if (prediction.status === 'succeeded') {
      return prediction
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Prediction ${prediction.status}: ${prediction.error || 'Unknown error'}`)
    }

    console.log(`  Waiting... (${prediction.status})`)
    await new Promise(r => setTimeout(r, 2000))
  }

  throw new Error('Prediction timed out')
}

async function main() {
  console.log('Generating storybook background images...\n')

  const outputDir = path.join(__dirname, '..', 'public', 'storybook')

  for (const { name, prompt } of IMAGE_PROMPTS) {
    console.log(`\n📸 Generating ${name}...`)
    console.log(`   Prompt: ${prompt.substring(0, 80)}...`)

    try {
      // Create prediction
      const prediction = await createPrediction(prompt)

      if (prediction.error) {
        console.error(`   ❌ Error: ${prediction.error}`)
        continue
      }

      console.log(`   ID: ${prediction.id}`)

      // Wait for completion
      const result = await waitForPrediction(prediction.id)

      // nano-banana-pro returns output as a single URL string, not an array
      const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output
      if (imageUrl && typeof imageUrl === 'string') {
        const filepath = path.join(outputDir, `${name}.webp`)

        console.log(`   ⬇️  Downloading...`)
        await downloadImage(imageUrl, filepath)
        console.log(`   ✅ Saved to ${filepath}`)
      } else {
        console.log(`   ❌ No output generated`)
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`)
    }
  }

  console.log('\n✨ Done!')
}

main().catch(console.error)
