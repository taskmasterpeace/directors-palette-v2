const fs = require('fs');
const path = require('path');

// Icon sizes needed for iOS
const ICON_SIZES = [
  { size: 1024, name: 'icon-1024.png', idiom: 'ios-marketing', scale: '1x' },
  { size: 180, name: 'icon-180.png', idiom: 'iphone', scale: '3x' },
  { size: 167, name: 'icon-167.png', idiom: 'ipad', scale: '2x' },
  { size: 152, name: 'icon-152.png', idiom: 'ipad', scale: '2x' },
  { size: 120, name: 'icon-120.png', idiom: 'iphone', scale: '2x' },
  { size: 87, name: 'icon-87.png', idiom: 'iphone', scale: '3x' },
  { size: 80, name: 'icon-80.png', idiom: 'ipad', scale: '2x' },
  { size: 76, name: 'icon-76.png', idiom: 'ipad', scale: '1x' },
  { size: 60, name: 'icon-60.png', idiom: 'iphone', scale: '2x' },
  { size: 58, name: 'icon-58.png', idiom: 'iphone', scale: '2x' },
  { size: 40, name: 'icon-40.png', idiom: 'ipad', scale: '1x' },
  { size: 29, name: 'icon-29.png', idiom: 'iphone', scale: '1x' },
  { size: 20, name: 'icon-20.png', idiom: 'ipad', scale: '1x' },
];

// Generate SVG icon
function generateIconSVG(size) {
  const padding = size * 0.15;
  const innerSize = size - (padding * 2);
  const strokeWidth = size * 0.04;
  const filmStripHeight = innerSize * 0.8;
  const filmStripY = padding + (innerSize - filmStripHeight) / 2;
  const holeSize = size * 0.05;
  const holeSpacing = filmStripHeight / 5;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Gradient -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#dc2626;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#991b1b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="filmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#fee2e2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fecaca;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Rounded background -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bgGradient)"/>

  <!-- Film strip frame -->
  <rect x="${padding}" y="${filmStripY}" width="${innerSize}" height="${filmStripHeight}"
        rx="${size * 0.03}" fill="url(#filmGradient)" stroke="#dc2626" stroke-width="${strokeWidth}"/>

  <!-- Film strip holes (top) -->
  <circle cx="${padding + holeSize * 1.5}" cy="${filmStripY + holeSpacing * 0.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${padding + holeSize * 1.5}" cy="${filmStripY + holeSpacing * 1.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${padding + holeSize * 1.5}" cy="${filmStripY + holeSpacing * 2.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${padding + holeSize * 1.5}" cy="${filmStripY + holeSpacing * 3.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${padding + holeSize * 1.5}" cy="${filmStripY + holeSpacing * 4.5}" r="${holeSize * 0.6}" fill="#991b1b"/>

  <!-- Film strip holes (bottom) -->
  <circle cx="${size - padding - holeSize * 1.5}" cy="${filmStripY + holeSpacing * 0.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${size - padding - holeSize * 1.5}" cy="${filmStripY + holeSpacing * 1.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${size - padding - holeSize * 1.5}" cy="${filmStripY + holeSpacing * 2.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${size - padding - holeSize * 1.5}" cy="${filmStripY + holeSpacing * 3.5}" r="${holeSize * 0.6}" fill="#991b1b"/>
  <circle cx="${size - padding - holeSize * 1.5}" cy="${filmStripY + holeSpacing * 4.5}" r="${holeSize * 0.6}" fill="#991b1b"/>

  <!-- Director's clapperboard icon -->
  <g transform="translate(${size/2 - innerSize*0.25}, ${filmStripY + filmStripHeight*0.25})">
    <rect x="0" y="${innerSize*0.12}" width="${innerSize*0.5}" height="${innerSize*0.38}"
          rx="${size*0.02}" fill="#1e1b4b" stroke="#dc2626" stroke-width="${strokeWidth*0.8}"/>
    <polygon points="0,${innerSize*0.12} ${innerSize*0.5},${innerSize*0.12} ${innerSize*0.45},0 ${innerSize*0.05},0"
             fill="#ef4444" stroke="#dc2626" stroke-width="${strokeWidth*0.8}"/>
    <line x1="${innerSize*0.1}" y1="0" x2="${innerSize*0.1}" y2="${innerSize*0.12}"
          stroke="#1e1b4b" stroke-width="${strokeWidth*1.2}"/>
    <line x1="${innerSize*0.2}" y1="0" x2="${innerSize*0.2}" y2="${innerSize*0.12}"
          stroke="#1e1b4b" stroke-width="${strokeWidth*1.2}"/>
    <line x1="${innerSize*0.3}" y1="0" x2="${innerSize*0.3}" y2="${innerSize*0.12}"
          stroke="#1e1b4b" stroke-width="${strokeWidth*1.2}"/>
    <line x1="${innerSize*0.4}" y1="0" x2="${innerSize*0.4}" y2="${innerSize*0.12}"
          stroke="#1e1b4b" stroke-width="${strokeWidth*1.2}"/>
  </g>
</svg>`;
}

// Convert SVG to PNG using sharp
async function convertSVGtoPNG(svgContent, size, outputPath) {
  try {
    const sharp = require('sharp');
    const buffer = Buffer.from(svgContent);

    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created: ${path.basename(outputPath)} (${size}x${size})`);
    return outputPath;
  } catch (error) {
    console.error(`Error converting ${path.basename(outputPath)}:`, error.message);
    // Fallback: save SVG
    const svgPath = outputPath.replace('.png', '.svg');
    fs.writeFileSync(svgPath, svgContent);
    console.log(`  → Saved SVG instead: ${path.basename(svgPath)}`);
    return svgPath;
  }
}

// Generate Contents.json for iOS
function generateContentsJSON() {
  return {
    "images": [
      {
        "size": "20x20",
        "idiom": "iphone",
        "filename": "icon-40.png",
        "scale": "2x"
      },
      {
        "size": "20x20",
        "idiom": "iphone",
        "filename": "icon-60.png",
        "scale": "3x"
      },
      {
        "size": "29x29",
        "idiom": "iphone",
        "filename": "icon-58.png",
        "scale": "2x"
      },
      {
        "size": "29x29",
        "idiom": "iphone",
        "filename": "icon-87.png",
        "scale": "3x"
      },
      {
        "size": "40x40",
        "idiom": "iphone",
        "filename": "icon-80.png",
        "scale": "2x"
      },
      {
        "size": "40x40",
        "idiom": "iphone",
        "filename": "icon-120.png",
        "scale": "3x"
      },
      {
        "size": "60x60",
        "idiom": "iphone",
        "filename": "icon-120.png",
        "scale": "2x"
      },
      {
        "size": "60x60",
        "idiom": "iphone",
        "filename": "icon-180.png",
        "scale": "3x"
      },
      {
        "size": "20x20",
        "idiom": "ipad",
        "filename": "icon-20.png",
        "scale": "1x"
      },
      {
        "size": "20x20",
        "idiom": "ipad",
        "filename": "icon-40.png",
        "scale": "2x"
      },
      {
        "size": "29x29",
        "idiom": "ipad",
        "filename": "icon-29.png",
        "scale": "1x"
      },
      {
        "size": "29x29",
        "idiom": "ipad",
        "filename": "icon-58.png",
        "scale": "2x"
      },
      {
        "size": "40x40",
        "idiom": "ipad",
        "filename": "icon-40.png",
        "scale": "1x"
      },
      {
        "size": "40x40",
        "idiom": "ipad",
        "filename": "icon-80.png",
        "scale": "2x"
      },
      {
        "size": "76x76",
        "idiom": "ipad",
        "filename": "icon-76.png",
        "scale": "1x"
      },
      {
        "size": "76x76",
        "idiom": "ipad",
        "filename": "icon-152.png",
        "scale": "2x"
      },
      {
        "size": "83.5x83.5",
        "idiom": "ipad",
        "filename": "icon-167.png",
        "scale": "2x"
      },
      {
        "size": "1024x1024",
        "idiom": "ios-marketing",
        "filename": "icon-1024.png",
        "scale": "1x"
      }
    ],
    "info": {
      "version": 1,
      "author": "xcode"
    }
  };
}

// Main execution
async function main() {
  const outputDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating iOS app icons...\n');

  // Generate all icon sizes
  for (const iconSpec of ICON_SIZES) {
    const svgContent = generateIconSVG(iconSpec.size);
    const outputPath = path.join(outputDir, iconSpec.name);
    await convertSVGtoPNG(svgContent, iconSpec.size, outputPath);
  }

  // Generate Contents.json
  const contentsPath = path.join(outputDir, 'Contents.json');
  fs.writeFileSync(contentsPath, JSON.stringify(generateContentsJSON(), null, 2));
  console.log(`\nCreated: Contents.json`);

  console.log('\n✓ Icon generation complete!');
  console.log(`\nGenerated ${ICON_SIZES.length} icon sizes in:`);
  console.log(outputDir);
}

main().catch(console.error);
