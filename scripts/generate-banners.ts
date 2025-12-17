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

// Banner configurations - CINEMATIC DETAILED PROMPTS
const BANNERS = [
  {
    name: 'shot-creator',
    prompt: 'Wide panoramic view of a professional film set behind the scenes, RED camera on dolly track in foreground, soft cinematic lighting with lens flares, crew silhouettes in moody purple and amber haze, anamorphic bokeh orbs floating, 35mm film grain texture, Blade Runner 2049 cinematography style, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'storyboard',
    prompt: 'Screenwriters workshop desk covered in hand-drawn storyboard panels with pencil sketches, coffee-stained script pages, vintage Moleskin notebook, film clapperboard, polaroid reference photos pinned to corkboard in background, warm tungsten desk lamp glow, shallow depth of field, Wes Anderson aesthetic, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'music-lab',
    prompt: 'Professional music production studio control room at night, glowing VU meters and analog synthesizers, vintage Neve mixing console with LED lights, sound waves visualized as neon ribbons floating in dark space, DJ turntables spinning vinyl, cyberpunk purple and cyan neon accents, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'gallery',
    prompt: 'Elegant art gallery exhibition space with floating photographs in ornate gold frames, dramatic museum spotlight beams cutting through dusty air, marble floors reflecting images, velvet rope barriers, minimal white walls, sophisticated gallery opening atmosphere, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'canvas-editor',
    prompt: 'Digital artists workspace with Wacom tablet and stylus, paint splatter explosion frozen in time, RGB color wheels floating holographically, layer panels and UI elements ghosted in background, creative chaos of brushes and tools, vaporwave aesthetic with pink and cyan gradients, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'prompt-tools',
    prompt: 'Futuristic AI laboratory with holographic text floating in mid-air, neural network visualization glowing green like Matrix code, typewriter keys morphing into digital particles, vintage telegram machine meets quantum computer aesthetic, dark moody atmosphere with emerald accent lighting, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'sidebar',
    prompt: 'Vertical abstract cinematic composition, old Hollywood film strip unspooling vertically, vintage movie camera silhouette, film noir shadows with dramatic spotlight, deep burgundy red and gold accents, elegant theater curtain texture fading to black, tall vertical format',
    width: 320,
    height: 1080,
    model: 'nano-banana',
  },
  {
    name: 'shot-animator',
    prompt: 'Motion capture studio with figure in mocap suit surrounded by tracking markers, animated keyframes floating as glowing diamonds in timeline, high-speed camera flash frozen mid-explosion, bullet time effect with multiple exposure trails, Matrix-style green tint meets Hollywood action set, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'help',
    prompt: 'Cozy filmmakers library with leather-bound cinematography books, vintage Oscar statuette on shelf, warm reading lamp illuminating film history posters, screenwriting manual open on mahogany desk, old Hollywood photographs framed on wood-paneled walls, nostalgic golden hour lighting, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
  },
  {
    name: 'community',
    prompt: 'Grand premiere red carpet event from above, crowd of filmmakers and artists gathered under marquee lights, vintage cinema facade with neon signs, paparazzi camera flashes creating starburst effects, glamorous Hollywood golden age meets modern indie film festival vibe, ultra wide banner format',
    width: 1920,
    height: 320,
    model: 'nano-banana',
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
  console.log(`   Prompt: ${config.prompt.substring(0, 80)}...`);
  console.log(`   Size: ${config.width}x${config.height}`);
  console.log(`   Model: ${config.model || 'flux-schnell'}`);

  try {
    let output: unknown;

    if (config.model === 'nano-banana') {
      // Use flux-dev for high quality cinematic images (better than schnell)
      output = await replicate.run(
        "black-forest-labs/flux-dev",
        {
          input: {
            prompt: config.prompt,
            aspect_ratio: config.width > config.height ? "16:9" : "9:16",
            output_format: "webp",
            output_quality: 95,
            guidance: 3.5,
            num_inference_steps: 28,
          }
        }
      );
    } else {
      // Use flux-schnell for fast generation
      output = await replicate.run(
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
    }

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
