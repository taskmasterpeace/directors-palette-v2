/**
 * Banner Generation Script
 * Generates cinematic banners for section headers and sidebar background
 *
 * Usage: npx tsx scripts/generate-banners.ts
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import Replicate from 'replicate';
import fs from 'fs';
import https from 'https';
import http from 'http';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Banner configurations
const BANNERS = [
  {
    name: 'shot-creator',
    prompt: 'Abstract cinematic film strip, camera lens flares, bokeh lights, deep purple and gold tones, professional photography studio aesthetic, wide panoramic, horizontal banner format',
    width: 1920,
    height: 256,
  },
  {
    name: 'storyboard',
    prompt: 'Abstract storyboard sketches, pencil lines, film frames, vintage paper texture, soft amber and sepia tones, artistic drawing concept, wide panoramic horizontal',
    width: 1920,
    height: 256,
  },
  {
    name: 'music-lab',
    prompt: 'Abstract sound waves, audio waveform visualization, neon blue and purple, music production aesthetic, equalizer bars, wide panoramic horizontal',
    width: 1920,
    height: 256,
  },
  {
    name: 'gallery',
    prompt: 'Abstract photo gallery frames, floating polaroid images, soft light rays, elegant white and silver tones, museum aesthetic, wide panoramic horizontal',
    width: 1920,
    height: 256,
  },
  {
    name: 'canvas-editor',
    prompt: 'Abstract digital canvas, paint brush strokes, geometric shapes, creative tools, vibrant cyan and magenta accents, digital art aesthetic, wide panoramic horizontal',
    width: 1920,
    height: 256,
  },
  {
    name: 'prompt-tools',
    prompt: 'Abstract text and typography, floating words, ai neural network nodes, soft green matrix code aesthetic, futuristic tech vibe, wide panoramic horizontal',
    width: 1920,
    height: 256,
  },
  {
    name: 'sidebar',
    prompt: 'Abstract dark cinematic gradient, subtle film grain, deep navy and purple vertical flow, elegant minimal, stars and soft bokeh lights, tall vertical format',
    width: 320,
    height: 1080,
  },
];

// Download image from URL
async function downloadImage(url: string, filepath: string): Promise<void> {
  // Use fetch API for simpler cross-platform support
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filepath, buffer);
}

async function generateBanner(config: typeof BANNERS[0]): Promise<string | null> {
  console.log(`\n🎨 Generating banner: ${config.name}`);
  console.log(`   Prompt: ${config.prompt.substring(0, 60)}...`);
  console.log(`   Size: ${config.width}x${config.height}`);

  try {
    // Use flux-schnell for fast generation
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: config.prompt,
          go_fast: true,
          num_outputs: 1,
          aspect_ratio: config.width > config.height ? "16:9" : "9:16",
          output_format: "webp",
          output_quality: 90,
        }
      }
    );

    // Get the output URL - handle both string array and FileOutput object
    let imageUrl: string;
    if (Array.isArray(output)) {
      const firstOutput = output[0];
      // Could be a string or FileOutput object with url() method
      if (typeof firstOutput === 'string') {
        imageUrl = firstOutput;
      } else if (firstOutput && typeof firstOutput === 'object') {
        // FileOutput object - convert to string or access url
        imageUrl = String(firstOutput);
      } else {
        console.error(`   ❌ No output received for ${config.name}`);
        return null;
      }
    } else {
      console.error(`   ❌ Unexpected output format for ${config.name}`);
      return null;
    }
    console.log(`   ✅ Generated: ${imageUrl}`);

    // Create banners directory if it doesn't exist
    const bannersDir = path.join(process.cwd(), 'public', 'banners');
    if (!fs.existsSync(bannersDir)) {
      fs.mkdirSync(bannersDir, { recursive: true });
    }

    // Download the image
    const filepath = path.join(bannersDir, `${config.name}.webp`);
    await downloadImage(imageUrl, filepath);
    console.log(`   💾 Saved to: public/banners/${config.name}.webp`);

    return filepath;
  } catch (error) {
    console.error(`   ❌ Error generating ${config.name}:`, error);
    return null;
  }
}

async function main() {
  console.log('🎬 Director\'s Palette Banner Generator');
  console.log('=====================================\n');

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN environment variable not set');
    console.log('   Set it with: export REPLICATE_API_TOKEN=your_token_here');
    process.exit(1);
  }

  const results: { name: string; success: boolean; path?: string }[] = [];

  for (const banner of BANNERS) {
    const filepath = await generateBanner(banner);
    results.push({
      name: banner.name,
      success: !!filepath,
      path: filepath || undefined,
    });
  }

  console.log('\n\n📊 Generation Summary');
  console.log('=====================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}`);
  successful.forEach(r => console.log(`   - ${r.name}`));

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.name}`));
  }

  console.log('\n🎉 Done! Banners saved to public/banners/');
  console.log('\nUsage in components:');
  console.log('  <img src="/banners/shot-creator.webp" className="..." />');
  console.log('  background-image: url(\'/banners/sidebar.webp\')');
}

main().catch(console.error);
