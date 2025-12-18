/**
 * Storybook Asset Generation Script
 * Generates wardrobe template and storybook banner
 *
 * Usage: npx tsx scripts/generate-storybook-assets.ts
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

// Assets to generate
const ASSETS = {
  // Wardrobe Template - 2x3 grid showing outfit categories
  wardrobeTemplate: {
    name: 'wardrobe-template',
    prompt: `Create a clean template reference image showing a 2x3 grid (2 rows, 3 columns) layout guide for character wardrobe variations.

TEMPLATE LAYOUT:
Each cell should be a placeholder showing the outfit category name:

ROW 1:
- Cell 1: "Casual Elegant" - relaxed but refined everyday wear
- Cell 2: "Formal Sophisticated" - event-ready upscale attire
- Cell 3: "Adventure Ready" - stylish outdoor/exploration wear

ROW 2:
- Cell 4: "Cozy Comfort" - luxe loungewear or home attire
- Cell 5: "Creative Expression" - artistic, bold fashion statement
- Cell 6: "Classic Timeless" - traditional, never-goes-out-of-style look

BOTTOM TEXT: "Same Character, Different Luxury Outfits. Maintain Face, Hair, Body Proportions."

STYLE: Clean gray placeholder boxes with white text labels, similar to a wireframe mockup. Professional design template aesthetic. Light gray background.

NO actual characters or outfits - just the labeled template grid.`,
    width: 1920,
    height: 1280, // 3:2 aspect ratio for 2x3 grid
    outputPath: 'landingimages/wardrobe-template.png',
  },

  // Storybook Banner - matching other banners
  storybookBanner: {
    name: 'storybook-banner',
    prompt: `Magical children's book creation scene, an ornate leather-bound storybook open with golden light and sparkles emanating from illustrated pages, whimsical characters seem to float off the pages as tiny 3D figures, quill pen and ink bottle nearby, scattered character sketches and style guides on aged paper, enchanted library atmosphere with floating paper and magical dust particles, warm amber and purple lighting with gold accents matching Director's Palette brand colors, cinematic depth of field, ultra wide banner format`,
    width: 1920,
    height: 320,
    outputPath: 'public/banners/storybook-banner.webp',
  },
};

// Models to test
const MODELS = {
  // Nano Banana Pro (Google Imagen 3)
  nanoBananaPro: {
    name: 'google/imagen-3',
    label: 'Nano Banana Pro (Imagen 3)',
  },
  // Flux Dev
  fluxDev: {
    name: 'black-forest-labs/flux-dev',
    label: 'Flux Dev',
  },
  // Flux Schnell (fast)
  fluxSchnell: {
    name: 'black-forest-labs/flux-schnell',
    label: 'Flux Schnell (Fast)',
  },
};

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

async function generateWithModel(
  prompt: string,
  width: number,
  height: number,
  modelId: string,
  modelLabel: string
): Promise<string | null> {
  console.log(`\n  Testing with ${modelLabel}...`);

  try {
    let output: unknown;
    const aspectRatio = width > height ? '16:9' : (width === height ? '1:1' : '3:2');

    if (modelId.includes('imagen-3')) {
      // Google Imagen 3
      output = await replicate.run(
        modelId as `${string}/${string}`,
        {
          input: {
            prompt: prompt,
            aspect_ratio: aspectRatio,
            safety_filter_level: 'block_only_high',
            output_format: 'png',
          }
        }
      );
    } else if (modelId.includes('flux-dev')) {
      // Flux Dev
      output = await replicate.run(
        modelId as `${string}/${string}`,
        {
          input: {
            prompt: prompt,
            aspect_ratio: aspectRatio,
            output_format: 'webp',
            output_quality: 95,
            guidance: 3.5,
            num_inference_steps: 28,
          }
        }
      );
    } else {
      // Flux Schnell or others
      output = await replicate.run(
        modelId as `${string}/${string}`,
        {
          input: {
            prompt: prompt,
            go_fast: true,
            num_outputs: 1,
            aspect_ratio: aspectRatio,
            output_format: 'webp',
            output_quality: 90,
          }
        }
      );
    }

    // Extract URL from output
    let imageUrl: string | null = null;
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      imageUrl = typeof firstOutput === 'string' ? firstOutput : String(firstOutput);
    } else if (typeof output === 'string') {
      imageUrl = output;
    }

    if (imageUrl) {
      console.log(`  ✅ Success: ${imageUrl.substring(0, 80)}...`);
      return imageUrl;
    } else {
      console.log(`  ❌ No output received`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Error:`, error);
    return null;
  }
}

async function generateAsset(assetConfig: typeof ASSETS.wardrobeTemplate) {
  console.log(`\n🎨 Generating: ${assetConfig.name}`);
  console.log(`   Output: ${assetConfig.outputPath}`);
  console.log(`   Size: ${assetConfig.width}x${assetConfig.height}`);
  console.log(`   Prompt: ${assetConfig.prompt.substring(0, 100)}...`);

  // Try each model
  for (const [key, model] of Object.entries(MODELS)) {
    const imageUrl = await generateWithModel(
      assetConfig.prompt,
      assetConfig.width,
      assetConfig.height,
      model.name,
      model.label
    );

    if (imageUrl) {
      // Save the first successful result
      const filepath = path.join(process.cwd(), assetConfig.outputPath);
      await downloadImage(imageUrl, filepath);
      console.log(`\n   💾 Saved to: ${assetConfig.outputPath}`);
      return { success: true, model: model.label, url: imageUrl };
    }
  }

  return { success: false, model: null, url: null };
}

async function main() {
  console.log('🎬 Storybook Asset Generator');
  console.log('============================\n');

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('❌ REPLICATE_API_TOKEN environment variable not set');
    process.exit(1);
  }

  const results: { name: string; success: boolean; model?: string }[] = [];

  // Generate wardrobe template
  const wardrobeResult = await generateAsset(ASSETS.wardrobeTemplate);
  results.push({
    name: 'Wardrobe Template',
    success: wardrobeResult.success,
    model: wardrobeResult.model || undefined
  });

  // Generate storybook banner
  const bannerResult = await generateAsset(ASSETS.storybookBanner);
  results.push({
    name: 'Storybook Banner',
    success: bannerResult.success,
    model: bannerResult.model || undefined
  });

  // Summary
  console.log('\n\n📊 Generation Summary');
  console.log('=====================');

  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.name} - Generated with ${result.model}`);
    } else {
      console.log(`❌ ${result.name} - Failed`);
    }
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
