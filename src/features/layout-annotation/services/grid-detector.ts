/**
 * Grid Detector Service
 * Automatically detects 3x3 grid separators in composite images
 * Uses pure pixel analysis - no AI/ML required
 */

export interface GridDetectionResult {
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  gutterX: number;
  gutterY: number;
  separatorPositions: {
    vertical: number[];
    horizontal: number[];
  };
}

/**
 * Detect grid separators in an image
 * Works by finding dark (black) lines at expected 1/3 and 2/3 positions
 */
export async function detectGridSeparators(imageUrl: string): Promise<GridDetectionResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const result = analyzeImage(img);
      resolve(result);
    };

    img.onerror = () => {
      resolve({
        detected: false,
        confidence: 'low',
        gutterX: 0,
        gutterY: 0,
        separatorPositions: { vertical: [], horizontal: [] }
      });
    };

    img.src = imageUrl;
  });
}

function analyzeImage(img: HTMLImageElement): GridDetectionResult {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      detected: false,
      confidence: 'low',
      gutterX: 0,
      gutterY: 0,
      separatorPositions: { vertical: [], horizontal: [] }
    };
  }

  const width = img.width;
  const height = img.height;

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Helper to get pixel brightness at (x, y)
  function getPixelBrightness(x: number, y: number): number {
    const idx = (y * width + x) * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    return (r + g + b) / 3;
  }

  // Calculate average brightness of a vertical strip (column)
  function getColumnBrightness(x: number): number {
    let total = 0;
    for (let y = 0; y < height; y++) {
      total += getPixelBrightness(x, y);
    }
    return total / height;
  }

  // Calculate average brightness of a horizontal strip (row)
  function getRowBrightness(y: number): number {
    let total = 0;
    for (let x = 0; x < width; x++) {
      total += getPixelBrightness(x, y);
    }
    return total / width;
  }

  // Find darkest position in a search range and measure line width
  function findSeparator(
    expectedPos: number,
    searchBand: number,
    getBrightness: (pos: number) => number,
    maxDimension: number
  ): { position: number; width: number } | null {
    const searchStart = Math.max(0, expectedPos - searchBand);
    const searchEnd = Math.min(maxDimension - 1, expectedPos + searchBand);

    // Find darkest position
    let darkestPos = -1;
    let darkestBrightness = 255;

    for (let pos = searchStart; pos <= searchEnd; pos++) {
      const brightness = getBrightness(pos);
      if (brightness < darkestBrightness) {
        darkestBrightness = brightness;
        darkestPos = pos;
      }
    }

    // Must be quite dark to be a separator (< 25 brightness)
    if (darkestBrightness >= 25 || darkestPos < 0) {
      return null;
    }

    // Measure width by expanding outward
    const darkThreshold = Math.min(40, darkestBrightness * 8);
    let lineStart = darkestPos;
    let lineEnd = darkestPos;

    // Expand left (max 15px)
    for (let i = 0; i < 15 && lineStart > 0; i++) {
      if (getBrightness(lineStart - 1) >= darkThreshold) break;
      lineStart--;
    }

    // Expand right (max 15px)
    for (let i = 0; i < 15 && lineEnd < maxDimension - 1; i++) {
      if (getBrightness(lineEnd + 1) >= darkThreshold) break;
      lineEnd++;
    }

    return {
      position: lineStart,
      width: lineEnd - lineStart + 1
    };
  }

  // Search band (5% of dimension)
  const searchBandX = Math.round(width * 0.05);
  const searchBandY = Math.round(height * 0.05);

  // Expected positions for 3x3 grid
  const expectedV1 = Math.round(width / 3);
  const expectedV2 = Math.round((width * 2) / 3);
  const expectedH1 = Math.round(height / 3);
  const expectedH2 = Math.round((height * 2) / 3);

  // Find separators
  const v1 = findSeparator(expectedV1, searchBandX, getColumnBrightness, width);
  const v2 = findSeparator(expectedV2, searchBandX, getColumnBrightness, width);
  const h1 = findSeparator(expectedH1, searchBandY, getRowBrightness, height);
  const h2 = findSeparator(expectedH2, searchBandY, getRowBrightness, height);

  const verticalLines = [v1, v2].filter(Boolean) as { position: number; width: number }[];
  const horizontalLines = [h1, h2].filter(Boolean) as { position: number; width: number }[];

  // Calculate gutter (use minimum width, at least 4px)
  const gutterX = verticalLines.length > 0
    ? Math.max(4, Math.min(...verticalLines.map(l => l.width)))
    : 0;

  const gutterY = horizontalLines.length > 0
    ? Math.max(4, Math.min(...horizontalLines.map(l => l.width)))
    : 0;

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (verticalLines.length === 2 && horizontalLines.length === 2) {
    confidence = 'high';
  } else if (verticalLines.length >= 1 && horizontalLines.length >= 1) {
    confidence = 'medium';
  }

  return {
    detected: confidence !== 'low',
    confidence,
    gutterX,
    gutterY,
    separatorPositions: {
      vertical: verticalLines.map(l => l.position),
      horizontal: horizontalLines.map(l => l.position)
    }
  };
}

/**
 * Extract frames from a 3x3 grid image
 * Returns 9 data URLs for each extracted frame
 */
export async function extractGridFrames(
  imageUrl: string,
  options: {
    rows?: number;
    cols?: number;
    gutterX?: number;
    gutterY?: number;
    trim?: number;
    aspectRatio?: '16:9' | '9:16';
  } = {}
): Promise<{ dataUrl: string; row: number; col: number }[]> {
  const {
    rows = 3,
    cols = 3,
    gutterX = 0,
    gutterY = 0,
    trim = 2,
    aspectRatio = '16:9'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const frames = extractFramesFromImage(img, rows, cols, gutterX, gutterY, trim, aspectRatio);
        resolve(frames);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function extractFramesFromImage(
  img: HTMLImageElement,
  rows: number,
  cols: number,
  gutterX: number,
  gutterY: number,
  trim: number,
  aspectRatio: '16:9' | '9:16'
): { dataUrl: string; row: number; col: number }[] {
  const width = img.width;
  const height = img.height;

  // Calculate cell dimensions
  const totalGutterX = gutterX * (cols - 1);
  const totalGutterY = gutterY * (rows - 1);
  const cellWidth = (width - totalGutterX) / cols;
  const cellHeight = (height - totalGutterY) / rows;

  // Target dimensions based on aspect ratio
  const targetWidth = aspectRatio === '16:9' ? 1920 : 1080;
  const targetHeight = aspectRatio === '16:9' ? 1080 : 1920;
  const targetAspect = targetWidth / targetHeight;

  const frames: { dataUrl: string; row: number; col: number }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate cell position
      const cellX = col * (cellWidth + gutterX);
      const cellY = row * (cellHeight + gutterY);

      // Calculate crop region with aspect ratio
      const cellAspect = cellWidth / cellHeight;
      let cropWidth: number;
      let cropHeight: number;

      if (cellAspect > targetAspect) {
        cropHeight = cellHeight;
        cropWidth = cropHeight * targetAspect;
      } else {
        cropWidth = cellWidth;
        cropHeight = cropWidth / targetAspect;
      }

      // Center the crop and apply trim
      const cropX = cellX + (cellWidth - cropWidth) / 2 + trim;
      const cropY = cellY + (cellHeight - cropHeight) / 2 + trim;
      const finalCropWidth = cropWidth - (trim * 2);
      const finalCropHeight = cropHeight - (trim * 2);

      // Create canvas and extract
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(
          img,
          cropX, cropY, finalCropWidth, finalCropHeight,
          0, 0, targetWidth, targetHeight
        );

        frames.push({
          dataUrl: canvas.toDataURL('image/png', 1.0),
          row,
          col
        });
      }
    }
  }

  return frames;
}

/**
 * Auto-extract frames with automatic grid detection
 * Best for storyboard composites with black separator lines
 */
export async function autoExtractFrames(
  imageUrl: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<{
  success: boolean;
  confidence: 'high' | 'medium' | 'low';
  frames: { dataUrl: string; row: number; col: number }[];
  detectedGutter: number;
}> {
  // First, detect the grid
  const detection = await detectGridSeparators(imageUrl);

  if (!detection.detected) {
    return {
      success: false,
      confidence: 'low',
      frames: [],
      detectedGutter: 0
    };
  }

  // Use detected gutter (max of X and Y)
  const gutter = Math.max(detection.gutterX, detection.gutterY);

  // Extract frames
  const frames = await extractGridFrames(imageUrl, {
    rows: 3,
    cols: 3,
    gutterX: gutter,
    gutterY: gutter,
    trim: 2, // Small trim to clean up edges
    aspectRatio
  });

  return {
    success: true,
    confidence: detection.confidence,
    frames,
    detectedGutter: gutter
  };
}
