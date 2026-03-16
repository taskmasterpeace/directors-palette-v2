import type { GridSize } from "../../store/unified-gallery-store"

interface MetadataBarProps {
  aspectRatio: string
  resolution: string
  loraName?: string
  loraScale?: number
  img2imgStrength?: number
  gridType?: 'angles' | 'broll'
  gridSize?: GridSize
}

/**
 * Displays image metadata (aspect ratio, resolution, LoRA, strength, grid type)
 * Only visible on hover to reduce visual noise
 * Hidden completely on small grid size
 */
export function MetadataBar({ aspectRatio, resolution, loraName, loraScale, img2imgStrength, gridType, gridSize = 'medium' }: MetadataBarProps) {
  // Hide on small grid size - the overlay covers too much of the image
  if (gridSize === 'small') {
    return null
  }

  return (
    <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <p className="text-xs font-semibold text-white text-center">
        {aspectRatio} • {resolution}
        {loraName && (
          <span className="text-cyan-300"> • {loraName}{loraScale ? ` ${loraScale}x` : ''}</span>
        )}
        {img2imgStrength != null && (
          <span className="text-purple-300"> • {Math.round(img2imgStrength * 100)}%</span>
        )}
        {gridType && (
          <span className={gridType === 'angles' ? 'text-amber-300' : 'text-emerald-300'}>
            {' '}• {gridType === 'angles' ? 'Angles' : 'B-Roll'}
          </span>
        )}
      </p>
    </div>
  )
}
