/**
 * Frame Extractor Types
 * Types for the 3x3 grid frame extraction feature
 */

export interface GridConfig {
  rows: number
  cols: number
  offsetX: number
  offsetY: number
  gutterX: number
  gutterY: number
}

export interface GridCell {
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

export interface CropRegion {
  cell: GridCell
  // Adjusted crop within the cell (for fine-tuning)
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

export interface FrameExtractionResult {
  index: number
  row: number
  col: number
  dataUrl: string
  width: number
  height: number
}

export interface FrameExtractorState {
  isActive: boolean
  sourceImageUrl: string | null
  sourceImageWidth: number
  sourceImageHeight: number
  gridConfig: GridConfig
  cells: GridCell[]
  cropRegions: CropRegion[]
  selectedCellIndex: number | null
  aspectRatio: '16:9' | '9:16'
  targetWidth: number
  targetHeight: number
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  rows: 3,
  cols: 3,
  offsetX: 0,
  offsetY: 0,
  gutterX: 0,
  gutterY: 0
}

export const ASPECT_RATIO_PRESETS = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 }
} as const

/**
 * Calculate grid cells based on image dimensions and grid config
 */
export function calculateGridCells(
  imageWidth: number,
  imageHeight: number,
  config: GridConfig
): GridCell[] {
  const { rows, cols, offsetX, offsetY, gutterX, gutterY } = config

  // Calculate available space after offsets
  const availableWidth = imageWidth - (offsetX * 2)
  const availableHeight = imageHeight - (offsetY * 2)

  // Calculate cell dimensions
  const totalGutterX = gutterX * (cols - 1)
  const totalGutterY = gutterY * (rows - 1)
  const cellWidth = (availableWidth - totalGutterX) / cols
  const cellHeight = (availableHeight - totalGutterY) / rows

  const cells: GridCell[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        row,
        col,
        x: offsetX + col * (cellWidth + gutterX),
        y: offsetY + row * (cellHeight + gutterY),
        width: cellWidth,
        height: cellHeight
      })
    }
  }

  return cells
}

/**
 * Initialize crop regions centered in each cell with target aspect ratio
 */
export function initializeCropRegions(
  cells: GridCell[],
  targetAspectRatio: number
): CropRegion[] {
  return cells.map(cell => {
    const cellAspectRatio = cell.width / cell.height

    let cropWidth: number
    let cropHeight: number

    if (cellAspectRatio > targetAspectRatio) {
      // Cell is wider than target - fit to height
      cropHeight = cell.height
      cropWidth = cropHeight * targetAspectRatio
    } else {
      // Cell is taller than target - fit to width
      cropWidth = cell.width
      cropHeight = cropWidth / targetAspectRatio
    }

    // Center the crop within the cell
    const cropX = (cell.width - cropWidth) / 2
    const cropY = (cell.height - cropHeight) / 2

    return {
      cell,
      cropX,
      cropY,
      cropWidth,
      cropHeight
    }
  })
}
