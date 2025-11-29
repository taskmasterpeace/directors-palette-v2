interface MetadataBarProps {
  aspectRatio: string
  resolution: string
}

/**
 * Displays image metadata (aspect ratio and resolution)
 * Always visible at bottom of image card
 */
export function MetadataBar({ aspectRatio, resolution }: MetadataBarProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 px-2 py-1 bg-gradient-to-t from-slate-900/90 to-slate-800/90 pointer-events-none">
      <p className="text-xs font-semibold text-white text-center">
        {aspectRatio} • {resolution}
      </p>
    </div>
  )
}
