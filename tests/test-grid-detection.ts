/**
 * Test script for auto-detecting 3x3 grid separator lines
 * Run with: npx tsx tests/test-grid-detection.ts
 *
 * APPROACH: Instead of scanning the whole image for dark lines,
 * focus on the expected separator positions (1/3 and 2/3) and
 * find the darkest continuous strip in a narrow search band.
 */

import sharp from 'sharp';
import path from 'path';

interface SeparatorLine {
  position: number;  // pixel position (start of line)
  width: number;     // thickness in pixels
  avgBrightness: number; // average brightness of the line (lower = darker)
}

interface GridDetectionResult {
  verticalLines: SeparatorLine[];
  horizontalLines: SeparatorLine[];
  suggestedGutterX: number;
  suggestedGutterY: number;
  confidence: 'high' | 'medium' | 'low';
}

async function detectGridSeparators(imagePath: string): Promise<GridDetectionResult> {
  console.log(`\nAnalyzing: ${path.basename(imagePath)}`);
  console.log('='.repeat(50));

  // Load image and get raw pixel data
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error('Could not get image dimensions');
  }

  console.log(`Image size: ${width} x ${height}`);

  // Get raw pixel data (RGBA)
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;

  // Helper to get pixel brightness at (x, y)
  function getPixelBrightness(x: number, y: number): number {
    const idx = (y * width! + x) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    return (r + g + b) / 3;
  }

  // Calculate average brightness of a vertical strip
  function getVerticalStripBrightness(x: number, stripWidth: number): number {
    let total = 0;
    let count = 0;
    for (let dx = 0; dx < stripWidth && x + dx < width!; dx++) {
      for (let y = 0; y < height!; y++) {
        total += getPixelBrightness(x + dx, y);
        count++;
      }
    }
    return count > 0 ? total / count : 255;
  }

  // Calculate average brightness of a horizontal strip
  function getHorizontalStripBrightness(y: number, stripHeight: number): number {
    let total = 0;
    let count = 0;
    for (let dy = 0; dy < stripHeight && y + dy < height!; dy++) {
      for (let x = 0; x < width!; x++) {
        total += getPixelBrightness(x, y + dy);
        count++;
      }
    }
    return count > 0 ? total / count : 255;
  }

  // Find a dark separator line near the expected position
  // Returns the darkest single column/row position and estimates width by
  // checking for a contiguous dark region
  function findDarkestStrip(
    searchStart: number,
    searchEnd: number,
    getBrightness: (pos: number, width: number) => number,
    maxDimension: number
  ): SeparatorLine | null {
    // Find the single darkest column/row in the search range
    let darkestPos = -1;
    let darkestBrightness = 255;

    for (let pos = Math.max(0, searchStart); pos <= Math.min(searchEnd, maxDimension - 1); pos++) {
      const brightness = getBrightness(pos, 1);
      if (brightness < darkestBrightness) {
        darkestBrightness = brightness;
        darkestPos = pos;
      }
    }

    console.log(`    Darkest at ${darkestPos}, brightness=${darkestBrightness.toFixed(1)}`);

    // If no sufficiently dark point found, return null
    // Threshold: must be below 25 to be considered a black separator line
    if (darkestBrightness >= 25 || darkestPos < 0) {
      console.log(`    -> Too bright (threshold=25), not a separator`);
      return null;
    }

    // Estimate width by counting consecutive dark columns/rows
    // Use a threshold relative to the darkest point
    const darkThreshold = Math.min(40, darkestBrightness * 8);

    let lineStart = darkestPos;
    let lineEnd = darkestPos;

    // Expand left (max 15px)
    for (let i = 0; i < 15 && lineStart > 0; i++) {
      const b = getBrightness(lineStart - 1, 1);
      if (b >= darkThreshold) break;
      lineStart--;
    }

    // Expand right (max 15px)
    for (let i = 0; i < 15 && lineEnd < maxDimension - 1; i++) {
      const b = getBrightness(lineEnd + 1, 1);
      if (b >= darkThreshold) break;
      lineEnd++;
    }

    const lineWidth = lineEnd - lineStart + 1;
    const avgBrightness = getBrightness(lineStart, lineWidth);

    console.log(`    -> Found line: start=${lineStart}, width=${lineWidth}px, avgBrightness=${avgBrightness.toFixed(1)}`);

    return { position: lineStart, width: lineWidth, avgBrightness };
  }

  // Search band width (5% of image dimension)
  const searchBandX = Math.round(width * 0.05);
  const searchBandY = Math.round(height * 0.05);

  // Expected positions for 3x3 grid separators
  const expectedV1 = Math.round(width / 3);
  const expectedV2 = Math.round((width * 2) / 3);
  const expectedH1 = Math.round(height / 3);
  const expectedH2 = Math.round((height * 2) / 3);

  console.log(`\nExpected separator positions:`);
  console.log(`  Vertical: ~${expectedV1}px and ~${expectedV2}px`);
  console.log(`  Horizontal: ~${expectedH1}px and ~${expectedH2}px`);
  console.log(`  Search band: ±${searchBandX}px (vertical), ±${searchBandY}px (horizontal)`);

  // Find vertical separators
  console.log('\nSearching for vertical separators...');
  const verticalLines: SeparatorLine[] = [];

  const v1 = findDarkestStrip(
    expectedV1 - searchBandX,
    expectedV1 + searchBandX,
    getVerticalStripBrightness,
    width
  );
  if (v1) {
    console.log(`  V1: Found at x=${v1.position}, width=${v1.width}px, brightness=${v1.avgBrightness.toFixed(1)}`);
    verticalLines.push(v1);
  } else {
    console.log(`  V1: Not found (no dark strip near x=${expectedV1})`);
  }

  const v2 = findDarkestStrip(
    expectedV2 - searchBandX,
    expectedV2 + searchBandX,
    getVerticalStripBrightness,
    width
  );
  if (v2) {
    console.log(`  V2: Found at x=${v2.position}, width=${v2.width}px, brightness=${v2.avgBrightness.toFixed(1)}`);
    verticalLines.push(v2);
  } else {
    console.log(`  V2: Not found (no dark strip near x=${expectedV2})`);
  }

  // Find horizontal separators
  console.log('\nSearching for horizontal separators...');
  const horizontalLines: SeparatorLine[] = [];

  const h1 = findDarkestStrip(
    expectedH1 - searchBandY,
    expectedH1 + searchBandY,
    getHorizontalStripBrightness,
    height
  );
  if (h1) {
    console.log(`  H1: Found at y=${h1.position}, width=${h1.width}px, brightness=${h1.avgBrightness.toFixed(1)}`);
    horizontalLines.push(h1);
  } else {
    console.log(`  H1: Not found (no dark strip near y=${expectedH1})`);
  }

  const h2 = findDarkestStrip(
    expectedH2 - searchBandY,
    expectedH2 + searchBandY,
    getHorizontalStripBrightness,
    height
  );
  if (h2) {
    console.log(`  H2: Found at y=${h2.position}, width=${h2.width}px, brightness=${h2.avgBrightness.toFixed(1)}`);
    horizontalLines.push(h2);
  } else {
    console.log(`  H2: Not found (no dark strip near y=${expectedH2})`);
  }

  // Calculate suggested gutter values
  // Use minimum width (more conservative/accurate) but at least 4px
  const suggestedGutterX = verticalLines.length > 0
    ? Math.max(4, Math.min(...verticalLines.map(l => l.width)))
    : 0;

  const suggestedGutterY = horizontalLines.length > 0
    ? Math.max(4, Math.min(...horizontalLines.map(l => l.width)))
    : 0;

  // Use a unified gutter (max of X and Y) since most grids have consistent spacing
  const suggestedGutter = Math.max(suggestedGutterX, suggestedGutterY);

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (verticalLines.length === 2 && horizontalLines.length === 2) {
    // High confidence if we found all 4 separators
    confidence = 'high';
  } else if (verticalLines.length >= 1 && horizontalLines.length >= 1) {
    confidence = 'medium';
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log('RESULTS:');
  console.log(`  Vertical separators: ${verticalLines.length}/2 found`);
  console.log(`  Horizontal separators: ${horizontalLines.length}/2 found`);
  console.log(`  Suggested gutter: ${suggestedGutter}px (X=${suggestedGutterX}px, Y=${suggestedGutterY}px)`);
  console.log(`  Confidence: ${confidence}`);

  if (confidence === 'high') {
    console.log('\n  ✓ Ready for auto-extraction!');
  } else if (confidence === 'medium') {
    console.log('\n  ⚠ May need manual adjustment');
  } else {
    console.log('\n  ✗ Manual grid setup recommended');
  }

  return {
    verticalLines,
    horizontalLines,
    suggestedGutterX,
    suggestedGutterY,
    confidence
  };
}

// Run tests on both images
async function main() {
  const testImages = [
    'C:/git/directors-palette-v2/tests/image_1764520172010.png',
    'C:/git/directors-palette-v2/tests/rktnv7sgqsrma0ctst8s9r8xpr.webp'
  ];

  for (const imagePath of testImages) {
    try {
      await detectGridSeparators(imagePath);
    } catch (error) {
      console.error(`Error processing ${imagePath}:`, error);
    }
  }
}

main();
