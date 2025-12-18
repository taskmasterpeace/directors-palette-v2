/**
 * Generate Storybook Wizard Step Background Images
 * Usage: npx tsx scripts/generate-wizard-step-images.ts
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') });

import Replicate from 'replicate';
import fs from 'fs';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Wizard step images to generate
const STEP_IMAGES = [
  {
    name: 'step-story',
    prompt: `Magical open storybook on a wooden desk, glowing golden text floating off the pages, elegant quill pen with inkwell nearby, warm amber lighting, scattered paper with handwritten notes, soft bokeh background with floating sparkles, cinematic depth of field, cozy writer's study atmosphere, purple and gold color accents matching Director's Palette brand`,
    outputPath: 'public/storybook/step-story.webp',
  },
  {
    name: 'step-style',
    prompt: `Artist's palette floating in magical space with different art style swatches, watercolor splashes, oil paint textures, anime sparkles, cartoon colors, 3D rendered spheres, each swatch showing a distinct visual style, purple and amber gradient background, creative artistic atmosphere, professional design tool aesthetic, soft glowing edges on each style sample`,
    outputPath: 'public/storybook/step-style.webp',
  },
  {
    name: 'step-characters',
    prompt: `Multiple character reference sheets floating in magical purple space, professional animation-style character sheets with turnarounds and expressions, visible @character name tags on sheets, soft golden glow connecting the sheets, sparkles and magical dust particles, cartoon and illustrated characters visible on the sheets, production studio atmosphere`,
    outputPath: 'public/storybook/step-characters.webp',
  },
  {
    name: 'step-pages',
    prompt: `3x3 grid of illustrated storybook pages floating in magical space, each tile showing a different scene from a children's story, consistent art style across all 9 tiles, soft purple ambient lighting, golden selection glow on one tile, whimsical illustrated characters in various poses, warm inviting atmosphere, professional children's book illustration quality`,
    outputPath: 'public/storybook/step-pages.webp',
  },
  {
    name: 'step-preview',
    prompt: `Beautiful 3D rendered storybook with pages turning in mid-flip, magical sparkles and light rays emanating from the book, illustrated pages visible with colorful children's story scenes, realistic page physics with soft shadows, purple and gold lighting, enchanted library background with soft bokeh, cinematic presentation quality`,
    outputPath: 'public/storybook/step-preview.webp',
  },
];

// Download image from URL
async function downloadImage(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, buffer);
}

async function generateImage(name: string, prompt: string, outputPath: string): Promise<boolean> {
  console.log(`\n🎨 Generating: ${name}`);
  console.log(`   Prompt: ${prompt.substring(0, 80)}...`);

  try {
    // Use Flux Dev (worked well for storybook banner)
    const output = await replicate.run(
      'black-forest-labs/flux-dev' as `${string}/${string}`,
      {
        input: {
          prompt: prompt,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 95,
          guidance: 3.5,
          num_inference_steps: 28,
        }
      }
    );

    // Extract URL from output
    let imageUrl: string | null = null;
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      imageUrl = typeof firstOutput === 'string' ? firstOutput : String(firstOutput);
    } else if (typeof output === 'string') {
      imageUrl = output;
    }

    if (imageUrl) {
      const filepath = path.join(process.cwd(), outputPath);
      await downloadImage(imageUrl, filepath);
      console.log(`   ✅ Saved: ${outputPath}`);
      return true;
    } else {
      console.log(`   ❌ No output received`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error);
    return false;
  }
}

async function main() {
  console.log('🧙 Storybook Wizard Step Image Generator');
  console.log('=========================================\n');

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN environment variable not set');
    process.exit(1);
  }

  const results: { name: string; success: boolean }[] = [];

  for (const step of STEP_IMAGES) {
    const success = await generateImage(step.name, step.prompt, step.outputPath);
    results.push({ name: step.name, success });
  }

  // Summary
  console.log('\n\n📊 Generation Summary');
  console.log('=====================');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  for (const result of results) {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
  }

  console.log(`\nTotal: ${successful} success, ${failed} failed`);
  console.log('\n🎉 Done!');
}

main().catch(console.error);
