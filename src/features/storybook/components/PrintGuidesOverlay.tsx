"use client"

import { cn } from "@/utils/utils"

interface PrintGuidesOverlayProps {
  /**
   * Width of the page in pixels
   */
  pageWidth: number
  /**
   * Height of the page in pixels
   */
  pageHeight: number
  /**
   * Bleed margin in inches (default: 0.125")
   */
  bleedInches?: number
  /**
   * Safe zone margin in inches (default: 0.25")
   */
  safeZoneInches?: number
  /**
   * Whether to show the overlay
   */
  visible?: boolean
  /**
   * Optional className for the container
   */
  className?: string
}

/**
 * PrintGuidesOverlay
 *
 * Displays visual guides for print production:
 * - Bleed area (pink/red) - extends beyond trim, will be cut off
 * - Trim line (cyan dashed) - where the page will be cut
 * - Safe zone (green dashed) - text/important content must stay inside
 */
export function PrintGuidesOverlay({
  pageWidth,
  pageHeight,
  bleedInches = 0.125,
  safeZoneInches = 0.25,
  visible = true,
  className,
}: PrintGuidesOverlayProps) {
  if (!visible) return null

  // Calculate pixel values
  // Assume the displayed page already includes bleed, so we calculate inward
  // If we're looking at a page that's 500px wide and should have 0.125" bleed on each side
  // We need to know the DPI or the relationship between pixels and inches

  // For preview purposes, we'll calculate based on the assumption that
  // the page displayed represents the bleed dimensions (trim + bleed)
  // So we need to calculate the trim line position inward from edges

  // Approximate: if we assume the bleed is proportional to page size
  // For an 8.5"x8.5" book with 0.125" bleed: bleed is ~1.5% of width
  // Let's calculate based on the idea that the image includes bleed
  const bleedRatio = bleedInches / (8.5 + bleedInches * 2) // Approximate for square format
  const safeZoneRatio = safeZoneInches / (8.5 + bleedInches * 2)

  const bleedPx = Math.round(pageWidth * bleedRatio)
  const safeZonePx = Math.round(pageWidth * safeZoneRatio)

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-10",
        className
      )}
      style={{ width: pageWidth, height: pageHeight }}
    >
      {/* Bleed area - outer edges that will be cut */}
      {/* Top bleed */}
      <div
        className="absolute left-0 right-0 top-0 bg-red-500/20"
        style={{ height: bleedPx }}
      />
      {/* Bottom bleed */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-red-500/20"
        style={{ height: bleedPx }}
      />
      {/* Left bleed */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-red-500/20"
        style={{ width: bleedPx }}
      />
      {/* Right bleed */}
      <div
        className="absolute right-0 top-0 bottom-0 bg-red-500/20"
        style={{ width: bleedPx }}
      />

      {/* Trim line (cyan dashed) */}
      <div
        className="absolute border-2 border-dashed border-cyan-400/70"
        style={{
          left: bleedPx,
          top: bleedPx,
          right: bleedPx,
          bottom: bleedPx,
        }}
      />

      {/* Safe zone (green dashed) */}
      <div
        className="absolute border-2 border-dashed border-green-400/70"
        style={{
          left: bleedPx + safeZonePx,
          top: bleedPx + safeZonePx,
          right: bleedPx + safeZonePx,
          bottom: bleedPx + safeZonePx,
        }}
      />

      {/* Labels */}
      {/* Bleed label - top right */}
      <div
        className="absolute text-xs font-mono text-red-400 bg-black/70 px-1 rounded"
        style={{
          top: 4,
          right: bleedPx + 4,
        }}
      >
        Bleed
      </div>

      {/* Trim label - inside trim area */}
      <div
        className="absolute text-xs font-mono text-cyan-400 bg-black/70 px-1 rounded"
        style={{
          top: bleedPx + 4,
          right: bleedPx + 4,
        }}
      >
        Trim
      </div>

      {/* Safe zone label - inside safe area */}
      <div
        className="absolute text-xs font-mono text-green-400 bg-black/70 px-1 rounded"
        style={{
          top: bleedPx + safeZonePx + 4,
          right: bleedPx + safeZonePx + 4,
        }}
      >
        Safe Zone
      </div>
    </div>
  )
}

/**
 * PrintGuidesLegend
 *
 * Shows a legend explaining the print guide colors
 */
export function PrintGuidesLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-4 text-xs", className)}>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-red-500/30 border border-red-500/50 rounded" />
        <span className="text-zinc-400">
          Bleed (0.125&quot; - will be cut)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-dashed border-cyan-400/70 rounded" />
        <span className="text-zinc-400">
          Trim (final edge)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-dashed border-green-400/70 rounded" />
        <span className="text-zinc-400">
          Safe Zone (0.25&quot; - text stays here)
        </span>
      </div>
    </div>
  )
}
