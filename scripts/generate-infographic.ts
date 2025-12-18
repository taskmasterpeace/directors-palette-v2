/**
 * Generate Video System Infographic
 * Run: npx ts-node scripts/generate-infographic.ts
 * Or: npx tsx scripts/generate-infographic.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const INFOGRAPHIC_PROMPT = `Professional dark-themed infographic poster titled "Directors Palette - Video Generation System". Clean modern data visualization style.

HEADER: Large title "Video Generation Credit System" with film reel and coin icons

SECTION 1 - VIDEO MODELS (5 colored horizontal tier cards stacked vertically):

GREEN CARD - "WAN 2.2-5B Fast" - Budget Tier
• 1 point per video (flat rate)
• Fixed 4 seconds duration
• 480p or 720p resolution
• Lightning bolt icon

BLUE CARD - "WAN 2.2 I2V Fast" - Budget+ Tier
• 2-3 points per video (flat rate)
• Fixed 5 seconds duration
• Has LAST FRAME control feature
• Frame with arrow icon

YELLOW CARD - "Seedance Pro Fast" - Standard Tier
• 2-9 points PER SECOND by resolution
• Up to 12 seconds duration
• Supports 480p, 720p, 1080p
• Rocket icon

ORANGE CARD - "Seedance Lite" - Featured Tier
• 3-11 points PER SECOND by resolution
• Up to 12 seconds duration
• LAST FRAME + REFERENCE IMAGES (1-4)
• Star with sparkles icon

RED CARD - "Kling 2.5 Turbo Pro" - Premium Tier
• 10 points PER SECOND
• Up to 10 seconds duration
• 720p only, BEST motion quality
• Crown icon

SECTION 2 - GENERATION FLOW (horizontal arrow diagram):
User Request → Credit Check → AI Generate → Webhook → Deduct Credits → Complete
Each step has a matching icon

SECTION 3 - STORAGE LIMITS (two info cards side by side):
LEFT: Images - 500 max, warning amber at 400, blocked red at 500
RIGHT: Videos - Auto-expire after 7 days, daily cleanup cron

SECTION 4 - PRICING FORMULA (calculation box):
Per-Video: Flat Rate = Total Cost
Per-Second: Rate × Duration = Total Cost
Example: Seedance Lite 720p (5 pts) × 8 sec = 40 points

FOOTER: "Powered by Replicate AI • Credits deducted only on success"

STYLE: Dark navy background (#0f0f23), neon accent colors for tiers, clean sans-serif typography, subtle circuit pattern background, professional SaaS infographic, icons are simple line art, rounded corners, subtle shadows`;

async function generateInfographic() {
  console.log('🎬 Generating Video System Infographic...\n');
  console.log('Prompt:', INFOGRAPHIC_PROMPT.slice(0, 200) + '...\n');

  try {
    const output = await replicate.run(
      'google/nano-banana-pro',
      {
        input: {
          prompt: INFOGRAPHIC_PROMPT,
          aspect_ratio: '9:16',  // Vertical poster format
          output_format: 'png',
        }
      }
    );

    console.log('✅ Generation complete!');
    console.log('Output:', output);

    return output;
  } catch (error) {
    console.error('❌ Generation failed:', error);
    throw error;
  }
}

// Helper to save stream to file
async function saveStreamToFile(stream: ReadableStream, filename: string): Promise<string> {
  const fs = await import('fs');
  const { Readable } = await import('stream');
  const { finished } = await import('stream/promises');

  const outputPath = path.resolve(process.cwd(), 'docs', filename);
  const nodeStream = Readable.fromWeb(stream as import('stream/web').ReadableStream);
  const fileStream = fs.createWriteStream(outputPath);

  await finished(nodeStream.pipe(fileStream));
  return outputPath;
}

// Run if called directly
generateInfographic()
  .then(async (result) => {
    if (result instanceof ReadableStream) {
      const savedPath = await saveStreamToFile(result, 'video-system-infographic.png');
      console.log('\n📸 Image saved to:', savedPath);
    } else if (typeof result === 'string') {
      console.log('\n📸 Image URL:', result);
    } else if (Array.isArray(result)) {
      console.log('\n📸 Image URL:', result[0]);
    } else {
      console.log('\n📸 Result:', result);
    }
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
