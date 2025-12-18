/**
 * Convert SVG to PNG using sharp
 * Usage: npx tsx scripts/convert-svg-to-png.ts
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convertSvgToPng(svgPath: string, pngPath: string) {
  console.log(`Converting ${svgPath} to ${pngPath}...`);

  const svgBuffer = fs.readFileSync(svgPath);

  await sharp(svgBuffer)
    .png()
    .toFile(pngPath);

  console.log(`✅ Created: ${pngPath}`);
}

async function main() {
  const svgPath = path.join(process.cwd(), 'landingimages', 'wardrobe-template.svg');
  const pngPath = path.join(process.cwd(), 'landingimages', 'wardrobe-template.png');

  await convertSvgToPng(svgPath, pngPath);

  console.log('\nDone!');
}

main().catch(console.error);
