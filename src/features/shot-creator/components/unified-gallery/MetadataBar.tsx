import type { GridSize } from "../../store/unified-gallery-store"

interface MetadataBarProps {
  aspectRatio: string
  resolution: string
  gridSize?: GridSize
}

/**
 * Displays image metadata (aspect ratio and resolution)
 * Only visible on hover to reduce visual noise
 * Hidden completely on small grid size
 */
export function MetadataBar({ aspectRatio, resolution, gridSize = 'medium' }: MetadataBarProps) {
  // Hide on small grid size - the overlay covers too much of the image
  if (gridSize === 'small') {
    return null
  }

  return (
    <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <p className="text-xs font-semibold text-white text-center">
        {aspectRatio} • {resolution}
      </p>
    </div>
  )
}
